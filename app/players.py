"""Player statistics and event-grounded match explanations."""
from collections import Counter, defaultdict
import re
import unicodedata

from app.causes import chain_for, explain_event
from app.detectors import Insight
from app.events import EventType, MatchEvent


def _slug_part(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def slug(team: str, name: str) -> str:
    return f"{_slug_part(team)}-{_slug_part(name)}"


def join_names(names: list[str]) -> str:
    unique = list(dict.fromkeys(names))
    if len(unique) < 2:
        return unique[0] if unique else ""
    if len(unique) == 2:
        return f"{unique[0]} and {unique[1]}"
    return f"{', '.join(unique[:-1])} and {unique[-1]}"


def _event_kind(event: MatchEvent) -> str:
    return event.type.value


def _chain_roles(events: list[MatchEvent], insights: list[Insight]) -> dict[str, dict]:
    """player id -> the causal chains they started, finished, or were part of."""
    by_id = {e.id: e for e in events}
    roles: dict[str, dict] = defaultdict(lambda: {"started": [], "finished": [], "involved": []})
    for insight in insights:
        chain = chain_for(events, insight)
        if not chain:
            continue
        steps = [by_id[i] for i in insight.evidence if i in by_id]
        seen: set[str] = set()
        for position, event in enumerate(steps):
            if not event.player:
                continue
            pid = slug(event.team, event.player)
            if position == 0:
                roles[pid]["started"].append(chain)
            if position == len(steps) - 1:
                roles[pid]["finished"].append(chain)
            if pid not in seen:
                roles[pid]["involved"].append(chain)
                seen.add(pid)
    return roles


def player_stats(events: list[MatchEvent], insights: list[Insight]) -> dict[str, dict]:
    by_name: dict[str, list[MatchEvent]] = defaultdict(list)
    for event in events:
        if event.player:
            by_name[event.player].append(event)
    rows = {}
    roles = _chain_roles(events, insights)
    for name, records in by_name.items():
        counts = Counter(_event_kind(event) for event in records)
        goals = [event for event in records if event.type == EventType.GOAL]
        related = [insight for insight in insights
                   if name in (insight.facts or {}).get("players", [])]
        rows[slug(records[0].team, name)] = {
            "id": slug(records[0].team, name),
            "name": name,
            "team": records[0].team,
            "touches": len(records),
            "passes": counts["pass"],
            "carries": counts["carry"],
            "shots": counts["shot"] + counts["goal"],
            "goals": counts["goal"],
            "tackles": counts["tackle"],
            "interceptions": counts["interception"],
            "fouls": counts["foul"],
            "progressive": sum(e.x >= 60 for e in records
                                if e.type in (EventType.PASS, EventType.CARRY)),
            "goal_minutes": [int(e.minute) for e in goals],
            "key_moments": len(related),
            "chains_started": len(roles[slug(records[0].team, name)]["started"]),
            "chains_finished": len(roles[slug(records[0].team, name)]["finished"]),
            "chains_involved": len(roles[slug(records[0].team, name)]["involved"]),
            "goals_created": sum(
                1 for c in roles[slug(records[0].team, name)]["involved"]
                if c["ended_in"] == "goal" and c["finished_by"] != name),
        }
    return rows


def rating(stats: dict) -> dict:
    lines = [{"reason": "Starting point", "points": 6.0}]
    # Contributions are capped so long matches and high-touch players do not all hit 10.
    for key, reason, weight, cap in (
        ("goals", "Goals", 0.75, 2.0),
        ("goals_created", "Helped create goals", 0.35, 0.7),
        ("chains_involved", "Part of dangerous moves", 0.05, 0.75),
        ("shots", "Shots", 0.05, 0.5),
        ("progressive", "Progressive actions", 0.02, 0.5),
        ("tackles", "Tackles", 0.08, 0.4),
        ("interceptions", "Interceptions", 0.08, 0.4),
        ("fouls", "Fouls", -0.08, 0.5),
    ):
        raw_points = weight * stats.get(key, 0)
        points = round(min(cap, raw_points) if weight > 0 else max(-cap, raw_points), 2)
        if points:
            lines.append({"reason": reason, "points": points})
    raw = round(sum(line["points"] for line in lines), 1)
    value = min(10.0, max(4.0, raw))
    # Keep the breakdown auditable after applying the score bounds.
    if value != raw:
        lines.append({"reason": "Score limit adjustment", "points": round(value - raw, 1)})
    return {"value": value, "breakdown": lines}


def player_table(events: list[MatchEvent], insights: list[Insight] | None = None) -> list[dict]:
    table = []
    for stats in player_stats(events, insights or []).values():
        table.append({**stats, "rating": rating(stats)["value"]})
    return sorted(table, key=lambda row: (-row["rating"], row["name"].casefold()))


def explain_action(events: list[MatchEvent], event_id: str,
                   insights: list[Insight]) -> dict | None:
    event = next((item for item in events if item.id == event_id), None)
    if event is None:
        return None
    linked = next((item for item in insights if event_id in item.evidence), None)
    evidence = [event.id]
    if linked:
        evidence = list(linked.evidence)
    minute = int(event.minute)
    subject = event.player or "The player"
    why = f"{subject} recorded a {event.type.value} for {event.team} at {minute}'."
    result = {"event_id": event.id, "player": event.player, "team": event.team,
              "minute": event.minute, "action": event.type.value,
              "why": why, "evidence": evidence}
    if linked:
        result["insight_id"] = linked.id
        ending_id = linked.evidence[-1]
        ending = next((item for item in events if item.id == ending_id), event)
        finisher = ending.player
        outcome = "goal" if ending.type == EventType.GOAL else "shot"
        duration = round((ending.minute - event.minute) * 60)
        if ending.id != event.id:
            if linked.kind == "counter_attack":
                why = (f"This was part of the {int(linked.minute)}' counter attack. "
                       f"The move ended in a {outcome}"
                       f"{' for ' + finisher if finisher else ''} {duration} seconds later.")
            else:
                why += f" This was part of the {int(linked.minute)}' {linked.kind.replace('_', ' ')}."
            result["why"] = why
    return result


def involvement(events: list[MatchEvent], insights: list[Insight]) -> dict[str, list[dict]]:
    by_id = {event.id: event for event in events}
    result: dict[str, list[dict]] = defaultdict(list)
    for insight in insights:
        counted: set[str] = set()                    # one row per player per insight
        for event_id in insight.evidence:
            event = by_id.get(event_id)
            if event and event.player and slug(event.team, event.player) not in counted:
                counted.add(slug(event.team, event.player))
                result[slug(event.team, event.player)].append({
                    "kind": insight.kind, "team": insight.team,
                    "minute": insight.minute, "evidence": insight.evidence,
                })
    return dict(result)


def player_actions(events: list[MatchEvent], player_id: str,
                   insights: list[Insight]) -> list[dict]:
    return [explain_event(events, event.id, insights) for event in events
            if event.player and slug(event.team, event.player) == player_id]


def player_review_text(facts: dict, team: str) -> str:
    name = facts["name"]
    story = facts.get("story") or []
    if story:
        n = facts.get("chains_involved", len(story))
        return (f"{name} ({team}) shaped the match through {n} key "
                f"{'move' if n == 1 else 'moves'}. " + " ".join(story))
    return (f"{name} ({team}) had {facts.get('touches', 0)} touches but was not part of "
            f"any of the match's key moves.")


def review_insight(events: list[MatchEvent], player_id: str,
                   insights: list[Insight]) -> Insight | None:
    stats = player_stats(events, insights).get(player_id)
    if stats is None:
        return None
    records = [event for event in events if event.player and
               slug(event.team, event.player) == player_id]
    roles = _chain_roles(events, insights).get(player_id, {"started": [], "finished": [], "involved": []})
    chains = sorted(roles["involved"], key=lambda c: (c["ended_in"] != "goal", c["minute"]))[:2]
    story = []
    for chain in chains:
        phrase = ("started the move" if chain in roles["started"] else
                  "finished the move" if chain in roles["finished"] else "was part of the move")
        story.append(f"At {int(chain['minute'])}' {stats['name']} {phrase}: {chain['trigger']}; "
                     f"{chain['payoff']}. {chain['consequence']}")
    # Cite where each move started and where it ended: enough to check the story.
    evidence = list(dict.fromkeys(i for c in chains for i in (c["evidence"][0], c["evidence"][-1]))) \
        or [event.id for event in records[:6]]
    facts = {key: stats[key] for key in (
        "name", "touches", "carries", "tackles", "interceptions", "fouls",
        "progressive", "goal_minutes", "key_moments", "goals", "shots",
        "chains_started", "chains_finished", "chains_involved", "goals_created")}
    facts["story"] = story
    first_goal = next((event for event in records if event.type == EventType.GOAL), None)
    minute = first_goal.minute if first_goal else (chains[0]["minute"] if chains else
                                                    (records[0].minute if records else 0))
    return Insight(kind="player_review", team=stats["team"], minute=minute,
                   evidence=evidence, facts=facts)
