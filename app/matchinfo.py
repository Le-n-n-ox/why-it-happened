"""Facts about the whole match, computed from events only (no model involved)."""
import math

from app.events import EventType, MatchEvent


def teams_from(events: list[MatchEvent]) -> list[str]:
    seen: list[str] = []
    for e in events:
        if e.team not in seen:
            seen.append(e.team)
    return seen


def score_from(events: list[MatchEvent]) -> dict[str, int]:
    score = {t: 0 for t in teams_from(events)}
    for e in events:
        if e.type == EventType.GOAL:
            score[e.team] += 1
    return score


def match_info(events: list[MatchEvent]) -> dict:
    teams = teams_from(events)
    return {"home": teams[0] if teams else None, "away": teams[1] if len(teams) > 1 else None,
            "duration_min": math.ceil(max((e.minute for e in events), default=0)),
            "events": len(events), "score": score_from(events)}
