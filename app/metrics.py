"""Derived physical metrics from event and tracking feeds.

The event feed does not contain a ball or player speed sensor. This module turns the
positions and clocks we do have into honest, reproducible estimates:

* pass distance and pass completion from the event's end location (or the next touch);
* a pass-difficulty score from distance, angle change and pressure;
* ball speed from the distance between two touches and the time between them;
* player distance from carries and from tracking frames.

Every estimate carries the field name that says what it is. Nothing here invents a
number when the feed gives us no way to compute it.
"""
from __future__ import annotations

import math

from app.events import EventType, MatchEvent

PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M = 68.0

# Thresholds a renderer can use for "speed and distance indicators".
SPRINT_KPH = 25.0
BALL_SPEED_KPH = 100.0
SHOT_SPEED_KPH = 110.0
DISTANCE_MILESTONES_M = (1000, 5000, 10000)

LONG_PASS_M = 30.0
DIFFICULT_PASS = 0.55
VERY_DIFFICULT_PASS = 0.75

_SUCCESS = {"complete", "completed", "success", "successful", "won", "retained"}
_FAILURE = {"incomplete", "unsuccessful", "lost", "failed", "fail"}
_TOUCH_TYPES = {EventType.PASS, EventType.CARRY, EventType.SHOT, EventType.GOAL,
                EventType.TACKLE, EventType.INTERCEPTION, EventType.FOUL}


def pitch_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Metres between two 0-100 pitch points (pitch taken as 105 x 68 m)."""
    dx = (float(x2) - float(x1)) * PITCH_LENGTH_M / 100.0
    dy = (float(y2) - float(y1)) * PITCH_WIDTH_M / 100.0
    return math.hypot(dx, dy)


def in_box(x: float, y: float) -> bool:
    return x >= 83 and 21 <= y <= 79


def _next_touch(events: list[MatchEvent], index: int) -> tuple[int, MatchEvent] | None:
    """The next real touch, skipping possession/pressure annotations in between."""
    for next_index in range(index + 1, len(events)):
        if events[next_index].type in _TOUCH_TYPES:
            return next_index, events[next_index]
    return None


def _end(events: list[MatchEvent], index: int) -> tuple[float, float] | None:
    """The end of a pass or carry: the feed's end location, else the next same-team touch."""
    event = events[index]
    if event.end_x is not None and event.end_y is not None:
        return (float(event.end_x), float(event.end_y))
    if event.type in (EventType.PASS, EventType.CARRY):
        nxt = _next_touch(events, index)
        if nxt and nxt[1].team == event.team:
            return (float(nxt[1].x), float(nxt[1].y))
    return None


def _angle_change(events: list[MatchEvent], index: int,
                  end: tuple[float, float] | None) -> float:
    """How sharply the ball changed direction, in radians (0 = straight on)."""
    if end is None:
        return 0.0
    event = events[index]
    before = 0.0
    if index > 0:
        prev = events[index - 1]
        if prev.team == event.team:
            before = math.atan2((event.y - prev.y) * PITCH_WIDTH_M / 100.0,
                                (event.x - prev.x) * PITCH_LENGTH_M / 100.0)
    after = math.atan2((end[1] - event.y) * PITCH_WIDTH_M / 100.0,
                       (end[0] - event.x) * PITCH_LENGTH_M / 100.0)
    delta = abs(after - before)
    while delta > math.pi:
        delta = abs(delta - 2 * math.pi)
    return delta


def _outcome_accuracy(event: MatchEvent) -> float | None:
    """Read the feed's own completion flag when it has one."""
    if event.pass_accuracy is not None:
        return 1.0 if float(event.pass_accuracy) >= 0.5 else 0.0
    if not event.outcome:
        return None
    text = str(event.outcome).strip().casefold()
    if text in _SUCCESS:
        return 1.0
    if text in _FAILURE:
        return 0.0
    return None


def pass_metrics(events: list[MatchEvent], index: int) -> dict | None:
    """Distance, completion and difficulty for one pass. None for non-passes."""
    event = events[index]
    if event.type != EventType.PASS:
        return None

    end = _end(events, index)
    distance = round(pitch_distance(event.x, event.y, *end), 1) if end else None
    nxt = _next_touch(events, index)

    accuracy = _outcome_accuracy(event)
    if accuracy is None:
        accuracy = 1.0 if nxt is not None and nxt[1].team == event.team else 0.0

    pressure = min(1.0, max(0.0, float(event.pressure or 0.0)))
    angle = _angle_change(events, index, end)
    progressive = bool(end and end[0] - event.x >= 15)
    into_box = bool(end and in_box(*end))

    # A long, angled pass under pressure is the hardest. A short square pass is routine.
    distance_part = min(1.0, (distance or 0.0) / 45.0)
    angle_part = min(1.0, angle / math.pi)
    difficulty = (0.50 * distance_part + 0.25 * angle_part + 0.20 * pressure
                  + 0.05 * (1.0 if into_box else 0.0) + (0.05 if progressive else 0.0))
    difficulty = round(min(1.0, difficulty), 2)

    return {
        "distance_m": distance,
        "accuracy": accuracy,
        "difficulty": difficulty,
        "difficulty_rating": difficulty_rating(difficulty),
        "angle_change": round(angle, 2),
        "progressive": progressive,
        "into_box": into_box,
    }


def difficulty_rating(score: float | None) -> str:
    if score is None:
        return "unknown"
    if score >= VERY_DIFFICULT_PASS:
        return "very_difficult"
    if score >= DIFFICULT_PASS:
        return "difficult"
    if score >= 0.30:
        return "routine"
    return "easy"


def _ball_speed(events: list[MatchEvent], index: int,
                end: tuple[float, float] | None) -> float | None:
    """Average ball speed between this touch and the next real touch, in km/h."""
    if end is None:
        return None
    nxt = _next_touch(events, index)
    if nxt is None:
        return None
    seconds = (nxt[1].minute - events[index].minute) * 60.0
    if seconds <= 0:
        return None
    speed = pitch_distance(events[index].x, events[index].y, *end) / seconds * 3.6
    if 0 < speed <= 180:
        return round(speed, 1)
    return None


def enrich_events(events: list[MatchEvent]) -> list[MatchEvent]:
    """Return copies with the derived fields the API and the UI can render.

    The original events are left untouched: the feed is still the source of truth.
    """
    enriched: list[MatchEvent] = []
    for index, event in enumerate(events):
        end = _end(events, index)
        updates: dict = {}

        if event.end_x is None and end is not None:
            updates["end_x"], updates["end_y"] = round(end[0], 2), round(end[1], 2)

        if event.type == EventType.PASS:
            metrics = pass_metrics(events, index) or {}
            if event.pass_distance_m is None:
                updates["pass_distance_m"] = metrics.get("distance_m")
            if event.pass_accuracy is None:
                updates["pass_accuracy"] = metrics.get("accuracy")
            if event.pass_difficulty is None:
                updates["pass_difficulty"] = metrics.get("difficulty")
            if event.ball_speed_kph is None:
                updates["ball_speed_kph"] = _ball_speed(events, index, end)
        elif event.type == EventType.CARRY:
            if end is not None and event.distance_m is None:
                updates["distance_m"] = round(pitch_distance(event.x, event.y, *end), 1)
            if event.ball_speed_kph is None:
                updates["ball_speed_kph"] = _ball_speed(events, index, end)
        elif event.type in (EventType.SHOT, EventType.GOAL):
            # A shot's speed is only real when the feed or the tracking adapter sends it.
            if event.ball_speed_kph is None and event.shot_speed_kph is not None:
                updates["ball_speed_kph"] = event.shot_speed_kph

        enriched.append(event.model_copy(update=updates) if updates else event)
    return enriched


def distance_covered(events: list[MatchEvent], team: str | None = None) -> float:
    return round(sum(float(e.distance_m or 0.0) for e in events
                     if team is None or e.team == team), 1)


def top_speed(events: list[MatchEvent], team: str | None = None) -> float:
    values = [float(e.player_speed_kph) for e in events
              if (team is None or e.team == team) and e.player_speed_kph is not None]
    return round(max(values), 1) if values else 0.0


def pass_accuracy(events: list[MatchEvent], team: str | None = None) -> int:
    passes = [e for e in events if e.type == EventType.PASS
              and (team is None or e.team == team)]
    if not passes:
        return 0
    completed = sum(1 for e in passes
                    if e.pass_accuracy is not None and float(e.pass_accuracy) >= 0.5)
    return int(round(completed / len(passes) * 100))


def speed_summary(events: list[MatchEvent]) -> dict:
    return {
        "top_speed_kph": top_speed(events),
        "max_ball_speed_kph": round(max((float(e.ball_speed_kph) for e in events
                                         if e.ball_speed_kph is not None), default=0.0), 1),
        "max_shot_speed_kph": round(max((float(e.shot_speed_kph) for e in events
                                         if e.shot_speed_kph is not None), default=0.0), 1),
        "distance_m": distance_covered(events),
    }
