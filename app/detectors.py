"""Rule-based pattern detection. Deterministic, testable, explainable.

To add a detector: write a function list[MatchEvent] -> list[Insight] and
add it to DETECTORS at the bottom.
"""
from dataclasses import asdict, dataclass, field

from app.events import EventType, MatchEvent


@dataclass
class Insight:
    kind: str                                   # e.g. "counter_attack", "turnover_shot", "high_press_turnover"
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
                # Ignore fast sequences under 15s so counter_attack remains distinct
                if duration_s > 15:
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


DETECTORS = [detect_counter_attacks, detect_turnover_shots, detect_high_press]


def detect_all(events: list[MatchEvent]) -> list[Insight]:
    insights: list[Insight] = []
    for detector in DETECTORS:
        insights.extend(detector(events))
    return sorted(insights, key=lambda i: i.minute)