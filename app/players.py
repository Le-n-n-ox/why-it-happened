"""Players: stats, a rating you can audit, a "why" for every action, and end-of-match review facts.

Nothing here guesses what a player was thinking. "Why" is built only from what the data shows:
what happened just before the action, where on the pitch it happened, and what it led to.
Everything cites real event ids.
"""
import re

from app.detectors import Insight, detect_all
from app.events import EventType, MatchEvent

BALL_WIN = (EventType.TACKLE, EventType.INTERCEPTION)
SHOTS = (EventType.SHOT, EventType.GOAL)
LINK_MIN = 0.20         # 12 s: a touch by the same team this soon is "who got the ball next"
PROGRESS_MIN = 0.25     # 15 s window for judging whether a pass or carry moved the ball forward
LED_TO_MIN = 0.5        # 30 s horizon for "the move ended in a shot"
FORWARD_BY = 15         # x units: how much further up the pitch counts as "forward"

KIND_LABEL = {
    "counter_attack": "counter attack",
    "turnover_shot": "turnover shot",
    "high_press_turnover": "high press",
    "goal_buildup": "goal build-up",
    "shot_pressure": "spell of shot pressure",
}


def slug(team: str, name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", f"{team}-{name}".lower()).strip("-")


def zone(x: float) -> str:
    """x is measured from the team's OWN goal line."""
    return "own third" if x < 33 else "middle third" if x < 66 else "final third"


def where(x: float) -> str:
    """The zone as it reads in a sentence: 'their own third', 'the middle third'."""
    return "their own third" if x < 33 else "the middle third" if x < 66 else "the final third"


def join_names(names: list[str]) -> str:
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def _next_touch(events: list[MatchEvent], i: int, within: float) -> MatchEvent | None:
    """The same team's next event inside `within` minutes, with no opponent touch in between."""
    e = events[i]
    if i + 1 >= len(events):
        return None
    nxt = events[i + 1]
    return nxt if nxt.team == e.team and nxt.minute - e.minute <= within else None


def _prev_touch(events: list[MatchEvent], i: int, within: float) -> MatchEvent | None:
    e = events[i]
    if i == 0:
        return None
    prev = events[i - 1]
    return prev if prev.team == e.team and e.minute - prev.minute <= within else None


def _is_progressive(events: list[MatchEvent], i: int) -> bool:
    e = events[i]
    if e.type not in (EventType.PASS, EventType.CARRY):
        return False
    nxt = _next_touch(events, i, PROGRESS_MIN)
    return nxt is not None and nxt.x - e.x >= FORWARD_BY


# ---------------------------------------------------------------- stats and rating

def involvement(events: list[MatchEvent], insights: list[Insight]) -> dict[str, list[dict]]:
    """player id -> the insights they appear in, with their part in each."""
    by_id = {e.id: e for e in events}
    out: dict[str, list[dict]] = {}
    for ins in insights:
        for k, eid in enumerate(ins.evidence):
            e = by_id.get(eid)
            if e is None or not e.player:
                continue
            role = "started" if k == 0 else "finished" if k == len(ins.evidence) - 1 else "was part of"
            pid = slug(e.team, e.player)
            rows = out.setdefault(pid, [])
            if not any(r["insight_id"] == ins.id for r in rows):      # one row per insight
                rows.append({"insight_id": ins.id, "kind": ins.kind, "minute": ins.minute, "role": role})
    return out


def player_stats(events: list[MatchEvent], insights: list[Insight] | None = None) -> dict[str, dict]:
    insights = detect_all(events) if insights is None else insights
    involved = involvement(events, insights)
    stats: dict[str, dict] = {}
    for i, e in enumerate(events):
        if not e.player:
            continue
        s = stats.setdefault(slug(e.team, e.player), {
            "id": slug(e.team, e.player), "name": e.player, "team": e.team,
            "touches": 0, "passes": 0, "carries": 0, "shots": 0, "goals": 0, "on_target": 0,
            "tackles": 0, "interceptions": 0, "fouls": 0, "progressive": 0,
        })
        s["touches"] += 1
        if e.type == EventType.PASS:
            s["passes"] += 1
        elif e.type == EventType.CARRY:
            s["carries"] += 1
        elif e.type in SHOTS:
            s["shots"] += 1
            s["goals"] += e.type == EventType.GOAL
            s["on_target"] += e.type == EventType.GOAL or e.outcome == "saved"
        elif e.type == EventType.TACKLE:
            s["tackles"] += 1
        elif e.type == EventType.INTERCEPTION:
            s["interceptions"] += 1
        elif e.type == EventType.FOUL:
            s["fouls"] += 1
        s["progressive"] += _is_progressive(events, i)
    for pid, s in stats.items():
        s["key_moments"] = len(involved.get(pid, []))
    return stats


# Every line of the rating is shown to the reader, so nobody has to trust a hidden formula.
def rating(stats: dict) -> dict:
    lines = [("Starting point", 6.0)]

    def add(label: str, count: int, each: float, cap: float | None = None):
        if count:
            value = count * each
            value = min(value, cap) if cap is not None and each > 0 else value
            lines.append((f"{count} {label}", round(value, 2)))

    add("goal(s)", stats["goals"], 1.2)
    add("shot(s) that were not goals", stats["shots"] - stats["goals"], 0.15)
    add("shot(s) on target that were not goals", stats["on_target"] - stats["goals"], 0.1)
    add("forward pass(es) or carry(ies)", stats["progressive"], 0.1, cap=0.6)
    add("ball win(s) (tackles and interceptions)", stats["tackles"] + stats["interceptions"], 0.2, cap=0.8)
    add("key moment(s) the match engine found", stats["key_moments"], 0.25, cap=0.75)
    add("foul(s)", stats["fouls"], -0.3)
    total = max(4.0, min(10.0, sum(v for _, v in lines)))
    return {
        "value": round(total, 1),
        "breakdown": [{"reason": r, "points": v} for r, v in lines],
    }


def player_table(events: list[MatchEvent], insights: list[Insight] | None = None) -> list[dict]:
    rows = []
    for s in player_stats(events, insights).values():
        r = rating(s)
        rows.append({**s, "rating": r["value"]})
    return sorted(rows, key=lambda r: (-r["rating"], r["name"]))


# ---------------------------------------------------------------- "why" for one action

def explain_action(events: list[MatchEvent], event_id: str, insights: list[Insight] | None = None) -> dict | None:
    index = {e.id: n for n, e in enumerate(events)}
    if event_id not in index:
        return None
    insights = detect_all(events) if insights is None else insights
    i = index[event_id]
    e = events[i]
    name = e.player or "A player"
    used = [e.id]

    # --- what came just before (only things the data shows)
    before = ""
    prev = events[i - 1] if i else None
    prev_same = _prev_touch(events, i, LINK_MIN)
    if prev_same and prev_same.player and prev_same.player != e.player and e.type != EventType.FOUL:
        if prev_same.type == EventType.PASS:
            before = f"after getting the ball from {prev_same.player}"
        elif prev_same.type in BALL_WIN:
            before = f"after {prev_same.player} won the ball"
        else:
            before = f"after {prev_same.player}'s {prev_same.type.value}"
        used.insert(0, prev_same.id)
    elif prev_same and prev_same.player == e.player:
        before = "keeping the move going"
        used.insert(0, prev_same.id)
    elif (e.type in BALL_WIN and prev and prev.team != e.team and prev.player
          and e.minute - prev.minute <= PROGRESS_MIN):
        before = f"just after {prev.player} ({prev.team}) had the ball"
        used.insert(0, prev.id)

    # --- what the action itself was
    nxt = _next_touch(events, i, LINK_MIN)
    z = zone(e.x)
    if e.type == EventType.PASS:
        if nxt and nxt.player and nxt.player != e.player:
            dx = nxt.x - e.x
            way = "forward" if dx >= FORWARD_BY else "back" if dx <= -10 else "across"
            what = f"plays it {way} to {nxt.player} from {where(e.x)}"
            used.append(nxt.id)
        else:
            what = f"plays the ball on from {where(e.x)}"
    elif e.type == EventType.CARRY:
        ahead = _next_touch(events, i, PROGRESS_MIN)
        what = (f"drives the ball forward from {where(e.x)}" if ahead and ahead.x - e.x >= FORWARD_BY
                else f"carries the ball in {where(e.x)}")
    elif e.type in SHOTS:
        place = ("from inside the penalty area" if e.x >= 84
                 else "from the edge of the area" if e.x >= 75 else "from distance")
        angle = "" if 30 <= e.y <= 70 else " at a wide angle"
        if e.type == EventType.GOAL:
            what = f"scores {place}{angle}"
        else:
            result = {"saved": "the keeper saves it", "blocked": "a defender blocks it",
                      "off target": "it goes off target"}.get(e.outcome or "", "")
            what = f"shoots {place}{angle}" + (f" and {result}" if result else "")
    elif e.type == EventType.TACKLE:
        what = f"wins the ball for {e.team} with a tackle in {where(e.x)}"
    elif e.type == EventType.INTERCEPTION:
        what = f"cuts out a pass and wins the ball for {e.team} in {where(e.x)}"
    else:
        what = f"gives away a free kick in {where(e.x)}"

    # --- what it led to
    after = ""
    if e.type not in SHOTS:
        for j in range(i + 1, len(events)):
            n = events[j]
            if n.minute - e.minute > LED_TO_MIN or n.team != e.team:
                break
            if n.type in SHOTS:
                secs = round((n.minute - e.minute) * 60)
                who = n.player or "a team-mate"
                verb = "ended in a goal for" if n.type == EventType.GOAL else "ended in a shot for"
                after = f"The move {verb} {who} {secs} seconds later."
                used.append(n.id)
                break

    # --- the key moment it belongs to, if any
    insight_id = None
    note = ""
    for ins in insights:
        if e.id in ins.evidence:
            insight_id = ins.id
            note = f"This was part of the {int(ins.minute)}' {KIND_LABEL.get(ins.kind, ins.kind)}."
            break

    text = f"{name} {what}" + (f", {before}" if before else "") + "."
    text = " ".join(t for t in (text, after, note) if t)
    return {
        "event_id": e.id,
        "minute": e.minute,
        "team": e.team,
        "player": e.player,
        "type": e.type.value,
        "zone": z,
        "why": text,
        "evidence": list(dict.fromkeys(used)),
        "insight_id": insight_id,
    }


def player_actions(events: list[MatchEvent], pid: str, insights: list[Insight] | None = None) -> list[dict]:
    insights = detect_all(events) if insights is None else insights
    return [explain_action(events, e.id, insights) for e in events
            if e.player and slug(e.team, e.player) == pid]


# ---------------------------------------------------------------- end-of-match review

def review_insight(events: list[MatchEvent], pid: str, insights: list[Insight] | None = None) -> Insight | None:
    """The facts for one player's review, as an Insight so the narrator's safety net applies
    (cited evidence, grounded numbers, template fallback, cache)."""
    insights = detect_all(events) if insights is None else insights
    stats = player_stats(events, insights).get(pid)
    if stats is None:
        return None
    mine = [e for e in events if e.player and slug(e.team, e.player) == pid]
    involved = involvement(events, insights).get(pid, [])
    key_ids = {eid for ins in insights for eid in ins.evidence}

    goals = [e for e in mine if e.type == EventType.GOAL]
    ranked = (goals
              + [e for e in mine if e.type == EventType.SHOT]
              + [e for e in mine if e.id in key_ids and e not in goals]
              + [e for e in mine if e.type in BALL_WIN]
              + mine)
    evidence_events = sorted(list({e.id: e for e in ranked}.values())[:6], key=lambda e: e.minute)

    if goals:
        highlight, minute = "scored", goals[0].minute
    elif involved:
        best = sorted(involved, key=lambda r: (r["role"] != "finished", r["minute"]))[0]
        highlight, minute = f"{best['role']} the {KIND_LABEL.get(best['kind'], best['kind'])}", best["minute"]
    else:
        highlight, minute = "", evidence_events[-1].minute
    facts = {
        "name": stats["name"], "touches": stats["touches"], "passes": stats["passes"],
        "carries": stats["carries"], "shots": stats["shots"], "goals": stats["goals"],
        "tackles": stats["tackles"], "interceptions": stats["interceptions"], "fouls": stats["fouls"],
        "progressive": stats["progressive"], "key_moments": stats["key_moments"],
        "goal_minutes": [int(g.minute) for g in goals],
        "highlight": highlight,
    }
    return Insight(
        kind="player_review", team=stats["team"], minute=minute,
        evidence=[e.id for e in evidence_events], facts=facts,
    )


def player_review_text(facts: dict, team: str) -> str:
    """Plain English review from the facts. Used when no model is available."""
    def plural(n: int, word: str) -> str:
        return f"{n} {word}" + ("" if n == 1 else "es" if word.endswith("ch") else "s")

    parts = []
    if facts.get("goals"):
        minutes = join_names([f"{m}'" for m in facts.get("goal_minutes", [])])
        parts.append(f"scored {plural(facts['goals'], 'goal')}" + (f" ({minutes})" if minutes else ""))
    elif facts.get("shots"):
        parts.append(f"had {plural(facts['shots'], 'shot')}")
    wins = facts.get("tackles", 0) + facts.get("interceptions", 0)
    if wins:
        parts.append(f"won the ball back {plural(wins, 'time')}")
    if facts.get("progressive"):
        parts.append(f"moved the ball forward {plural(facts['progressive'], 'time')}")
    if facts.get("fouls"):
        parts.append(f"gave away {plural(facts['fouls'], 'foul')}")
    summary = join_names(parts) if parts else "kept things ticking over"
    text = f"{facts['name']} ({team}) had {plural(facts['touches'], 'touch')} and {summary}."
    if facts.get("key_moments"):
        text += f" The match engine found {plural(facts['key_moments'], 'key moment')} involving {facts['name']}."
    return text