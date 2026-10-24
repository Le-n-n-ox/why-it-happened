"""Momentum swings: the biggest jumps in the win-probability line, and the claims that explain them.

The win-probability line already exists (app/tactics.py: win_probability). A swing is a jump in it:
one team's chance of winning rises sharply inside a short spell. The rules find the jumps; the model
may then propose WHY it happened, as a claim in the same grammar as the goal hypotheses, and the very
same exact tests decide whether the events support it. A refuted idea stays visible, because a claim
the data does not support is worth showing as refuted.
"""
import os
from concurrent.futures import ThreadPoolExecutor

from app.events import EventType, MatchEvent
from app.hypotheses import (ALPHA, check_claim, offer_candidates, pick_evidence, propose, sentence, sweep)
from app.narrator import _record_model_result, model_available
from app.tactics import win_probability

SWING_MIN_POINTS = 8        # a rise of this many points in the win probability is a swing
SWING_STEP = 1.0            # the probability line is read once a minute
TOP_SWINGS = 3              # how many swings one report covers


def probability_line(events: list[MatchEvent], step: float = SWING_STEP) -> list[dict]:
    """The win probability for both teams, once a minute through the match."""
    last = max((e.minute for e in events), default=0.0)
    line: list[dict] = []
    minute = 0.0
    while minute <= last + 1e-9:
        p = win_probability(events, minute)
        if p.get("available"):
            line.append({"minute": p["minute"], "probabilities": p["probabilities"], "score": p["score"]})
        minute += step
    return line


def _jumps(line: list[dict]) -> list[dict]:
    """The jumps in the line, merged into episodes so one swing is never counted twice."""
    jumps: list[dict] = []
    for before, after in zip(line, line[1:]):
        for team in after["probabilities"]:
            if team == "draw":
                continue
            delta = after["probabilities"][team] - before["probabilities"][team]
            if delta < SWING_MIN_POINTS:
                continue
            jumps.append({"team": team, "from_minute": before["minute"], "minute": after["minute"],
                          "from": before["probabilities"][team], "to": after["probabilities"][team],
                          "delta": delta, "score": after["score"]})
    merged: list[dict] = []
    for jump in jumps:
        if merged and merged[-1]["team"] == jump["team"] and jump["from_minute"] <= merged[-1]["minute"] + 0.5:
            merged[-1].update(minute=jump["minute"], to=jump["to"], score=jump["score"])
            merged[-1]["delta"] = merged[-1]["to"] - merged[-1]["from"]
        else:
            merged.append(jump)
    return merged


def _cause(events: list[MatchEvent], swing: dict) -> MatchEvent | None:
    """The event that most likely turned the match: the last shot or goal in the spell."""
    window = [e for e in events if swing["from_minute"] <= e.minute <= swing["minute"]]
    important = [e for e in window if e.type in (EventType.SHOT, EventType.GOAL)]
    return (important or window or [None])[-1]


def _summary(swing: dict) -> str:
    return (f"{swing['team']}'s chance of winning went from {swing['from']}% to {swing['to']}% "
            f"between minutes {int(swing['from_minute'])} and {int(swing['minute'])}.")


def _headline(swing: dict, cause: MatchEvent) -> str:
    return (f"Momentum swing: {swing['team']}'s win probability rose from {swing['from']}% to "
            f"{swing['to']}% around minute {int(swing['minute'])}. The event at the turn: {cause.team} "
            f"{cause.type.value} at minute {cause.minute:.1f}"
            + (f" by {cause.player}" if cause.player else "") + ".")


def swings(events: list[MatchEvent], top: int = TOP_SWINGS) -> list[dict]:
    """The biggest swings in the win-probability line, strongest first."""
    found = _jumps(probability_line(events))
    return sorted(found, key=lambda s: -s["delta"])[:top]


def momentum(events: list[MatchEvent], model: str | None = None, mode: str = "auto",
             top: int = TOP_SWINGS) -> dict:
    """The biggest momentum swings, each with the claims tested against the events."""
    chosen = swings(events, top)
    chosen.sort(key=lambda s: s["minute"])          # the reader gets them in time order

    def report(swing: dict) -> dict | None:
        cause = _cause(events, swing)
        if cause is None:
            return None
        summary = _summary(swing)
        headline = _headline(swing, cause)
        claims, source, proposed = [], "sweep", 0
        if mode != "sweep" and model and os.getenv("NVIDIA_API_KEY") and model_available():
            try:
                claims = propose(model, events, cause, summary, headline=headline)
                proposed = len(claims)
                source = "model"
                _record_model_result(True)
            except Exception as exc:
                _record_model_result(False, exc)
                print(f"[DEBUG] momentum proposal failed ({exc}); running the sweep instead")
        if source == "model":
            alpha = ALPHA / max(proposed, 1)          # Bonferroni across the claims actually tested
            tested = [check_claim(events, c, alpha) for c in claims]
            pick_evidence(model, events, tested)
        else:
            tested = sweep(events, cause)
            offer_candidates(events, tested)
        for t in tested:
            t["text"] = sentence(t)
        return {
            "team": swing["team"], "minute": swing["minute"], "from": swing["from"], "to": swing["to"],
            "delta": swing["delta"], "score": swing["score"], "summary": summary,
            "cause": {"id": cause.id, "team": cause.team, "type": cause.type.value,
                      "minute": cause.minute, "player": cause.player},
            "source": source,
            "alpha": round(ALPHA / max(len(tested), 1), 4) if source == "model" else None,
            "hypotheses": tested,
        }

    # One swing's report never depends on another's, so the page waits for the slowest swing
    # instead of for every swing in turn.
    with ThreadPoolExecutor(max_workers=min(4, max(1, len(chosen)))) as pool:
        out = [item for item in pool.map(report, chosen) if item is not None]
    return {
        "swings": out,
        "note": "A swing is a jump in the win-probability line: the score so far plus the quality of each "
                "team's chances. The model may propose why it happened; the rules count the events and "
                "decide, so a claim the data does not support is shown as not supported.",
    }
