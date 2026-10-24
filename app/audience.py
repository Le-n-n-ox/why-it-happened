"""Audience profiles: one match, different sides of the story.

The rules find the facts once. A profile then decides which of those facts a viewer is shown, and
the model may only word what it was given:

    fan        the score, their club's mood, the goals and key moments, their player
    announcer  a timed cue sheet: what happened, when, and who to name
    analyst    the measured factors, each team's numbers and the one metric they care about
    player     one player's involvement, rating and moments across the match

Everything here is deterministic: counts over the match events and sentences the rest of the app
already computes. No model runs in this module. That is the point: the same intelligence reaches
a data-hungry analyst and a casual fan as two genuinely different payloads, and the guards in
app.narrator then stop a voice from adding facts it was never given.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.assessment import team_metrics
from app.causes import turning_points, why_they_won
from app.detectors import Insight
from app.events import EventType, MatchEvent
from app.matchinfo import match_info
from app.players import involvement, player_table
from app.tactics import match_factors, team_xg

MODES = ("fan", "analyst", "announcer", "player")

# The single metric a viewer may choose. Team metrics are shown for both teams; player metrics
# need a player and fall back to the best-rated player in the match.
METRICS = {
    "xg": "expected goals",
    "shots": "shots",
    "possession": "share of play",
    "pressing": "high turnovers",
    "tempo": "actions per minute",
    "final_third": "final-third entries",
    "goals_created": "goals created",
    "rating": "player rating",
}
PLAYER_METRICS = {"goals_created", "rating"}

# Which detector kinds a metric cares about, so a chosen metric can lift the matching moments.
METRIC_KINDS = {
    "xg": {"shot_pressure", "goal_buildup"},
    "shots": {"shot_pressure"},
    "possession": {"momentum_swing", "goal_buildup"},
    "pressing": {"high_press_turnover", "counter_attack"},
    "tempo": {"counter_attack", "turnover_shot"},
    "final_third": {"goal_buildup", "high_press_turnover"},
}

KIND_LABELS = {
    "counter_attack": "quick break",
    "turnover_shot": "turnover attack",
    "high_press_turnover": "high press",
    "goal_buildup": "patient move",
    "shot_pressure": "spell of pressure",
    "foul_turning_point": "set piece",
    "player_standout": "player standout",
    "momentum_swing": "momentum swing",
    "goal": "goal",
    "full_time": "full time",
}

# Plain phrases for a fan: no measurements, just what it looked like.
FAN_CAUSE = {
    "counter_attack": "after a lightning break",
    "turnover_shot": "after winning the ball back",
    "high_press_turnover": "after pressing high",
    "goal_buildup": "after a patient move",
    "shot_pressure": "after a spell of pressure",
    "foul_turning_point": "from a set piece",
}

_POSITIONAL = re.compile(r"(^|_)(x|y)$|distance|gain", re.IGNORECASE)


@dataclass(frozen=True)
class Profile:
    """What the viewer told us. Immutable so it can be a cache key."""

    mode: str = "fan"
    clubs: tuple[str, ...] = ()
    players: tuple[str, ...] = ()
    metric: str | None = None
    lang: str = "en"

    def as_dict(self) -> dict:
        return {"mode": self.mode, "clubs": list(self.clubs), "players": list(self.players),
                "metric": self.metric, "lang": self.lang}


@dataclass
class Resolved:
    """A profile matched against the players and teams that are actually in this match."""

    profile: Profile
    clubs: list[str]
    players: list[str]
    unknown: list[str]
    notes: list[str]
    info: dict
    table: list[dict]

    def as_dict(self) -> dict:
        return {
            **self.profile.as_dict(),
            "clubs": self.clubs,
            "players": self.players,
            "unknown": self.unknown,
            "notes": self.notes,
            "home": self.info.get("home"),
            "away": self.info.get("away"),
            "score": self.info.get("score", {}),
        }


def _split(values) -> tuple[str, ...]:
    if isinstance(values, str):
        values = [values]
    out: list[str] = []
    for value in values or ():
        for part in str(value).split(","):
            part = part.strip()
            if part and part not in out:
                out.append(part)
    return tuple(out)


def parse_profile(mode: str = "fan", club=None, player=None, metric: str | None = None,
                  lang: str = "en") -> Profile:
    """Normalise query parameters. Unknown modes and metrics fall back instead of failing."""
    chosen = (mode or "fan").strip().lower()
    if chosen not in MODES:
        chosen = "fan"
    key = (metric or "").strip().lower() or None
    if key not in METRICS:
        key = None
    return Profile(chosen, _split(club), _split(player), key, (lang or "en").strip() or "en")


def _match_name(wanted: str, choices: list[str]) -> str | None:
    key = wanted.casefold()
    exact = [choice for choice in choices if choice.casefold() == key]
    if exact:
        return exact[0]
    # A surname is enough when only one player in the match has it.
    tails = [choice for choice in choices if choice.casefold().endswith(" " + key)]
    return tails[0] if len(tails) == 1 else None


def _row(table: list[dict], name: str) -> dict | None:
    return next((row for row in table if row["name"] == name), None)


def resolve(profile: Profile, events: list[MatchEvent], found: list[Insight]) -> Resolved:
    """Match the chosen clubs and players to this match and fill in a sensible subject."""
    info = match_info(events)
    teams = [team for team in (info.get("home"), info.get("away")) if team]
    table = player_table(events, found)
    names = [row["name"] for row in table]

    clubs: list[str] = []
    players: list[str] = []
    unknown: list[str] = []
    for wanted in profile.clubs:
        hit = _match_name(wanted, teams)
        if hit and hit not in clubs:
            clubs.append(hit)
        elif not hit:
            unknown.append(wanted)
    for wanted in profile.players:
        hit = _match_name(wanted, names)
        if hit and hit not in players:
            players.append(hit)
        elif not hit:
            unknown.append(wanted)

    notes: list[str] = []
    needs_player = profile.mode == "player" or profile.metric in PLAYER_METRICS
    if needs_player and not players and table:
        pool = [row for row in table if not clubs or row["team"] in clubs] or table
        players.append(pool[0]["name"])
        notes.append(f"No player was chosen, so this view follows {pool[0]['name']}.")
    for name in unknown:
        notes.append(f"{name} is not in this match.")
    return Resolved(profile, clubs, players, unknown, notes, info, table)


def _get(row, key: str, default=None):
    """Read a field from an Insight or from a stored insight dict."""
    if isinstance(row, dict):
        return row.get(key, default)
    return getattr(row, key, default)


def _involves(insight, resolved: Resolved) -> bool:
    if not resolved.players:
        return False
    names = set((_get(insight, "facts", {}) or {}).get("players") or [])
    return any(player in names for player in resolved.players)


def rank_insights(insights, resolved: Resolved) -> list:
    """Favourite club first, then the chosen player's moments, then the chosen metric's kinds."""
    scored = []
    for insight in insights:
        involved = _involves(insight, resolved)
        if resolved.profile.mode == "player" and resolved.players and not involved:
            continue
        score = 0
        if _get(insight, "team") in resolved.clubs:
            score += 4
        if involved:
            score += 5
        if resolved.profile.metric and _get(insight, "kind") in METRIC_KINDS.get(resolved.profile.metric, set()):
            score += 2
        scored.append((score, insight))
    scored.sort(key=lambda pair: (-pair[0], -(_get(pair[1], "minute") or 0)))
    return [insight for _, insight in scored]


def metric_snapshot(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict | None:
    """The one number the viewer asked to follow, counted from this match only."""
    key = resolved.profile.metric
    if not key:
        return None
    teams = [team for team in (resolved.info.get("home"), resolved.info.get("away")) if team]
    last = max((event.minute for event in events), default=0.0) or 1.0
    values = []
    for team in teams:
        if key == "xg":
            value = round(team_xg(events, team), 2)
        elif key == "shots":
            value = sum(event.team == team and event.type in (EventType.SHOT, EventType.GOAL) for event in events)
        elif key == "possession":
            mine = sum(event.team == team for event in events)
            value = round(mine / len(events) * 100) if events else 0
        elif key == "pressing":
            value = sum(event.team == team and event.type in (EventType.TACKLE, EventType.INTERCEPTION)
                        and event.x >= 50 for event in events)
        elif key == "tempo":
            value = round(sum(event.team == team for event in events) / last, 1)
        elif key == "final_third":
            value = team_metrics(events, team)["final_third_entries"]
        else:
            value = None
        values.append({"team": team, "value": value})

    player = None
    if resolved.players:
        row = _row(resolved.table, resolved.players[0])
        if row and key in row:
            player = {"name": row["name"], "team": row["team"], "value": row[key]}
    return {
        "key": key,
        "label": METRICS[key],
        "unit": "%" if key == "possession" else "",
        "values": values,
        "player": player,
        "note": "Counted from this match's events; no tracking data is used.",
    }


def _headline(info: dict) -> str:
    home, away, score = info.get("home"), info.get("away"), info.get("score", {})
    if home and away:
        return f"{home} {score.get(home, 0)}-{score.get(away, 0)} {away}"
    return "The match"


def _mood(info: dict, club: str | None) -> str:
    if not club:
        return "neutral"
    teams = [team for team in (info.get("home"), info.get("away")) if team]
    if len(teams) < 2:
        return "neutral"
    other = teams[1] if teams[0] == club else teams[0]
    mine, theirs = info.get("score", {}).get(club, 0), info.get("score", {}).get(other, 0)
    if mine > theirs:
        return "delight"
    if mine < theirs:
        return "heartbreak"
    return "level"


def _evidence_for(events: list[MatchEvent], found: list[Insight], resolved: Resolved,
                  team: str | None = None) -> list[str]:
    ids: list[str] = []
    for reason in why_they_won(events, found)["reasons"]:
        if team is None or reason["team"] == team:
            ids += reason["evidence"]
    for insight in rank_insights(found, resolved):
        if team is None or _get(insight, "team") == team:
            ids += _get(insight, "evidence") or []
    if not ids:
        ids = [event.id for event in events if event.type == EventType.GOAL][:3]
    if not ids:
        ids = [event.id for event in events[:3]]
    return list(dict.fromkeys(ids))[:12]


def fan_brief(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict:
    """The story: the score, your club's mood, the goals and the moments. No measured numbers."""
    club = resolved.clubs[0] if resolved.clubs else None
    reasons = why_they_won(events, found)["reasons"]
    by_minute = {reason["minute"]: reason for reason in reasons}
    goals = sorted((event for event in events if event.type == EventType.GOAL),
                   key=lambda goal: (club is not None and goal.team != club, goal.minute))

    moments = []
    for goal in goals:
        reason = by_minute.get(goal.minute) or {}
        cause = FAN_CAUSE.get(reason.get("caused_by") or "", "")
        who = goal.player or goal.team
        moments.append({
            "minute": int(goal.minute),
            "team": goal.team,
            "kind": "goal",
            "what": f"{who} scored {cause}.".replace("  ", " "),
        })
    for insight in rank_insights(found, resolved):
        if _get(insight, "kind") == "goal_buildup":
            continue  # the goal line already tells this part of the story
        moments.append({
            "minute": int(_get(insight, "minute") or 0),
            "team": _get(insight, "team"),
            "kind": _get(insight, "kind"),
            "what": f"{KIND_LABELS.get(_get(insight, 'kind'), 'a key moment')} for {_get(insight, 'team')}.",
        })
    moments.sort(key=lambda moment: moment["minute"])  # the story stays in match order

    spotlight = None
    if resolved.players:
        row = _row(resolved.table, resolved.players[0])
        if row:
            moments_for_player = involvement(events, found).get(row["id"], [])
            spotlight = {
                "name": row["name"],
                "team": row["team"],
                "line": (f"{row['name']} was at the heart of {row['team']}'s best moments."
                         if row.get("key_moments") else f"{row['name']} kept working for {row['team']}."),
                "moments": [{"minute": int(moment["minute"]),
                             "what": KIND_LABELS.get(moment["kind"], "a key moment")}
                            for moment in moments_for_player[:3]],
            }

    return {
        "mode": "fan",
        "headline": _headline(resolved.info),
        "your_club": club,
        "mood": _mood(resolved.info, club),
        "story": [moment["what"] for moment in moments[:5]],
        "moments": moments[:8],
        "player_spotlight": spotlight,
        "evidence": _evidence_for(events, found, resolved, club),
    }


def analyst_brief(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict:
    """The measured side: factors, team numbers, turning points and the chosen metric."""
    factors = match_factors(events)
    if resolved.clubs:
        factors = sorted(factors, key=lambda factor: (factor["favours"] not in resolved.clubs,
                                                      -factor["weight"]))
    teams = [team for team in (resolved.info.get("home"), resolved.info.get("away")) if team]
    xg = {team: round(team_xg(events, team), 2) for team in teams}
    better = None
    if len(teams) == 2 and abs(xg[teams[0]] - xg[teams[1]]) >= 0.2:
        better = max(teams, key=lambda team: xg[team])
    other = next((team for team in teams if team != better), None)
    chance_quality = {
        "better": better,
        "xg": xg,
        "summary": (f"{better} created the better chances ({xg[better]:.2f} expected goals to "
                    f"{xg[other]:.2f})." if better and other else
                    "Both teams created chances of similar quality."),
    }
    stats = {}
    for team in teams:
        metrics = team_metrics(events, team)
        stats[team] = {
            "goals": metrics["goals"],
            "shots": metrics["shots"],
            "xg": xg[team],
            "final_third_entries": metrics["final_third_entries"],
            "entries_with_shot": metrics["entries_with_shot"],
            "high_wins": len(metrics["high_wins"]),
            "possession_pct": (round(sum(event.team == team for event in events) / len(events) * 100)
                               if events else 0),
        }
    turning = [{
        "minute": int(chain["minute"]),
        "team": chain["team"],
        "kind": chain["kind"],
        "text": chain["summary"],
        "evidence": list(chain["evidence"])[:8],
    } for chain in turning_points(events, found)]
    evidence = [event_id for factor in factors for event_id in factor["evidence"]]
    evidence += [event_id for point in turning for event_id in point["evidence"]]
    return {
        "mode": "analyst",
        "headline": _headline(resolved.info),
        "result": {"winner": why_they_won(events, found)["winner"],
                   "score": resolved.info.get("score", {})},
        "factors": [{
            "code": factor["code"],
            "title": factor["title"],
            "detail": factor["detail"],
            "team": factor["team"],
            "favours": factor["favours"],
            "weight": factor["weight"],
        } for factor in factors[:5]],
        "team_stats": stats,
        "chance_quality": chance_quality,
        "turning_points": turning,
        "metric": metric_snapshot(events, found, resolved),
        "evidence": list(dict.fromkeys(evidence))[:12] or _evidence_for(events, found, resolved),
    }


def announcer_brief(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict:
    """The timed side: what to say, when, and who to name."""
    info = resolved.info
    reasons = sorted(why_they_won(events, found)["reasons"], key=lambda reason: reason["minute"])
    goals = {goal.minute: goal for goal in events if goal.type == EventType.GOAL}
    cues = []
    for reason in reasons:
        goal = goals.get(reason["minute"])
        who = (goal.player if goal and goal.player else reason["team"])
        cause = FAN_CAUSE.get(reason.get("caused_by") or "", "")
        cues.append({
            "minute": int(reason["minute"]),
            "team": reason["team"],
            "kind": "goal",
            "say": f"Goal for {reason['team']}! {who} scores {cause}.".replace("  ", " "),
            "hold_s": 8,
            "evidence": reason["evidence"],
        })
    for insight in rank_insights(found, resolved)[:8]:
        if _get(insight, "kind") == "goal_buildup":
            continue  # the goal cue already says how the move ended
        cues.append({
            "minute": int(_get(insight, "minute") or 0),
            "team": _get(insight, "team"),
            "kind": _get(insight, "kind"),
            "say": f"{KIND_LABELS.get(_get(insight, 'kind'), 'A key moment')} for {_get(insight, 'team')}.",
            "hold_s": 5,
            "evidence": (_get(insight, "evidence") or [])[:8],
        })
    cues.sort(key=lambda cue: (cue["minute"], cue["kind"] != "goal"))

    names = list(dict.fromkeys(goal.player for goal in events
                               if goal.type == EventType.GOAL and goal.player))
    for row in resolved.table[:3]:
        if row["name"] not in names:
            names.append(row["name"])

    home, away, score = info.get("home"), info.get("away"), info.get("score", {})
    score_line = (f"{home} {score.get(home, 0)}-{score.get(away, 0)} {away}"
                  if home and away else "The match")
    turning = turning_points(events, found)
    evidence = [event_id for cue in cues for event_id in cue["evidence"]]
    return {
        "mode": "announcer",
        "headline": _headline(info),
        "score_line": score_line,
        "cues": cues[:10],
        "names": names[:6],
        "turning_point": ({"minute": int(turning[0]["minute"]), "team": turning[0]["team"],
                           "say": turning[0]["summary"]} if turning else None),
        "evidence": list(dict.fromkeys(evidence))[:12] or _evidence_for(events, found, resolved),
    }


def player_brief(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict:
    """One player's match, for a viewer who came to follow them."""
    row = _row(resolved.table, resolved.players[0]) if resolved.players else None
    if row is None:
        return {"mode": "player", "headline": _headline(resolved.info), "player": None,
                "story": ["No player is in this match yet."], "moments": [], "evidence": []}
    rows = involvement(events, found).get(row["id"], [])
    moments = [{
        "minute": int(moment["minute"]),
        "kind": moment["kind"],
        "what": f"{KIND_LABELS.get(moment['kind'], 'key moment')} for {moment['team']}.",
    } for moment in rows[:6]]
    for goal in events:
        if goal.type == EventType.GOAL and goal.player == row["name"]:
            moments.append({"minute": int(goal.minute), "kind": "goal",
                            "what": f"{row['name']} scored for {row['team']}."})
    moments.sort(key=lambda moment: moment["minute"])

    evidence = [event_id for moment in rows for event_id in moment["evidence"]]
    evidence += [goal.id for goal in events if goal.type == EventType.GOAL and goal.player == row["name"]]
    if not evidence:
        evidence = [event.id for event in events if event.player == row["name"]][:6]
    story = [f"{row['name']} ({row['team']}) rated {row['rating']} across the match."]
    if row.get("goals"):
        story.append(f"{row['name']} scored {row['goals']}.")
    if row.get("key_moments"):
        story.append(f"{row['name']} was part of {row['key_moments']} key moments.")
    return {
        "mode": "player",
        "headline": _headline(resolved.info),
        "player": {key: row.get(key) for key in (
            "name", "team", "rating", "goals", "shots", "touches", "passes", "carries",
            "tackles", "interceptions", "fouls", "progressive", "key_moments",
            "chains_involved", "goals_created")},
        "moments": moments[:8],
        "story": story,
        "metric": metric_snapshot(events, found, resolved),
        "evidence": list(dict.fromkeys(evidence))[:12] or _evidence_for(events, found, resolved),
    }


def build_brief(events: list[MatchEvent], found: list[Insight], resolved: Resolved,
                mode: str | None = None) -> dict:
    chosen = mode or resolved.profile.mode
    if chosen == "analyst":
        return analyst_brief(events, found, resolved)
    if chosen == "announcer":
        return announcer_brief(events, found, resolved)
    if chosen == "player":
        return player_brief(events, found, resolved)
    return fan_brief(events, found, resolved)


def fallback_line(mode: str, brief: dict) -> str:
    """The rules-only line when the model is down: each voice falls back to its own brief."""
    if mode == "analyst":
        parts = [brief.get("headline", "")]
        parts += [factor["detail"] for factor in brief.get("factors", [])[:3]]
        return " ".join(part for part in parts if part)
    if mode == "announcer":
        parts = [brief.get("score_line", "")]
        parts += [cue["say"] for cue in brief.get("cues", [])[:3]]
        return " ".join(part for part in parts if part)
    if mode == "player":
        return " ".join(brief.get("story") or [brief.get("headline", "The match")])
    return " ".join(brief.get("story") or [brief.get("headline", "The match")])


def _strip_citations(text: str) -> str:
    return re.sub(r"\s*\[[^\]]*\]", "", text).strip()


def _hold(text: str) -> float:
    """How long an overlay should stay up: longer text needs longer on screen."""
    return round(max(4.0, min(9.0, 3.0 + len(text) / 20.0)) * 2) / 2


def overlay_cards(events: list[MatchEvent], found: list[Insight], resolved: Resolved,
                  lang: str = "en") -> list[dict]:
    """Timed cards a renderer can put on the live feed, in match-clock order."""
    cards: list[dict] = []
    reasons = why_they_won(events, found)["reasons"]
    goals = {goal.minute: goal for goal in events if goal.type == EventType.GOAL}
    for reason in reasons:
        goal = goals.get(reason["minute"])
        cards.append({
            "id": f"goal-{goal.id if goal else int(reason['minute'])}",
            "at": round(reason["minute"], 1),
            "hold_s": 8.0,
            "kind": "goal",
            "team": reason["team"],
            "headline": "GOAL",
            "text": reason["text"],
            "evidence": reason["evidence"],
            "priority": 100 + (20 if reason["team"] in resolved.clubs else 0),
        })
    for insight in rank_insights(found, resolved):
        if _get(insight, "kind") == "goal_buildup":
            continue  # the goal card already carries the move that produced it
        narration = _get(insight, "narration") or {}
        text = (narration.get(lang) or narration.get("en") or "").strip()
        if not text:
            text = f"{KIND_LABELS.get(_get(insight, 'kind'), 'Key moment')} for {_get(insight, 'team')}."
        text = _strip_citations(text)
        cards.append({
            "id": _get(insight, "id"),
            "at": round(_get(insight, "minute") or 0, 1),
            "hold_s": _hold(text),
            "kind": _get(insight, "kind"),
            "team": _get(insight, "team"),
            "headline": KIND_LABELS.get(_get(insight, "kind"), "Key moment").upper(),
            "text": text,
            "evidence": (_get(insight, "evidence") or [])[:8],
            "priority": (50 + (20 if _get(insight, "team") in resolved.clubs else 0)
                         + (25 if _involves(insight, resolved) else 0)),
        })
    info = resolved.info
    if info.get("home") and info.get("away"):
        cards.append({
            "id": "full-time",
            "at": float(info.get("duration_min") or 90),
            "hold_s": 10.0,
            "kind": "full_time",
            "team": "",
            "headline": "FULL TIME",
            "text": _headline(info),
            "evidence": [],
            "priority": 90,
        })
    cards.sort(key=lambda card: (card["at"], -card["priority"]))
    return cards


def brief_payload(events: list[MatchEvent], found: list[Insight], resolved: Resolved) -> dict:
    return {
        "profile": resolved.as_dict(),
        "match": {"home": resolved.info.get("home"), "away": resolved.info.get("away"),
                  "score": resolved.info.get("score", {}),
                  "minute": resolved.info.get("duration_min", 0)},
        "brief": build_brief(events, found, resolved),
        "metric": metric_snapshot(events, found, resolved),
        "ranked": [{"id": _get(insight, "id"), "kind": _get(insight, "kind"),
                    "team": _get(insight, "team"), "minute": _get(insight, "minute"),
                    "evidence": (_get(insight, "evidence") or [])[:8]}
                   for insight in rank_insights(found, resolved)[:12]],
        "note": ("Every line is counted from this match's events. The model only words the brief for "
                 "the chosen mode; a fan never receives the analyst's numbers and an analyst never "
                 "receives the fan's story in place of them."),
    }


def overlay_payload(events: list[MatchEvent], found: list[Insight], resolved: Resolved,
                    lang: str = "en") -> dict:
    return {
        "profile": resolved.as_dict(),
        "match": {"home": resolved.info.get("home"), "away": resolved.info.get("away"),
                  "score": resolved.info.get("score", {})},
        "metric": metric_snapshot(events, found, resolved),
        "timing": {
            "unit": "match_minute",
            "clock": "the same clock the stream replays",
            "lead_s": 1.0,
            "default_hold_s": 6.0,
            "note": "Show each card at `at` on the match clock, `lead_s` early, for `hold_s` seconds.",
        },
        "cards": overlay_cards(events, found, resolved, lang),
    }
