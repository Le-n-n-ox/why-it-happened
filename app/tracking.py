"""Auto-eventing boundary for a tracking or video feed.

A computer-vision model (or a tracking provider) turns video into frames of player and
ball positions. This module is the adapter between those frames and our event feed:

* it measures ball speed and player speed from consecutive frames;
* it emits pass / carry / shot events from the motion, or from an `event_hint` sent by
  the upstream detector;
* it emits pressure events when a player closes on the ball at sprint speed;
* it returns the same `MatchEvent` shape the rest of the app already understands.

The vision model itself is deliberately outside this repo: this is the production
boundary where a detector plugs in. A tracking provider that already classifies events
can send `event_hint` and get exact event types with measured speeds.
"""
from __future__ import annotations

from math import hypot

from pydantic import BaseModel, Field

from app.events import EventType, MatchEvent
from app.metrics import BALL_SPEED_KPH, SHOT_SPEED_KPH, SPRINT_KPH, pitch_distance

_HINTS = {
    "pass": EventType.PASS,
    "carry": EventType.CARRY,
    "shot": EventType.SHOT,
    "goal": EventType.GOAL,
    "tackle": EventType.TACKLE,
    "interception": EventType.INTERCEPTION,
    "foul": EventType.FOUL,
    "possession": EventType.POSSESSION,
    "pressure": EventType.PRESSURE,
}


class TrackingPoint(BaseModel):
    x: float
    y: float


class TrackingPlayer(TrackingPoint):
    id: str
    name: str | None = None
    team: str
    speed_kph: float | None = None


class TrackingFrame(BaseModel):
    timestamp_s: float
    period: int = 1
    ball: TrackingPoint | None = None
    players: list[TrackingPlayer] = Field(default_factory=list)
    event_hint: str | None = None       # optional classification from the upstream model
    player_id: str | None = None        # optional: who the event belongs to
    team: str | None = None             # optional: override the nearest player's team
    metadata: dict = Field(default_factory=dict)


class TrackingBatch(BaseModel):
    frames: list[TrackingFrame]
    home: str | None = None
    away: str | None = None
    metadata: dict = Field(default_factory=dict)


def _nearest(players: list[TrackingPlayer], point: TrackingPoint | None) -> TrackingPlayer | None:
    if point is None or not players:
        return None
    return min(players, key=lambda p: hypot(p.x - point.x, p.y - point.y))


def _speed(a: TrackingPlayer, b: TrackingPlayer, seconds: float) -> float | None:
    if seconds <= 0:
        return None
    speed = pitch_distance(a.x, a.y, b.x, b.y) / seconds * 3.6
    return round(speed, 1) if 0 < speed <= 45 else None


def _pressure(players: list[TrackingPlayer], ball: TrackingPoint | None,
              team: str | None) -> float:
    """How close the nearest opponent is to the ball, 0 (free) to 1 (swarmed)."""
    if ball is None:
        return 0.0
    opponents = [p for p in players if p.team != team]
    if not opponents:
        return 0.0
    nearest = min(hypot(p.x - ball.x, p.y - ball.y) for p in opponents)
    return round(max(0.0, min(1.0, 1.0 - nearest / 10.0)), 2)


def _event_from_hint(hint: str | None) -> EventType | None:
    if not hint:
        return None
    return _HINTS.get(str(hint).strip().lower())


def frames_to_events(batch: TrackingBatch, min_gap_s: float = 1.5,
                     min_move_m: float = 2.0) -> tuple[list[MatchEvent], dict]:
    """Turn tracking frames into events plus a physical summary."""
    frames = sorted(batch.frames, key=lambda frame: frame.timestamp_s)
    if not frames:
        return [], {"frames": 0, "events": 0, "source": "tracking"}

    teams = list(dict.fromkeys(p.team for frame in frames for p in frame.players))
    home = batch.home or (teams[0] if teams else None)
    away = batch.away or (teams[1] if len(teams) > 1 else None)
    events: list[MatchEvent] = []
    player_distance: dict[str, float] = {}
    last_emit = -1e9
    last_pressure = -1e9
    max_ball_speed = 0.0
    max_shot_speed = 0.0

    for index in range(1, len(frames)):
        prev, curr = frames[index - 1], frames[index]
        seconds = curr.timestamp_s - prev.timestamp_s
        if seconds <= 0:
            continue

        # Distance covered by each player between the two frames.
        prev_by_id = {p.id: p for p in prev.players}
        for player in curr.players:
            before = prev_by_id.get(player.id)
            if before is not None:
                player_distance[player.id] = (player_distance.get(player.id, 0.0)
                                              + pitch_distance(before.x, before.y, player.x, player.y))

        if prev.ball is None or curr.ball is None:
            continue

        move = pitch_distance(prev.ball.x, prev.ball.y, curr.ball.x, curr.ball.y)
        ball_speed = round(move / seconds * 3.6, 1)
        max_ball_speed = max(max_ball_speed, ball_speed)
        prev_near = _nearest(prev.players, prev.ball)
        curr_near = _nearest(curr.players, curr.ball)

        player_speed = None
        if prev_near and curr_near and prev_near.id == curr_near.id:
            player_speed = _speed(prev_near, curr_near, seconds)
        elif prev_near and curr_near:
            player_speed = max(prev_near.speed_kph or 0.0, curr_near.speed_kph or 0.0) or None
        if player_speed is None and prev_near is not None:
            player_speed = prev_near.speed_kph

        kind = _event_from_hint(curr.event_hint or prev.event_hint)
        if kind is None:
            # The fallback classifier only fires on unmistakable motion: a shot-speed ball
            # in the final third, or a fast ball that changes player.
            if ball_speed >= SHOT_SPEED_KPH and curr.ball.x >= 75:
                kind = EventType.SHOT
            elif (ball_speed >= BALL_SPEED_KPH and prev_near and curr_near
                  and prev_near.team != curr_near.team):
                kind = EventType.PASS
            elif (ball_speed >= 60 and prev_near and curr_near
                  and prev_near.id != curr_near.id):
                kind = EventType.PASS

        if (kind is not None and move >= min_move_m
                and curr.timestamp_s - last_emit >= min_gap_s):
            team = curr.team or (prev_near.team if prev_near else (home or ""))
            player = (curr.player_id or (prev_near.name if prev_near else None)
                      or (prev_near.id if prev_near else None))
            accuracy = None
            if kind == EventType.PASS and prev_near and curr_near:
                accuracy = 1.0 if prev_near.team == curr_near.team else 0.0
            shot_speed = ball_speed if kind in (EventType.SHOT, EventType.GOAL) else None
            if shot_speed is not None:
                max_shot_speed = max(max_shot_speed, shot_speed)
            events.append(MatchEvent(
                id=f"trk-{int(curr.timestamp_s * 1000)}-{kind.value}",
                minute=round(curr.timestamp_s / 60.0, 3),
                team=team,
                player=player,
                type=kind,
                x=round(prev.ball.x, 2),
                y=round(prev.ball.y, 2),
                end_x=round(curr.ball.x, 2),
                end_y=round(curr.ball.y, 2),
                outcome="complete" if accuracy == 1.0 else "incomplete" if accuracy == 0.0 else None,
                pass_distance_m=round(move, 1) if kind == EventType.PASS else None,
                pass_accuracy=accuracy,
                ball_speed_kph=ball_speed,
                shot_speed_kph=shot_speed,
                player_speed_kph=player_speed,
                distance_m=round(move, 1) if kind == EventType.CARRY else 0.0,
                pressure=_pressure(curr.players, curr.ball, team),
                period=curr.period,
                metadata={"source": "tracking", "auto_event": True},
            ))
            last_emit = curr.timestamp_s

        # A sprint close to the ball is a pressure event, even if no touch followed.
        if (curr_near is not None and curr_near.speed_kph is not None
                and curr_near.speed_kph >= SPRINT_KPH
                and curr.timestamp_s - last_pressure >= 3.0
                and hypot(curr_near.x - curr.ball.x, curr_near.y - curr.ball.y) <= 5.0):
            before = prev_by_id.get(curr_near.id)
            step = (pitch_distance(before.x, before.y, curr_near.x, curr_near.y)
                    if before is not None else 0.0)
            events.append(MatchEvent(
                id=f"trk-{int(curr.timestamp_s * 1000)}-pressure",
                minute=round(curr.timestamp_s / 60.0, 3),
                team=curr_near.team,
                player=curr_near.name or curr_near.id,
                type=EventType.PRESSURE,
                x=round(curr_near.x, 2),
                y=round(curr_near.y, 2),
                player_speed_kph=curr_near.speed_kph,
                distance_m=round(step, 1),
                pressure=1.0,
                period=curr.period,
                metadata={"source": "tracking", "auto_event": True},
            ))
            last_pressure = curr.timestamp_s

    events.sort(key=lambda event: event.minute)
    summary = {
        "frames": len(frames),
        "events": len(events),
        "home": home,
        "away": away,
        "top_speed_kph": round(max((p.speed_kph or 0.0 for frame in frames
                                    for p in frame.players), default=0.0), 1),
        "distance_m": round(sum(player_distance.values()), 1),
        "max_ball_speed_kph": round(max_ball_speed, 1),
        "max_shot_speed_kph": round(max_shot_speed, 1),
        "source": "tracking",
        "note": ("Speeds and distances are measured between tracking frames. Event types are "
                 "taken from the upstream detector's `event_hint` when present, otherwise from "
                 "the motion thresholds."),
    }
    return events, summary
