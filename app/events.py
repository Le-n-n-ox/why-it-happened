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


from app.adapter import TYPE_MAP, normalise_xy


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
    """Maps one record of the official feed to a MatchEvent using the adapter."""
    team = raw["team"]
    if "period" in raw:
        # Official feed: 120x80 pitch, absolute direction.
        period = raw["period"]
        attacks_right = (period == 1 and team == "Reds") or (period == 2 and team == "Blues")
        x, y = normalise_xy(raw["x"], raw["y"], 120.0, 80.0, attacks_right)
    else:
        # Our own files are already 0-100 from each team's own goal line.
        x, y = float(raw["x"]), float(raw["y"])

    return MatchEvent(
        id=str(raw["id"]),
        minute=float(raw["minute"]),
        team=team,
        player=raw.get("player"),
        type=TYPE_MAP.get(raw["type"], EventType(raw["type"])),
        x=x,
        y=y,
        outcome=raw.get("outcome")
    )


def load_events(path: str | Path) -> list[MatchEvent]:
    records = json.loads(Path(path).read_text())
    return [from_official(r) for r in records]
