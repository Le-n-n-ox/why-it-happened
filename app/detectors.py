"""Rule-based pattern detection. Deterministic, testable, explainable.

To add a detector: write a function list[MatchEvent] -> list[Insight] and
add it to DETECTORS at the bottom.
"""
from dataclasses import asdict, dataclass, field

from app.events import EventType, MatchEvent


@dataclass
class Insight:
    kind: str                                   # e.g. "counter_attack", "turnover_shot", "high_press_turnover", "goal_buildup", "shot_pressure"
    team: str
    minute: float
    evidence: list[str]                         # ids of the events that prove it
    facts: dict = field(default_factory=dict)
    narration: dict = field(default_factory=dict)   # language code -> text

    @property
    def id(self) -> str:
        return f"{self.kind}-{self.evidence[0]}"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["id"] = self.id
        return d


def detect_counter_attacks(events: list[MatchEvent], window_min: float = 0.25) -> list[Insight]:
    """Won the ball in own half, then a shot/goal by the same team within ~15 seconds."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball or start.x >= 50:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break                       # too slow, or possession was lost
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                found.append(Insight(
                    kind="counter_attack",
                    team=start.team,
                    minute=start.minute,
                    evidence=[e.id for e in chain],
                    facts={
                        "duration_s": round((nxt.minute - start.minute) * 60),
                        "start_x": start.x,
                        "end_x": nxt.x,
                        "passes": sum(e.type == EventType.PASS for e in chain),
                        "ended_in": nxt.type.value,
                    },
                ))
                break
    return found


def detect_turnover_shots(events: list[MatchEvent], window_min: float = 0.60) -> list[Insight]:
    """Defensive recovery leading to a shot within ~35 seconds (for slower build-up transitions)."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                duration_s = round((nxt.minute - start.minute) * 60)
                high_press_owns_it = start.x >= 60 and duration_s <= 21
                if duration_s > 15 and not high_press_owns_it:
                    found.append(Insight(
                        kind="turnover_shot",
                        team=start.team,
                        minute=start.minute,
                        evidence=[e.id for e in chain],
                        facts={
                            "duration_s": duration_s,
                            "start_x": start.x,
                            "end_x": nxt.x,
                            "ended_in": nxt.type.value,
                        },
                    ))
                break
    return found


def detect_high_press(events: list[MatchEvent], window_min: float = 0.35) -> list[Insight]:
    """Won possession high up the pitch (x >= 60) leading to an attacking threat within ~20s."""
    found = []
    for i, start in enumerate(events):
        won_ball = start.type in (EventType.INTERCEPTION, EventType.TACKLE)
        if not won_ball or start.x < 60:
            continue
        chain = [start]
        for nxt in events[i + 1:]:
            if nxt.minute - start.minute > window_min or nxt.team != start.team:
                break
            chain.append(nxt)
            if nxt.type in (EventType.SHOT, EventType.GOAL):
                found.append(Insight(
                    kind="high_press_turnover",
                    team=start.team,
                    minute=start.minute,
                    evidence=[e.id for e in chain],
                    facts={
                        "duration_s": round((nxt.minute - start.minute) * 60),
                        "recovery_x": start.x,
                        "end_x": nxt.x,
                        "passes": sum(e.type == EventType.PASS for e in chain),
                        "ended_in": nxt.type.value,
                    },
                ))
                break
    return found


def detect_goal_buildups(
    events: list[MatchEvent], max_span_min: float = 1.0, min_passes: int = 3
) -> list[Insight]:
    """A goal scored after a patient passing move by one team (not a quick transition).

    Walks back from each goal through the same team's events, up to a minute earlier.
    """
    found = []
    for g, goal in enumerate(events):
        if goal.type != EventType.GOAL:
            continue
        start = g
        while start > 0:
            prev = events[start - 1]
            if prev.team != goal.team or goal.minute - prev.minute > max_span_min:
                break                       # possession was lost, or the move began too long ago
            start -= 1
        chain = events[start:g + 1]
        passes = sum(e.type == EventType.PASS for e in chain)
        if len(chain) >= 4 and passes >= min_passes:
            found.append(Insight(
                kind="goal_buildup",
                team=goal.team,
                minute=chain[0].minute,
                evidence=[e.id for e in chain],
                facts={
                    "duration_s": round((goal.minute - chain[0].minute) * 60),
                    "passes": passes,
                    "touches": len(chain),
                    "start_x": chain[0].x,
                    "end_x": goal.x,
                    "ended_in": "goal",
                },
            ))
    return found


def detect_shot_pressure(
    events: list[MatchEvent], window_min: float = 5.0, min_shots: int = 3
) -> list[Insight]:
    """Three or more shots (goals count) by one team within five minutes: sustained pressure.

    A spell is reported once, as the longest run that fits inside the window.
    """
    found = []
    for team in dict.fromkeys(e.team for e in events):
        shots = [e for e in events if e.team == team and e.type in (EventType.SHOT, EventType.GOAL)]
        i = 0
        while i < len(shots):
            j = i
            while j + 1 < len(shots) and shots[j + 1].minute - shots[i].minute <= window_min:
                j += 1
            if j - i + 1 >= min_shots:
                spell = shots[i:j + 1]
                found.append(Insight(
                    kind="shot_pressure",
                    team=team,
                    minute=spell[0].minute,
                    evidence=[e.id for e in spell],
                    facts={
                        "shots": len(spell),
                        "goals": sum(e.type == EventType.GOAL for e in spell),
                        "span_min": max(1, round(spell[-1].minute - spell[0].minute)),
                    },
                ))
                i = j + 1                   # the next spell starts after this one
            else:
                i += 1
    return found


DETECTORS = [
    detect_counter_attacks, detect_turnover_shots, detect_high_press, detect_goal_buildups, detect_shot_pressure,
]


def add_players(insights: list[Insight], events: list[MatchEvent]) -> None:
    """Attach named participants from each insight's evidence chain, when available."""
    by_id = {e.id: e for e in events}
    for insight in insights:
        chain = [by_id[event_id] for event_id in insight.evidence if event_id in by_id]
        names = list(dict.fromkeys(event.player for event in chain if event.player))
        if not names:
            continue
        insight.facts["players"] = names
        if insight.kind != "shot_pressure":
            if chain and chain[0].player:
                insight.facts["starter"] = chain[0].player
            if chain and chain[-1].player:
                insight.facts["finisher"] = chain[-1].player


def detect_all(events: list[MatchEvent]) -> list[Insight]:
    insights: list[Insight] = []
    for detector in DETECTORS:
        insights.extend(detector(events))
    # A goal another detector already explains (counter-attack, press...) is not shown twice.
    explained = {i.evidence[-1] for i in insights if i.kind != "goal_buildup"}
    insights = [i for i in insights if i.kind != "goal_buildup" or i.evidence[-1] not in explained]
    add_players(insights, events)
    return sorted(insights, key=lambda i: i.minute)
