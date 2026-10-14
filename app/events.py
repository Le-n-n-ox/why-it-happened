"""Our internal event schema, plus the ONE place that knows the official data format.

When the official synthetic data format is known, only from_official() changes.
Everything else in the app works with MatchEvent.
"""
import json
from enum import Enum
from pathlib import Path

from pydantic import BaseModel


class EventType(str, Enum):
    PASS = "pass"
    CARRY = "carry"
    SHOT = "shot"
    GOAL = "goal"
    TACKLE = "tackle"
    INTERCEPTION = "interception"
    FOUL = "foul"


class MatchEvent(BaseModel):
    id: str                  # unique; used as evidence in every insight
    minute: float            # match clock in minutes, e.g. 12.5 = 12m30s
    team: str
    player: str | None = None
    type: EventType
    x: float                 # 0-100 along the pitch, 0 = the team's own goal line
    y: float                 # 0-100 across the pitch
    outcome: str | None = None


def from_official(raw: dict) -> MatchEvent:
    """TODO: map one record of the official synthetic feed to a MatchEvent.

    Until the official format is known this assumes our own field names.
    """
    return MatchEvent(**raw)


def load_events(path: str | Path) -> list[MatchEvent]:
    records = json.loads(Path(path).read_text())
    return [from_official(r) for r in records]
