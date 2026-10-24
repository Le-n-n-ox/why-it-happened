"""How well is a team playing, and what should it change? Rules decide, the model only words it.

Every finding is a count over real events with the evidence ids that prove it. The advice for each
weakness comes from the fixed ADVICE table below, so nothing a model writes can add a tactic.
"""
from app.detectors import Insight
from app.events import EventType, MatchEvent
from app.metrics import distance_covered, pass_accuracy, top_speed

SHOTS = (EventType.SHOT, EventType.GOAL)
MIN_EVENTS = 20          # below this a team has not played enough for a fair verdict

# One fixed piece of advice per kind of problem. Edit these to change what the app recommends.
ADVICE = {
    "careless_build_up": "Play the ball out wide or clear it earlier instead of trying to pass through the middle in their own third.",
    "blunt_attack": "Get shots away sooner once they reach the final third, rather than recycling the ball.",
    "risky_fouls": "Avoid tackling in their own third; hold the shape and delay the attacker instead.",
    "slow_response": "Push forward straight after conceding instead of waiting, because the chance to hit back is early.",
}


def _other(team: str, events: list[MatchEvent]) -> str:
    return next((e.team for e in events if e.team != team), "the opposition")


def _punishing_shot(events: list[MatchEvent], start: int, team: str, window_min: float) -> MatchEvent | None:
    """A shot/goal by `team` in an unbroken run of its own touches after events[start]."""
    origin = events[start].minute
    for event in events[start + 1:]:
        if event.minute - origin > window_min or event.team != team:
            return None
        if event.type in SHOTS:
            return event
    return None


def _spells(events: list[MatchEvent], team: str) -> list[list[MatchEvent]]:
    spells, current = [], []
    for event in events:
        if event.team == team:
            current.append(event)
        elif current:
            spells.append(current)
            current = []
    if current:
        spells.append(current)
    return [s for s in spells if len(s) >= 2]


def team_metrics(events: list[MatchEvent], team: str) -> dict:
    opp = _other(team, events)
    shots = [e for e in events if e.team == team and e.type in SHOTS]
    spells = _spells(events, team)
    entries = [s for s in spells if max(e.x for e in s) >= 66]
    converted = [s for s in entries if any(e.type in SHOTS for e in s)]

    cheap_losses, punished_losses = [], []
    fouls, punished_fouls = [], []
    for i, event in enumerate(events):
        nxt = events[i + 1] if i + 1 < len(events) else None
        if (event.team == team and nxt and nxt.team == opp and event.x < 33
                and nxt.type in (EventType.TACKLE, EventType.INTERCEPTION)):
            cheap_losses.append([event.id, nxt.id])
            shot = _punishing_shot(events, i + 1, opp, 0.25)
            if shot:
                punished_losses.append([event.id, nxt.id, shot.id])
        if event.team == team and event.type == EventType.FOUL and event.x < 33:
            fouls.append(event.id)
            shot = _punishing_shot(events, i, opp, 0.5)
            if shot:
                punished_fouls.append([event.id, shot.id])

    unanswered = []
    for event in events:
        if event.type == EventType.GOAL and event.team == opp:
            answered = any(e.team == team and e.type in SHOTS
                           and 0 < e.minute - event.minute <= 5 for e in events)
            if not answered:
                unanswered.append(event)

    passes = [e for e in events if e.team == team and e.type == EventType.PASS]
    return {
        "team": team, "opponent": opp,
        "shots": len(shots), "goals": sum(e.type == EventType.GOAL for e in shots),
        "passes": len(passes), "pass_accuracy": pass_accuracy(events, team),
        "pass_distance_m": round(sum(float(e.pass_distance_m or 0.0) for e in passes), 1),
        "distance_m": distance_covered(events, team), "top_speed_kph": top_speed(events, team),
        "final_third_entries": len(entries), "entries_with_shot": len(converted),
        "cheap_losses": cheap_losses, "punished_losses": punished_losses,
        "own_third_fouls": fouls, "punished_fouls": punished_fouls,
        "unanswered_goals": [(e.id, e.minute) for e in unanswered],
        "high_wins": [e.id for e in events if e.team == team and e.x >= 66
                      and e.type in (EventType.TACKLE, EventType.INTERCEPTION)],
        "_entry_evidence": [s[0].id for s in entries][:3],
    }


def assess_team(events: list[MatchEvent], team: str) -> dict | None:
    if not any(e.team == team for e in events):
        return None
    me = team_metrics(events, team)
    opp = team_metrics(events, me["opponent"]) if any(e.team == me["opponent"] for e in events) else None
    issues, strengths = [], []

    if len(me["punished_losses"]) >= 2:
        ev = [i for loss in me["punished_losses"] for i in loss]
        issues.append({"code": "careless_build_up", "title": "Losing the ball in their own third",
                       "detail": f"{len(me['punished_losses'])} of {len(me['cheap_losses'])} turnovers in "
                                 f"their own third ended in a {me['opponent']} shot within 15 seconds.",
                       "advice": ADVICE["careless_build_up"], "evidence": ev})
    if me["final_third_entries"] >= 3 and me["entries_with_shot"] / me["final_third_entries"] <= 0.34:
        issues.append({"code": "blunt_attack", "title": "Reaching the final third without shooting",
                       "detail": f"{me['team']} reached the final third {me['final_third_entries']} times "
                                 f"but only {me['entries_with_shot']} of those spells ended in a shot.",
                       "advice": ADVICE["blunt_attack"], "evidence": me["_entry_evidence"]})
    if len(me["own_third_fouls"]) >= 2 and me["punished_fouls"]:
        ev = [i for pair in me["punished_fouls"] for i in pair]
        issues.append({"code": "risky_fouls", "title": "Fouling in their own third",
                       "detail": f"{len(me['own_third_fouls'])} fouls in their own third, and "
                                 f"{len(me['punished_fouls'])} of them led to a {me['opponent']} shot within 30 seconds.",
                       "advice": ADVICE["risky_fouls"], "evidence": ev})
    if me["unanswered_goals"]:
        ids = [g[0] for g in me["unanswered_goals"]]
        n = len(ids)
        issues.append({"code": "slow_response", "title": "No reply after conceding",
                       "detail": f"{me['team']} had no shot in the 5 minutes after conceding "
                                 f"{n} {'goal' if n == 1 else 'goals'}.",
                       "advice": ADVICE["slow_response"], "evidence": ids})

    if opp and me["shots"] > opp["shots"]:
        strengths.append({"code": "more_shots", "title": "Creating more chances",
                          "detail": f"{me['team']} had {me['shots']} shots to {opp['shots']}.", "evidence": []})
    if me["final_third_entries"] >= 3 and me["entries_with_shot"] / me["final_third_entries"] >= 0.5:
        strengths.append({"code": "efficient_attack", "title": "Turning attacks into shots",
                          "detail": f"{me['entries_with_shot']} of {me['final_third_entries']} final-third "
                                    f"spells ended in a shot.", "evidence": me["_entry_evidence"]})
    if len(me["high_wins"]) >= 2:
        strengths.append({"code": "effective_press", "title": "Winning the ball high up the pitch",
                          "detail": f"{me['team']} won the ball back {len(me['high_wins'])} times in the final third.",
                          "evidence": me["high_wins"][:4]})

    points = []
    if opp:
        points.append({"reason": "More shots than the opponent", "points": int(me["shots"] > opp["shots"])})
        points.append({"reason": "More final-third entries", "points": int(me["final_third_entries"] > opp["final_third_entries"])})
    points.append({"reason": "Few costly turnovers", "points": int(len(me["punished_losses"]) <= 1)})
    points.append({"reason": "No discipline problem", "points": int(not any(i["code"] == "risky_fouls" for i in issues))})
    total, out_of = sum(p["points"] for p in points), len(points)
    verdict = "playing well" if total >= out_of - 1 else "mixed" if total >= out_of / 2 else "struggling"
    if sum(e.team == team for e in events) < MIN_EVENTS:
        verdict = "too little play to judge"

    for finding in strengths + issues:
        finding["evidence"] = list(dict.fromkeys(finding["evidence"]))
    metrics = {k: (len(v) if isinstance(v, list) else v) for k, v in me.items()
               if k not in ("team", "opponent", "_entry_evidence")}
    return {"team": team, "opponent": me["opponent"], "verdict": verdict,
            "points": points, "score": f"{total}/{out_of}", "metrics": metrics,
            "strengths": strengths, "issues": issues}


def assessment_insight(events: list[MatchEvent], team: str) -> Insight | None:
    report = assess_team(events, team)
    if report is None:
        return None
    if report["verdict"] == "too little play to judge":
        story = [f"There is too little play from {team} to judge them fairly."]
    else:
        story = [f"{team} are {report['verdict']} ({report['score']} on the checks)."]
    story += [f["detail"] for f in report["strengths"][:2]]
    for issue in report["issues"][:3]:
        story.append(f"{issue['detail']} {issue['advice']}")
    evidence = list(dict.fromkeys(i for f in report["strengths"] + report["issues"]
                                  for i in f["evidence"]))[:12]
    last = max((e for e in events if e.team == team), key=lambda e: e.minute)
    return Insight(kind="team_assessment", team=team, minute=last.minute,
                   evidence=evidence or [last.id],
                   facts={"verdict": report["verdict"], "story": story})
