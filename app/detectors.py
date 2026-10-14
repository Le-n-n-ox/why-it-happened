"""Rule-based pattern detection. Deterministic, testable, explainable.

To add a detector: write a function  list[MatchEvent] -> list[Insight]  and
add it to DETECTORS at the bottom.
"""
from dataclasses import asdict, dataclass, field

from app.events import EventType, MatchEvent


@dataclass
class Insight:
    kind: str                                   # e.g. "counter_attack"
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


DETECTORS = [detect_counter_attacks]


def detect_all(events: list[MatchEvent]) -> list[Insight]:
    insights: list[Insight] = []
    for detector in DETECTORS:
        insights.extend(detector(events))
    return sorted(insights, key=lambda i: i.minute)
