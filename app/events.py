"""Our internal event schema, plus the ONE place that knows the official data format.

When the official synthetic data format is known, only from_official() changes.
Everything else in the app works with MatchEvent.
"""
import json
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class EventType(str, Enum):
    PASS = "pass"
    CARRY = "carry"
    SHOT = "shot"
    GOAL = "goal"
    TACKLE = "tackle"
    INTERCEPTION = "interception"
    FOUL = "foul"
    POSSESSION = "possession"      # an explicit possession change in the feed
    PRESSURE = "pressure"          # an explicit pressure event in the feed


from app.adapter import TYPE_MAP, normalise_xy


class MatchMetadata(BaseModel):
    """Facts about the match that are not tied to one event."""

    home: str | None = None
    away: str | None = None
    competition: str | None = None
    season: str | None = None
    venue: str | None = None
    kickoff: str | None = None
    weather: str | None = None
    pitch_length_m: float = 105.0
    pitch_width_m: float = 68.0
    source: str | None = None
    extra: dict = Field(default_factory=dict)


class MatchEvent(BaseModel):
    id: str                  # unique; used as evidence in every insight
    minute: float            # match clock in minutes, e.g. 12.5 = 12m30s
    team: str
    player: str | None = None
    type: EventType
    x: float                 # 0-100 along the pitch, 0 = the team's own goal line
    y: float                 # 0-100 across the pitch
    outcome: str | None = None

    # Optional physical fields. They are present when the feed or the tracking adapter
    # supplies them, and are derived from event locations where that is honest.
    end_x: float | None = None
    end_y: float | None = None
    pass_distance_m: float | None = None
    pass_accuracy: float | None = None       # 1.0 completed, 0.0 not completed
    pass_difficulty: float | None = None     # 0 easy .. 1 very difficult
    ball_speed_kph: float | None = None
    shot_speed_kph: float | None = None
    player_speed_kph: float | None = None
    distance_m: float | None = None          # distance the player covered on this action
    pressure: float | None = None            # 0 none .. 1 intense
    period: int | None = None
    metadata: dict = Field(default_factory=dict)


def _float(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _end_xy(raw: dict, attacks_right: bool) -> tuple[float | None, float | None]:
    end_x = raw.get("end_x")
    end_y = raw.get("end_y")
    if end_x is None or end_y is None:
        end = raw.get("end_location")
        if isinstance(end, (list, tuple)) and len(end) >= 2:
            end_x, end_y = end[0], end[1]
        else:
            block = raw.get("pass") or raw.get("carry") or {}
            if isinstance(block, dict):
                end = block.get("end_location")
                if isinstance(end, (list, tuple)) and len(end) >= 2:
                    end_x, end_y = end[0], end[1]
    if end_x is None or end_y is None:
        return None, None
    if "period" in raw:
        x, y = normalise_xy(end_x, end_y, 120.0, 80.0, attacks_right)
    else:
        x, y = float(end_x), float(end_y)
    return round(x, 2), round(y, 2)


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
        attacks_right = True
        x, y = float(raw["x"]), float(raw["y"])

    end_x, end_y = _end_xy(raw, attacks_right)
    return MatchEvent(
        id=str(raw["id"]),
        minute=float(raw["minute"]),
        team=team,
        player=raw.get("player"),
        type=TYPE_MAP.get(raw["type"]) or EventType(raw["type"]),     # lookup first: the fallback raises,
        x=x,
        y=y,
        outcome=raw.get("outcome"),
        end_x=end_x,
        end_y=end_y,
        pass_distance_m=_float(raw.get("pass_distance_m")),
        pass_accuracy=_float(raw.get("pass_accuracy")),
        pass_difficulty=_float(raw.get("pass_difficulty")),
        ball_speed_kph=_float(raw.get("ball_speed_kph")),
        shot_speed_kph=_float(raw.get("shot_speed_kph")),
        player_speed_kph=_float(raw.get("player_speed_kph")),
        distance_m=_float(raw.get("distance_m")),
        pressure=_float(raw.get("pressure")),
        period=int(raw["period"]) if raw.get("period") is not None else None,
        metadata=raw.get("metadata") or {},
    )


def load_match(path: str | Path) -> tuple[list[MatchEvent], dict]:
    """Load a match file, returning its events and its metadata.

    A match file is either a list of events (the original shape) or an object with
    `events` and `metadata`. Both are accepted, so old files keep working.
    """
    data = json.loads(Path(path).read_text())
    if isinstance(data, dict):
        records = data.get("events") or []
        metadata = dict(data.get("metadata") or {})
        metadata.update({key: value for key, value in data.items()
                         if key not in ("events", "metadata")})
    else:
        records = data
        metadata = {}

    seen: set[str] = set()
    events: list[MatchEvent] = []
    for record in records:
        event = from_official(record)
        if event.id in seen:
            continue
        seen.add(event.id)
        events.append(event)
    if len(events) != len(records):
        print(f"[DEBUG] {path}: dropped {len(records) - len(events)} events with repeated ids")
    return sorted(events, key=lambda event: event.minute), metadata


def load_events(path: str | Path) -> list[MatchEvent]:
    """Load just the events from a match file (the original public helper)."""
    return load_match(path)[0]
