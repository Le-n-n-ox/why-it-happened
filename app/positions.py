"""Where each player was last seen, for drawing them on the pitch.

The feed is a list of events, one point each, and only for the player who acted. It has no tracking of
players without the ball, so this module cannot say where all 22 players are at a given moment. What it
can say, honestly, is where every player who has acted was LAST SEEN, how long ago that was, the last
few places before it, and where they usually operate. Every player carries `since` so the screen can
fade old dots and never presents them as exact.

Coordinates are the event's own (x from the player's own goal line, y across), so the frontend draws
them with the same transform it already uses for event dots.
"""
from app.events import EventType, MatchEvent

FRESH = 1.0          # minutes: a player seen within this long ago is drawn solid
TRAIL = 3            # previous places kept per player
HOLDS_BALL = (EventType.PASS, EventType.CARRY)


def _spot(e: MatchEvent) -> dict:
    return {"x": round(e.x, 1), "y": round(e.y, 1), "minute": e.minute, "event": e.id, "type": e.type.value}


def positions(events: list[MatchEvent], minute: float | None = None) -> dict:
    """Last known place of every named player up to `minute` (default: the end of the data)."""
    seen = [e for e in events if e.player and (minute is None or e.minute <= minute)]
    now = minute if minute is not None else (max((e.minute for e in events), default=0.0))
    by_player: dict[tuple[str, str], list[MatchEvent]] = {}
    for e in seen:
        by_player.setdefault((e.team, e.player), []).append(e)

    ball_event = max((e for e in events if minute is None or e.minute <= minute), key=lambda e: e.minute, default=None)
    players = []
    for (team, name), acts in by_player.items():
        last = acts[-1]
        since = max(0.0, now - last.minute)
        players.append({
            "player": name, "team": team,
            **_spot(last),
            "since": round(since, 2),
            "fresh": since <= FRESH,
            "trail": [_spot(e) for e in acts[-TRAIL - 1:-1]],
            "average": {"x": round(sum(e.x for e in acts) / len(acts), 1),
                        "y": round(sum(e.y for e in acts) / len(acts), 1)},
            "actions": len(acts),
            "on_ball": ball_event is not None and last.id == ball_event.id and last.type in HOLDS_BALL,
        })
    players.sort(key=lambda p: (p["team"], p["player"]))
    ball = None
    if ball_event is not None:
        ball = {"x": round(ball_event.x, 1), "y": round(ball_event.y, 1), "team": ball_event.team,
                "player": ball_event.player, "minute": ball_event.minute, "event": ball_event.id}
    return {
        "minute": round(now, 2), "source": "events", "exact": False, "ball": ball, "players": players,
        "note": "Positions come from each player's own events, so a dot is where that player was last seen, "
                "not where they are now. Players who have not acted yet are not shown.",
    }