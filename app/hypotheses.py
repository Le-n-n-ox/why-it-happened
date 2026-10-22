"""Hypotheses: the model proposes WHY a goal happened, the rules test it against the events.

Our detectors can only find the patterns we thought of in advance. Football has hundreds of ways a goal
comes about (an overloaded flank, a faster tempo, a team pinned in its own third), and nobody can write a
detector for each. A model can propose any of them, as a CLAIM in a small fixed grammar: which team, which
minutes, which actions (type, part of the pitch), counted as a share of the team's actions or as a rate,
compared with the rest of the match or with the opponent in the same minutes.

The rules then test the claim with an exact statistical test and mark it supported or not supported.
The numbers on screen come only from that test. The model writes no numbers, and a claim the data does
not support is shown as refuted, so the model's ideas are checked, never trusted.

Why not just search every pattern with equations? Testing everything means correcting for hundreds of
comparisons, which leaves too little power in a five-minute window: sweep() below does exactly that, and
finds little. A few targeted hypotheses, picked by something that knows football, can be tested at a far
looser bar. That choice of what to test is the part a model contributes.
"""
import json
import math
import os
import re

from app.causes import why_they_won
from app.detectors import Insight
from app.events import EventType, MatchEvent
from app.narrator import _chat, _record_model_result, model_available

ALPHA = 0.05                 # overall chance of a false "supported", shared across the claims tested
MIN_WINDOW_EVENTS = 6        # a team needs at least this many actions in the window
MIN_BASELINE_EVENTS = 15     # and the comparison needs at least this many
MIN_SHARE_GAP = 0.15         # a share must differ by at least 15 points to matter
MIN_RATE_RATIO = 1.5         # a rate must be 1.5 times higher (or lower by the same factor)
WINDOW_MIN = 5.0             # minutes before a goal
MAX_WINDOW_MIN = 10.0
MATCH_WINDOW_MAX = 95.0      # a style claim may cover the whole match
STYLE_MIN_WINDOW = 20.0      # and it must be a long stretch, not a spell
TYPES = {t.value for t in EventType}

HYPOTHESIS_SYSTEM = (
    "You are a football analyst testing explanations. You are given one goal and the match events around it. "
    "Propose up to three hypotheses about WHY the goal happened, each as a claim that counting events can "
    "support or refute. Reply with JSON only: {{\"hypotheses\": [{{\"statement\": \"<one plain sentence, no "
    "numbers>\", \"team\": \"<team>\", \"from\": <minute>, \"to\": <minute>, \"where\": {{\"types\": [...], "
    "\"x\": [lo, hi], \"y\": [lo, hi]}}, \"measure\": \"share\"|\"rate\", \"versus\": "
    "\"rest_of_match\"|\"opponent\", \"direction\": \"higher\"|\"lower\"}}]}}. "
    "Pitch: x runs from 0 (the team's own goal line) to 100 (the opponent's goal line); y runs from 0 to 100 "
    "across the pitch; a flank is y below 33 or y above 67; the thirds are x below 33, 33 to 66, above 66. "
    "Types: {types}. 'where' is optional in each part but must narrow the actions somehow. 'share' is the "
    "fraction of the team's actions in the window that match; 'rate' is matching actions per minute. "
    "'versus' is what the window is compared with: the same team in the rest of the match, or the opponent in "
    "the same minutes. Use a window of at most {max_window} minutes that ends at the goal. Prefer hypotheses "
    "that explain this goal in particular and that the events could clearly refute. Never claim what anyone "
    "intended or felt."
)

EVIDENCE_PICKER_SYSTEM = (
    "You are choosing which football events best show a claim. You are given the claims and, for each, a "
    "list of candidate events taken from that claim's window. Reply with JSON only: "
    "{{\"picks\": [{{\"index\": <the claim's number>, \"ids\": [\"<event id>\", ...]}}]}}. "
    "For each claim choose up to three ids that show it BEST, and take them only from that claim's own "
    "candidate list. Prefer the events that actually carry the claim, not simply the earliest ones. "
    "Never write an id that is not in the list, and never write an id of a different claim."
)

STYLE_SYSTEM = (
    "You are a football analyst testing explanations about how one team played across a whole match. "
    "Propose up to three hypotheses about that team's approach, each as a claim that counting events can "
    "support or refute. Reply with JSON only: {{\"hypotheses\": [{{\"statement\": \"<one plain sentence, no "
    "numbers>\", \"team\": \"<team>\", \"from\": <minute>, \"to\": <minute>, \"where\": {{\"types\": [...], "
    "\"x\": [lo, hi], \"y\": [lo, hi]}}, \"measure\": \"share\"|\"rate\", \"versus\": "
    "\"rest_of_match\"|\"opponent\", \"direction\": \"higher\"|\"lower\"}}]}}. "
    "The claim is about the team's approach, not about one spell: use a window of at least {min_window} "
    "minutes, and the whole match if the claim is about how they played in general. "
    "Pitch: x runs from 0 (the team's own goal line) to 100 (the opponent's goal line); y runs from 0 to 100 "
    "across the pitch; a flank is y below 33 or y above 67; the thirds are x below 33, 33 to 66, above 66. "
    "Types: {types}. 'where' must narrow the actions somehow: which actions, which part of the pitch. "
    "'share' is the fraction of the team's actions in the window that match; 'rate' is matching actions per "
    "minute. 'versus' is what the window is compared with: the same team in the rest of the match, or the "
    "opponent in the same minutes. Never claim what anyone intended or felt."
)


# ---------------------------------------------------------------- the claim grammar

def clean_claim(raw: dict, teams: list[str], goal_minute: float, whole_match: bool = False,
                match_minute: float | None = None) -> dict | None:
    """Turn what the model wrote into a valid claim, or None. Nothing outside the grammar gets through.

    `whole_match` opens the window up: a style claim is about how a team played across the match, so
    it needs a long window and, when it covers all of it, the opponent as the baseline.
    """
    if not isinstance(raw, dict):
        return None
    team = {t.casefold(): t for t in teams}.get(str(raw.get("team", "")).casefold())
    where_raw = raw.get("where") if isinstance(raw.get("where"), dict) else {}
    where: dict = {}
    types = [t for t in (where_raw.get("types") or []) if t in TYPES]
    if types:
        where["types"] = sorted(set(types))
    for axis in ("x", "y"):
        rng = where_raw.get(axis)
        if (isinstance(rng, list) and len(rng) == 2 and all(isinstance(v, (int, float)) for v in rng)
                and 0 <= rng[0] < rng[1] <= 100):
            where[axis] = [float(rng[0]), float(rng[1])]
    start, end = raw.get("from"), raw.get("to")
    longest = MATCH_WINDOW_MAX if whole_match else MAX_WINDOW_MIN
    shortest = STYLE_MIN_WINDOW if whole_match else 0.0
    if not (isinstance(start, (int, float)) and isinstance(end, (int, float))):
        start, end = (0.0, goal_minute) if whole_match else (goal_minute - WINDOW_MIN, goal_minute)
    if (not (0 <= start < end <= 130) or end - start > longest or end - start < shortest):
        start, end = (0.0, goal_minute) if whole_match else (goal_minute - WINDOW_MIN, goal_minute)
    if not team or not where:
        return None
    statement = str(raw.get("statement", ""))[:200]
    if re.search(r"\d", statement):              # the model writes no numbers: they come from the test
        statement = ""
    versus = raw.get("versus") if raw.get("versus") in ("rest_of_match", "opponent") else "rest_of_match"
    if whole_match and match_minute is not None and end >= match_minute - 0.5:
        versus = "opponent"      # there is no "rest of the match" left to compare a whole-match claim with
    return {"team": team, "where": where, "from": round(float(start), 2), "to": round(float(end), 2),
            "measure": raw.get("measure") if raw.get("measure") in ("share", "rate") else "share",
            "versus": versus,
            "direction": raw.get("direction") if raw.get("direction") in ("higher", "lower") else "higher",
            "statement": statement}


def _matches(e: MatchEvent, where: dict) -> bool:
    return ((not where.get("types") or e.type.value in where["types"])
            and ("x" not in where or where["x"][0] <= e.x <= where["x"][1])
            and ("y" not in where or where["y"][0] <= e.y <= where["y"][1]))


def describe(where: dict) -> str:
    """The actions a claim is about, in words and without pitch units."""
    bits = []
    types = where.get("types")
    noun = "actions" if not types or len(types) > 3 else " and ".join(
        {"pass": "passes", "carry": "carries", "shot": "shots", "goal": "goals", "tackle": "tackles",
         "interception": "interceptions", "foul": "fouls"}[t] for t in types)
    if "x" in where:
        lo, hi = where["x"]
        third = ("their own third" if hi <= 40 else "the final third" if lo >= 60 else
                 "the middle third" if lo >= 25 and hi <= 75 else None)
        bits.append(f"in {third}" if third else "in one part of the pitch")
    if "y" in where:
        lo, hi = where["y"]
        side = ("on one flank (the low-y side)" if hi <= 40 else "on one flank (the high-y side)" if lo >= 60
                else "through the centre" if lo >= 25 and hi <= 75 else "on one side")
        bits.append(side)
    return " ".join([noun] + bits)


# ---------------------------------------------------------------- exact tests

def _binom_tail(k: int, n: int, p: float, upper: bool) -> float:
    """The exact binomial tail.

    A long window holds thousands of events, and the binomial coefficient of that many events does
    not fit in a float, so a big window is summed in logs. The sum is the same either way.
    """
    if upper:
        if k <= 0:
            return 1.0
        if k > n:
            return 0.0
        terms = range(k, n + 1)
    else:
        if k > n:
            return 0.0
        terms = range(0, k + 1)
    if n <= 300:
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in terms)
    log_p = math.log(p) if p > 0 else -math.inf
    log_q = math.log1p(-p) if p < 1 else -math.inf
    total = 0.0
    for i in terms:
        term = math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1)
        if i:
            term += i * log_p
        if n - i:
            term += (n - i) * log_q
        total += math.exp(term)
    return min(total, 1.0)


def _poisson_tail(k: int, mu: float, upper: bool) -> float:
    """The exact Poisson tail, summed in logs so a long window cannot overflow."""
    if mu <= 0:
        return 0.0 if upper else 1.0
    log_mu = math.log(mu)
    terms = range(k) if upper else range(k + 1)
    total = sum(math.exp(-mu + i * log_mu - math.lgamma(i + 1)) for i in terms)
    if upper:
        total = 1 - total
    return min(max(total, 0.0), 1.0)


def check_claim(events: list[MatchEvent], claim: dict, alpha: float = ALPHA) -> dict:
    """Count the events and decide: supported, not supported, or too little data. Numbers come from here only."""
    team, where = claim["team"], claim["where"]
    lo, hi = claim["from"], claim["to"]
    opp = next((e.team for e in events if e.team != team), None)
    span = (min(e.minute for e in events), max(e.minute for e in events))
    mine = [e for e in events if e.team == team]
    window = [e for e in mine if lo <= e.minute <= hi]
    hits = [e for e in window if _matches(e, where)]
    if claim["versus"] == "opponent":
        base = [e for e in events if e.team == opp and lo <= e.minute <= hi]
        base_minutes = hi - lo
        label = f"for {opp} in the same minutes"
    else:
        base = [e for e in mine if not lo <= e.minute <= hi]
        base_minutes = max((span[1] - span[0]) - (hi - lo), 1.0)
        label = "in the rest of the match"
    base_hits = [e for e in base if _matches(e, where)]
    minutes = hi - lo
    higher = claim["direction"] == "higher"
    out = {**claim, "baseline_label": label, "n": len(window), "hits": len(hits),
           "baseline_n": len(base), "baseline_hits": len(base_hits),
           "evidence": [e.id for e in (hits or window)][:6]}

    min_base = MIN_BASELINE_EVENTS if claim["versus"] == "rest_of_match" else MIN_WINDOW_EVENTS
    if claim["measure"] == "share":
        if len(window) < MIN_WINDOW_EVENTS or len(base) < min_base:
            return {**out, "verdict": "too little data", "p_value": None}
        share, base_share = len(hits) / len(window), len(base_hits) / len(base)
        smoothed = (len(base_hits) + 1) / (len(base) + 2)                  # never exactly 0 or 1
        p = _binom_tail(len(hits), len(window), smoothed, upper=higher)
        gap = share - base_share
        ok = (gap >= MIN_SHARE_GAP) if higher else (gap <= -MIN_SHARE_GAP)
        out.update(value=round(share, 3), baseline=round(base_share, 3))
    else:
        if minutes <= 0 or len(window) < MIN_WINDOW_EVENTS:
            return {**out, "verdict": "too little data", "p_value": None}
        rate, base_rate = len(hits) / minutes, len(base_hits) / base_minutes
        mu = max(base_rate, 1e-9) * minutes
        if mu < 0.5 and not higher:
            return {**out, "verdict": "too little data", "p_value": None}
        p = _poisson_tail(len(hits), mu, upper=higher)
        ratio = rate / base_rate if base_rate else math.inf
        ok = (ratio >= MIN_RATE_RATIO) if higher else (ratio <= 1 / MIN_RATE_RATIO)
        out.update(value=round(rate, 2), baseline=round(base_rate, 2))
    out["p_value"] = round(p, 5)
    out["verdict"] = "supported" if (ok and p <= alpha) else "not supported"
    return out


def sentence(result: dict) -> str:
    """The verified finding, in words, written by rules from the test's own numbers."""
    what = describe(result["where"])
    team = result["team"]
    poss = team + ("'" if team.endswith("s") else "'s")
    window = f"minutes {int(result['from'])} to {int(result['to'])}"
    if result["verdict"] == "too little data":
        return f"Too few actions in {window} to test this."
    if result["measure"] == "share":
        return (f"{poss} {what} made up {round(result['value'] * 100)}% of their actions in {window}, against "
                f"{round(result['baseline'] * 100)}% {result['baseline_label']} "
                f"({result['hits']} of {result['n']}).")
    return (f"{team} made {result['hits']} {what} in {window}, a rate of {result['value']} a minute, against "
            f"{result['baseline']} a minute {result['baseline_label']}.")


# ---------------------------------------------------------------- the evidence picker

EVIDENCE_LIMIT = 8         # the rules offer this many candidates per claim
PICKED_EVIDENCE = 3        # the model chooses up to this many


def _candidates(events: list[MatchEvent], result: dict) -> list[dict]:
    """The events the rules offer as evidence for a claim: the ones that matched it, with context."""
    team, where = result["team"], result["where"]
    window = [e for e in events if e.team == team and result["from"] <= e.minute <= result["to"]]
    matching = [e for e in window if _matches(e, where)]
    chosen = (matching or window)[:EVIDENCE_LIMIT]
    return [{"id": e.id, "minute": round(e.minute, 1), "team": e.team, "type": e.type.value,
             "player": e.player, "outcome": e.outcome} for e in chosen]


def offer_candidates(events: list[MatchEvent], results: list[dict]) -> list[list[dict]]:
    """Give every claim the events the rules would use as its evidence, with enough context to judge."""
    offers = [_candidates(events, r) for r in results]
    for result, offer in zip(results, offers):
        result["candidates"] = [c["id"] for c in offer]
    return offers


def pick_evidence(model: str, events: list[MatchEvent], results: list[dict]) -> None:
    """Let the model choose which events best show each claim. The rules keep only ids it was given.

    The rules decide which events are candidates; the model only chooses among them. A pick that names
    an id outside the list, or a broken reply, leaves the rules' own choice in place.
    """
    if not results:
        return
    offers = offer_candidates(events, results)
    for result in results:
        result["evidence"] = result["candidates"][:PICKED_EVIDENCE]

    payload = {"claims": [{"index": i, "statement": r["statement"], "team": r["team"], "where": r["where"],
                           "from": r["from"], "to": r["to"], "candidates": offer}
                          for i, (r, offer) in enumerate(zip(results, offers))]}
    try:
        reply = _chat(model, [{"role": "system", "content": EVIDENCE_PICKER_SYSTEM},
                              {"role": "user", "content": json.dumps(payload)}], "evidence picker", max_tokens=300)
        picks = _json_object(reply).get("picks") or []
    except Exception as exc:
        print(f"[DEBUG] evidence picker failed ({exc}); keeping the rules' choice")
        return

    by_index: dict[int, list] = {}
    for pick in picks:
        if isinstance(pick, dict) and isinstance(pick.get("index"), int):
            by_index[pick["index"]] = pick.get("ids")
    for i, result in enumerate(results):
        ids = by_index.get(i)
        if not isinstance(ids, list):
            continue
        allowed = set(result["candidates"])
        good = [e for e in ids if isinstance(e, str) and e in allowed][:PICKED_EVIDENCE]
        if good:
            result["evidence"] = good


# ---------------------------------------------------------------- proposing and testing

def _moment_text(events: list[MatchEvent], goal: MatchEvent, summary: str, headline: str | None = None) -> str:
    lo = goal.minute - WINDOW_MIN
    lines = [headline or f"Goal: {goal.team} scored at minute {goal.minute:.1f}. Cause chain: {summary}",
             "Events in the 5 minutes before:"]
    for e in events:
        if lo - 2 <= e.minute <= goal.minute:
            lines.append(f"minute {e.minute:.1f} {e.team} {e.type.value} x={e.x:.0f} y={e.y:.0f}"
                         + (f" ({e.player})" if e.player else ""))
    return "\n".join(lines)


def _json_object(text: str):
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in the model reply")
    return json.loads(text[start:end + 1])


def propose(model: str, events: list[MatchEvent], goal: MatchEvent, summary: str,
            headline: str | None = None) -> list[dict]:
    teams = list(dict.fromkeys(e.team for e in events))
    system = HYPOTHESIS_SYSTEM.format(types=", ".join(sorted(TYPES)), max_window=int(MAX_WINDOW_MIN))
    reply = _chat(model, [{"role": "system", "content": system},
                          {"role": "user", "content": _moment_text(events, goal, summary, headline)}],
                  "hypotheses", max_tokens=700)
    claims = []
    for raw in (_json_object(reply).get("hypotheses") or [])[:3]:
        claim = clean_claim(raw, teams, goal.minute)
        if claim:
            claims.append(claim)
    return claims


def sweep(events: list[MatchEvent], goal: MatchEvent | None = None, lo: float | None = None,
          hi: float | None = None, teams: list[str] | None = None,
          versus: str | None = None) -> list[dict]:
    """The equations-only baseline: test every pattern in a fixed grid, correcting for how many were tried."""
    all_teams = list(dict.fromkeys(e.team for e in events))
    if lo is None:
        lo = goal.minute - WINDOW_MIN
    if hi is None:
        hi = goal.minute
    chosen = teams or all_teams
    thirds = [(0, 33), (33, 67), (67, 100)]
    predicates = ([{"types": [t]} for t in sorted(TYPES)] + [{"x": list(map(float, r))} for r in thirds]
                  + [{"y": list(map(float, r))} for r in thirds]
                  + [{"x": list(map(float, a)), "y": list(map(float, b))} for a in thirds for b in thirds])
    claims = [{"team": t, "where": w, "from": lo, "to": hi, "measure": "share",
               "versus": versus or "rest_of_match", "direction": d, "statement": ""}
              for t in chosen for w in predicates for d in ("higher", "lower")]
    alpha = ALPHA / len(claims)
    results = [check_claim(events, c, alpha) for c in claims]
    return sorted([r for r in results if r["verdict"] == "supported"], key=lambda r: r["p_value"])[:5]


# ---------------------------------------------------------------- whole-match style claims

def _style_text(events: list[MatchEvent], team: str, summary: str) -> str:
    """A compact picture of how the team played, for the model to make a claim about."""
    mine = [e for e in events if e.team == team]
    thirds = [sum(e.x < 33 for e in mine), sum(33 <= e.x < 66 for e in mine), sum(e.x >= 66 for e in mine)]
    bands = [sum(e.y < 33 for e in mine), sum(33 <= e.y < 66 for e in mine), sum(e.y >= 66 for e in mine)]
    types = ", ".join(f"{t.value} {sum(e.type == t for e in mine)}" for t in sorted(EventType, key=lambda t: t.value))
    return "\n".join([
        f"Team: {team}. The claim is about how {team} played across the whole match, not about one spell.",
        f"Their actions by type: {types}.",
        f"Their actions by pitch third (own, middle, final): {thirds}.",
        f"Their actions by side of the pitch (low, centre, high): {bands}.",
        f"The claim to test: {summary}.",
    ])


def propose_style(model: str, events: list[MatchEvent], team: str, summary: str) -> list[dict]:
    """The model's claims about how a team played, in the same grammar as the goal claims."""
    teams = list(dict.fromkeys(e.team for e in events))
    last = max((e.minute for e in events), default=0.0)
    system = STYLE_SYSTEM.format(types=", ".join(sorted(TYPES)), min_window=int(STYLE_MIN_WINDOW))
    reply = _chat(model, [{"role": "system", "content": system},
                          {"role": "user", "content": _style_text(events, team, summary)}],
                  "style claims", max_tokens=700)
    claims = []
    for raw in (_json_object(reply).get("hypotheses") or [])[:3]:
        claim = clean_claim(raw, teams, last, whole_match=True, match_minute=last)
        if claim and claim["team"] == team:
            claims.append(claim)
    return claims


def style_claims(events: list[MatchEvent], model: str | None = None, mode: str = "auto",
                 team: str | None = None) -> dict:
    """Claims about how a team played across the whole match, tested by the very same tests.

    The window is long, so there is more data behind the test and the claim is stronger than one
    about a five-minute spell. When the window covers the whole match, the baseline is the opponent
    in the same minutes, because there is no rest of the match left to compare with.
    """
    teams = list(dict.fromkeys(e.team for e in events))
    if team not in teams:
        return {"available": False, "reason": f"{team} is not in this match data."}
    last = max((e.minute for e in events), default=0.0)
    use_model = bool(mode != "sweep" and model and os.getenv("NVIDIA_API_KEY") and model_available())
    claims, source, proposed = [], "sweep", 0
    if use_model:
        try:
            claims = propose_style(model, events, team, f"how {team} played across the match")
            proposed = len(claims)
            source = "model"
            _record_model_result(True)
        except Exception as exc:
            _record_model_result(False, exc)
            print(f"[DEBUG] style claims failed ({exc}); running the sweep instead")
    if source == "model":
        alpha = ALPHA / max(proposed, 1)
        tested = [check_claim(events, c, alpha) for c in claims]
        pick_evidence(model, events, tested)
    else:
        tested = sweep(events, lo=0.0, hi=last, teams=[team], versus="opponent")
        offer_candidates(events, tested)
    for t in tested:
        t["text"] = sentence(t)
    return {
        "available": True,
        "team": team,
        "window": {"from": 0, "to": round(last, 1)},
        "source": source,
        "alpha": round(ALPHA / max(len(tested), 1), 4) if source == "model" else None,
        "hypotheses": tested,
        "note": "A style claim is about the whole match, not one spell, so the window is long and the "
                "test has more data behind it. The same tests decide: a claim the events do not support "
                "is shown as not supported.",
    }


def moments(events: list[MatchEvent], found: list[Insight]) -> list[dict]:
    """The goals, each with the cause chain already found by rules."""
    by_id = {e.id: e for e in events}
    out = []
    for reason in why_they_won(events, found)["reasons"]:
        goal = by_id.get(reason["evidence"][-1])
        if goal is not None and goal.type == EventType.GOAL:
            out.append({"goal": goal, "summary": reason["text"]})
    return out


def hypotheses(events: list[MatchEvent], found: list[Insight], model: str | None = None,
               mode: str = "auto", goal_id: str | None = None) -> list[dict]:
    """For each goal: the model's hypotheses tested by the rules (or the equation-only sweep)."""
    use_model = bool(mode != "sweep" and model and os.getenv("NVIDIA_API_KEY") and model_available())
    out = []
    for moment in moments(events, found):
        goal = moment["goal"]
        if goal_id and goal.id != goal_id:
            continue
        source, claims, proposed = "sweep", [], 0
        if use_model:
            try:
                claims = propose(model, events, goal, moment["summary"])
                proposed = len(claims)
                source = "model"
                _record_model_result(True)
            except Exception as exc:
                _record_model_result(False, exc)
                print(f"[DEBUG] hypothesis proposal failed ({exc}); running the sweep instead")
        if source == "model":
            alpha = ALPHA / max(proposed, 1)               # Bonferroni across the claims actually tested
            tested = [check_claim(events, c, alpha) for c in claims]
            pick_evidence(model, events, tested)            # the model chooses which events show each claim
        else:
            tested = sweep(events, goal)
            offer_candidates(events, tested)                # the rules' own choice stays as the evidence
        for t in tested:
            t["text"] = sentence(t)
        out.append({"goal_id": goal.id, "team": goal.team, "minute": goal.minute, "summary": moment["summary"],
                    "source": source, "alpha": round(ALPHA / max(len(tested), 1), 4) if source == "model" else None,
                    "hypotheses": tested})
    return out