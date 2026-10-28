"""Convert StatsBomb open data into our MatchEvent format, plus the facts we validate against.

StatsBomb events are on a 120 x 80 pitch, and each event is drawn from the point of view of the team
that performed it (that team attacks towards x = 120). That is the same idea as our own convention
(x measured from the team's own goal line), so we only rescale to 0-100 and never flip.
scripts/validate_on_statsbomb.py checks this assumption: real shots must land near x = 100.

Works with both shapes of the data: the raw nested JSON from GitHub, and statsbombpy's flattened
dictionaries (`pass_outcome`, `shot_statsbomb_xg`, ...).
"""
from app.events import EventType, MatchEvent

SUCCESS = {"Won", "Success", "Success In Play", "Success Out"}
MAX_PERIOD = 4           # periods 1-2 are normal time, 3-4 extra time; 5 is a shoot-out and is ignored


def _name(value):
    """StatsBomb stores many fields as {"id": 1, "name": "Pass"}; the flattened form is just the name."""
    return value.get("name") if isinstance(value, dict) else value


def _field(raw: dict, group: str, key: str):
    """raw["pass"]["outcome"] in the nested form, raw["pass_outcome"] in the flattened form."""
    block = raw.get(group)
    if isinstance(block, dict):
        return block.get(key)
    return raw.get(f"{group}_{key}")


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _kind(raw: dict) -> tuple[EventType | None, str | None]:
    """Which of our event types this is, and its outcome text. (None, None) means: ignore it."""
    kind = _name(raw.get("type"))
    if kind == "Pass":
        return EventType.PASS, _name(_field(raw, "pass", "outcome")) or "complete"
    if kind == "Carry":
        return EventType.CARRY, None
    if kind == "Shot":
        outcome = _name(_field(raw, "shot", "outcome"))
        return (EventType.GOAL if outcome == "Goal" else EventType.SHOT), outcome
    if kind == "Interception":
        outcome = _name(_field(raw, "interception", "outcome"))
        return (EventType.INTERCEPTION, outcome) if outcome in SUCCESS else (None, None)
    if kind == "Duel":                              # only a won tackle is a ball win for us
        if _name(_field(raw, "duel", "type")) != "Tackle":
            return None, None
        outcome = _name(_field(raw, "duel", "outcome"))
        return (EventType.TACKLE, outcome) if outcome in SUCCESS else (None, None)
    if kind == "Foul Committed":
        return EventType.FOUL, None
    return None, None


def from_statsbomb(raw: dict, minute: float | None = None) -> MatchEvent | None:
    """One StatsBomb event to a MatchEvent, or None when it is not one of our seven kinds."""
    location = raw.get("location")
    if not location or int(raw.get("period", 1)) > MAX_PERIOD:
        return None
    etype, outcome = _kind(raw)
    if etype is None:
        return None
    clock = minute if minute is not None else raw.get("minute", 0) + raw.get("second", 0) / 60
    return MatchEvent(
        id=f"s{raw['index']}",
        minute=round(float(clock), 3),
        team=_name(raw.get("team")),
        player=_name(raw.get("player")),
        type=etype,
        x=_clamp(location[0] / 120 * 100),
        y=_clamp(location[1] / 80 * 100),
        outcome=outcome,
    )


def _formation(value) -> str | None:
    """StatsBomb writes 4231 for 4-2-3-1."""
    return "-".join(str(value)) if value else None


def load_statsbomb(raw_events: list[dict]) -> tuple[list[MatchEvent], dict]:
    """A whole match: our events in play order, and the context used for validation."""
    ordered = sorted(raw_events, key=lambda r: (int(r.get("period", 1)), int(r["index"])))
    events: list[MatchEvent] = []
    xg: dict[str, float] = {}
    formations: dict[str, str] = {}
    shifts: list[dict] = []
    last_minute = 0.0
    second_half_start = None

    for raw in ordered:
        kind = _name(raw.get("type"))
        team = _name(raw.get("team"))
        clock = raw.get("minute", 0) + raw.get("second", 0) / 60
        if int(raw.get("period", 1)) == 2 and second_half_start is None:
            second_half_start = clock
        tactics = raw.get("tactics")
        if kind == "Starting XI" and isinstance(tactics, dict):
            formations[team] = _formation(tactics.get("formation"))
        elif kind == "Tactical Shift" and isinstance(tactics, dict):
            shifts.append({"team": team, "minute": round(clock, 1),
                           "formation": _formation(tactics.get("formation"))})
        # Stoppage time in the first half has a clock above 45 that period 2 then repeats, so never go backwards.
        last_minute = max(last_minute, clock)
        event = from_statsbomb(raw, minute=last_minute)
        if event is None:
            continue
        events.append(event)
        value = _field(raw, "shot", "statsbomb_xg")
        if value is not None:
            xg[event.id] = float(value)

    teams = list(dict.fromkeys(e.team for e in events))
    score = {t: sum(e.type == EventType.GOAL and e.team == t for e in events) for t in teams}
    context = {"teams": teams, "score": score, "formations": formations, "shifts": shifts,
               "xg": xg, "second_half_start": second_half_start,
               "source": "StatsBomb Open Data (credit StatsBomb when you show it)"}
    return events, context