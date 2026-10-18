"""WHY things happened: causal chains built from events by rules, never by the model.

Every chain is: trigger -> development -> payoff -> consequence (why it mattered).
Each part is a plain fact derived from the events, with the evidence ids that prove it.
The language model may reword the chain, but it cannot add to it.
"""
import re

from app.assessment import _punishing_shot
from app.detectors import Insight
from app.events import EventType, MatchEvent


def _zone(x: float) -> str:
    return "own third" if x < 33 else "middle third" if x < 66 else "final third"


def _the(x: float) -> str:
    """The zone as a noun phrase: 'their own third', 'the middle third', 'the final third'."""
    return "their own third" if x < 33 else "the middle third" if x < 66 else "the final third"


def _poss(team: str) -> str:
    return team + ("'" if team.endswith("s") else "'s")


def _score(events: list[MatchEvent], upto_index: int) -> dict[str, int]:
    """Goals scored by each team up to and including events[upto_index]."""
    score: dict[str, int] = {}
    for e in events[: upto_index + 1]:
        score.setdefault(e.team, 0)
        if e.type == EventType.GOAL:
            score[e.team] += 1
    return score


def _consequence(events: list[MatchEvent], last: MatchEvent) -> dict:
    """Why the payoff mattered, from the scoreline at that moment."""
    index = next(i for i, e in enumerate(events) if e.id == last.id)
    if last.type != EventType.GOAL:
        shots = sum(1 for e in events[: index + 1]
                    if e.team == last.team and e.type in (EventType.SHOT, EventType.GOAL))
        return {"kind": "chance", "text": f"It was {_poss(last.team)} shot number {shots} of the match.",
                "evidence": [last.id]}
    score = _score(events, index)
    mine = score[last.team]
    other = max((v for t, v in score.items() if t != last.team), default=0)
    before = mine - 1
    if before == other:
        text = f"It put {last.team} ahead {mine}-{other}" if mine > other else ""
        if mine == 1 and other == 0:
            text = f"It was the opening goal, {mine}-{other} to {last.team}"
    elif mine == other:
        text = f"It levelled the match at {mine}-{other}"
    elif mine > other:
        text = f"It stretched {_poss(last.team)} lead to {mine}-{other}"
    else:
        text = f"It cut the deficit to {mine}-{other}"
    return {"kind": "goal", "text": text + ".", "score": f"{mine}-{other}", "evidence": [last.id]}


def chain_for(events: list[MatchEvent], insight: Insight) -> dict | None:
    by_id = {e.id: e for e in events}
    steps = [by_id[i] for i in insight.evidence if i in by_id]
    if len(steps) < 2:
        return None
    first, last = steps[0], steps[-1]
    seconds = round((last.minute - first.minute) * 60)
    who = first.player or first.team

    if first.type in (EventType.TACKLE, EventType.INTERCEPTION):
        verb = "tackled" if first.type == EventType.TACKLE else "intercepted"
        trigger = f"{who} {verb} the ball in {_poss(first.team)} {_zone(first.x)}"
    elif first.type == EventType.FOUL:
        trigger = f"{who} committed a foul within {_the(first.x)}"
    else:
        trigger = f"{first.team} had the ball in their {_zone(first.x)}"

    gained = round(last.x - first.x)
    touches = len(steps)
    if seconds > 60:          # a sustained spell, not a single move
        shots = sum(e.type in (EventType.SHOT, EventType.GOAL) for e in steps)
        trigger = f"{insight.team} kept the pressure on in the {_zone(last.x)}"
        development = f"{shots} shots in {seconds / 60:.0f} minutes"
        gained = 0
    else:
        development = None
    plain = development or (f"{touches} touches in {seconds} seconds moved it from {_the(first.x)} "
                            f"to {_the(last.x)}")
    development = plain
    finisher = last.player or last.team
    payoff = f"{finisher} {'scored' if last.type == EventType.GOAL else 'took a shot'}"
    consequence = _consequence(events, last)
    return {
        "insight_id": insight.id, "kind": insight.kind, "team": insight.team,
        "minute": insight.minute, "evidence": list(insight.evidence),
        "trigger": trigger, "development": development, "payoff": payoff,
        "consequence": consequence["text"], "ended_in": last.type.value,
        "summary": f"{trigger}; {plain}; {payoff}. {consequence['text']}",
        "forward_gain": gained,          # change in pitch position (0-100 scale), for charts; not for display
        "started_by": first.player, "finished_by": last.player, "duration_s": seconds,
    }


def causal_chains(events: list[MatchEvent], insights: list[Insight]) -> list[dict]:
    chains = [c for c in (chain_for(events, i) for i in insights) if c]
    return sorted(chains, key=lambda c: c["minute"])


def _impact(chain: dict) -> int:
    return (10 if chain["ended_in"] == "goal" else 3) + (2 if chain["duration_s"] <= 20 else 0)


def turning_points(events: list[MatchEvent], insights: list[Insight], top: int = 3) -> list[dict]:
    """The moments that changed the scoreline, strongest first."""
    ranked = sorted(causal_chains(events, insights), key=lambda c: (-_impact(c), c["minute"]))
    return ranked[:top]


def why_they_won(events: list[MatchEvent], insights: list[Insight]) -> dict:
    """Explain the RESULT: each goal traced back to what caused it."""
    chains = causal_chains(events, insights)
    goals = [e for e in events if e.type == EventType.GOAL]
    score: dict[str, int] = {}
    for e in events:
        score.setdefault(e.team, 0)
        if e.type == EventType.GOAL:
            score[e.team] += 1
    reasons = []
    for goal in goals:
        chain = next((c for c in chains if goal.id in c["evidence"]), None)
        if chain:
            reasons.append({"minute": goal.minute, "team": goal.team, "evidence": chain["evidence"],
                            "text": chain["summary"], "caused_by": chain["kind"],
                            "insight_id": chain["insight_id"]})
        else:
            reasons.append({"minute": goal.minute, "team": goal.team, "evidence": [goal.id],
                            "text": f"{goal.player or goal.team} scored in the {_zone(goal.x)} "
                                    f"({goal.minute:.0f}'); no earlier pattern led to it.",
                            "caused_by": None, "insight_id": None})
    ordered = sorted(score.items(), key=lambda kv: -kv[1])
    winner = ordered[0][0] if ordered and (len(ordered) < 2 or ordered[0][1] > ordered[1][1]) else None
    return {"score": score, "winner": winner, "reasons": reasons}


_ORDINALS = {2: "second", 3: "third", 4: "fourth", 5: "fifth"}
_SHOTS = (EventType.SHOT, EventType.GOAL)


def _other_team(events: list[MatchEvent], team: str) -> str:
    return next((e.team for e in events if e.team != team), "the opposition")


def foul_context(events: list[MatchEvent], index: int) -> dict:
    """Why a foul happened, as far as the events show: the trigger, the score, repeats, the result."""
    event = events[index]
    team, opp = event.team, _other_team(events, event.team)
    who = event.player or team
    prev = events[index - 1] if index > 0 else None
    factors, evidence, codes = [], [event.id], []

    if prev and prev.team == opp and event.minute - prev.minute <= 0.25:
        evidence.insert(0, prev.id)
        if prev.type in (EventType.TACKLE, EventType.INTERCEPTION):
            factors.append(f"{team} had just lost the ball"); codes.append("lost_ball_just_before")
        elif prev.type in _SHOTS:
            factors.append(f"{opp} had just shot"); codes.append("after_opponent_shot")
        elif prev.x >= 66:
            factors.append(f"{opp} were attacking in their final third"); codes.append("stopping_an_attack")
    if index > 0:
        score = _score(events, index - 1)
        mine, theirs = score.get(team, 0), score.get(opp, 0)
        if mine < theirs:
            factors.append(f"{team} were {mine}-{theirs} down"); codes.append("trailing")
    earlier = [e for e in events[:index] if e.type == EventType.FOUL and e.player and e.player == event.player]
    if earlier:
        factors.append(f"it was {who}'s {_ORDINALS.get(len(earlier) + 1, 'repeat')} foul of the match")
        codes.append("repeat_offender")
        evidence = [e.id for e in earlier[-1:]] + evidence

    shot = _punishing_shot(events, index, opp, 0.5)
    if shot:
        seconds = round((shot.minute - event.minute) * 60)
        consequence = f"{opp} had a {'goal' if shot.type == EventType.GOAL else 'shot'} {seconds} seconds later."
        evidence.append(shot.id)
    else:
        consequence = "No shot followed within 30 seconds."
    base = f"{who} fouled within {_the(event.x)}"
    trigger = ": " + "; ".join(factors) + "." if factors else " with no earlier trigger in the data."
    return {"kind": "foul", "why": f"{base}{trigger} {consequence}", "factors": codes,
            "led_to_shot": bool(shot), "evidence": evidence}


def pass_context(events: list[MatchEvent], index: int) -> dict:
    """What a pass achieved: progress, who received it, whether it set up a shot, or was cut out."""
    event = events[index]
    team = event.team
    who = event.player or team
    nxt = events[index + 1] if index + 1 < len(events) else None
    base = {"kind": "pass", "significant": False, "led_to": None, "lost": False}
    if nxt is None:
        return {**base, "why": f"{who} passed in the {_zone(event.x)}.", "evidence": [event.id]}

    if nxt.team != team:
        base["lost"] = True
        cut = nxt.type in (EventType.INTERCEPTION, EventType.TACKLE)
        text = f"{who}'s pass in the {_zone(event.x)} " + (
            f"was {'intercepted' if nxt.type == EventType.INTERCEPTION else 'tackled'}"
            f"{' by ' + nxt.player if nxt.player else ''}, ending the move." if cut else "did not find a team-mate.")
        evidence = [event.id, nxt.id]
        shot = _punishing_shot(events, index + 1, nxt.team, 0.25)
        if shot:
            seconds = round((shot.minute - nxt.minute) * 60)
            text += f" {nxt.team} shot {seconds} seconds later."
            evidence.append(shot.id)
            base["significant"] = True
        return {**base, "why": text, "evidence": evidence}

    receiver = nxt.player if nxt.player and nxt.player != event.player else None
    to_whom = f" to {receiver}" if receiver else ""
    z0, z1 = _zone(event.x), _zone(nxt.x)
    if nxt.x - event.x >= 15 and z0 != z1:
        text = f"{who}'s pass moved the ball{to_whom} from {_the(event.x)} into {_the(nxt.x)}."
        base["significant"] = True
    elif nxt.x < event.x - 5:
        text = f"{who} passed{to_whom} backwards, keeping possession in {_the(event.x)}."
    else:
        text = f"{who} passed{to_whom} within {_the(nxt.x)}, keeping possession."
    evidence = [event.id, nxt.id]
    finisher, touches = None, 0
    for later in events[index + 1:]:
        if later.team != team or later.minute - event.minute > 0.33:
            break
        touches += 1
        if later.type in _SHOTS:
            finisher = later
            break
    if finisher is not None:
        seconds = round((finisher.minute - event.minute) * 60)
        what = "goal" if finisher.type == EventType.GOAL else "shot"
        if finisher.player and finisher.player != event.player:
            text += f" It led to {finisher.player}'s {what} {seconds} seconds later."
        else:
            text += f" It led to a {what} {seconds} seconds later."
        evidence.append(finisher.id)
        base.update(significant=True, led_to=what)
    return {**base, "why": text, "evidence": list(dict.fromkeys(evidence))}


def explain_event(events: list[MatchEvent], event_id: str, insights: list[Insight]) -> dict | None:
    """Why did this single action matter? Fouls and passes get their own context; routine ones say so."""
    index = next((i for i, e in enumerate(events) if e.id == event_id), None)
    if index is None:
        return None
    event = events[index]
    base = {"event_id": event.id, "player": event.player, "team": event.team,
            "minute": event.minute, "action": event.type.value}
    ctx = (foul_context(events, index) if event.type == EventType.FOUL else
           pass_context(events, index) if event.type == EventType.PASS else None)

    for insight in insights:
        if event_id not in insight.evidence:
            continue
        chain = chain_for(events, insight)
        if not chain:
            continue
        position = insight.evidence.index(event_id)
        role = ("started" if position == 0 else
                "finished" if position == len(insight.evidence) - 1 else "carried on")
        who = event.player or "The player"
        if role == "started":
            why = f"{who} started the move: {chain['trigger']}. {chain['payoff']} {chain['duration_s']} seconds later. {chain['consequence']}"
        elif role == "finished":
            why = f"{who} finished a move that began when {chain['trigger']}. {chain['consequence']}"
        else:
            why = f"{who} kept the move alive: {chain['development']}. {chain['payoff']}. {chain['consequence']}"
        result = {**base, "routine": False, "role": role, "why": why.strip(),
                  "insight_id": insight.id, "evidence": list(insight.evidence)}
        if ctx:
            result["detail"] = ctx["why"]
        return result

    if ctx and (ctx["kind"] == "foul" or ctx.get("significant")):
        return {**base, "routine": False, "role": ctx["kind"], "why": ctx["why"],
                "evidence": ctx["evidence"], **({"factors": ctx["factors"]} if "factors" in ctx else {})}
    if ctx:
        return {**base, "routine": True, "role": None, "evidence": ctx["evidence"],
                "why": ctx["why"] + " Nothing in the match's key moments came from it."}
    return {**base, "routine": True, "role": None, "evidence": [event.id],
            "why": "Routine action: no shot, goal or pattern followed from it."}


def foul_explanations(events: list[MatchEvent], insights: list[Insight]) -> list[dict]:
    return [explain_event(events, e.id, insights) for e in events if e.type == EventType.FOUL]


def model_view(chain: dict) -> dict:
    """What the language model is allowed to see of a chain: words and counts, no pitch units."""
    how = re.sub(r"\s*\([+-]?\d+ pitch units forward\)", "", chain["development"])
    return {"cause": chain["trigger"], "how": how,
            "payoff": chain["payoff"], "why_it_mattered": chain["consequence"]}


def attach_why(events: list[MatchEvent], insight: Insight) -> dict | None:
    """Put the causal chain on the insight so narration (model or template) can use it."""
    chain = chain_for(events, insight)
    if chain:
        insight.facts["why"] = model_view(chain)
    return chain
