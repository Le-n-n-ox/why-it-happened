"""Football knowledge for WHY: was a pass good, were the tactics working, did they change, who wins.

Everything here is rules over real events. Nothing is guessed by the language model.

Football knowledge lives in two editable places, so you can see and defend every claim:
  * PRINCIPLES: the plain-English football idea behind each finding ("why this is good").
  * The THRESHOLDS at the top of each section: when a finding counts.

Limits of this feed (be honest about them in the demo): we only see on-ball events, so we cannot see
off-ball runs, defenders' positions or the coach's instructions. "Tactics" here means what a team
visibly did, and "good" means it produced or prevented chances in THIS match.
"""
import math

from app.assessment import SHOTS, _other, _punishing_shot, team_metrics
from app.detectors import Insight, detect_counter_attacks, detect_shot_pressure
from app.events import EventType, MatchEvent
from app.metrics import DIFFICULT_PASS, LONG_PASS_M, pass_metrics
from app.xt import xt_value

DEFENSIVE = (EventType.TACKLE, EventType.INTERCEPTION)
HALF_TIME = 45.0

# ---------------------------------------------------------------- football knowledge

PRINCIPLES = {
    "box_entry": "Shots from inside the penalty area are far more likely to score than shots from outside it.",
    "danger_up": "A pass is worth what it does to the chance of scoring: moving the ball to where a shot is more dangerous.",
    "led_to_shot": "A pass that sets up a shot has directly created a chance.",
    "switch": "Switching play to the far side stretches the defence and opens space.",
    "progressive": "Moving the ball forward quickly puts the defence under pressure.",
    "recycle": "Passing back keeps possession and gives the team time to reset the attack.",
    "risky_loss": "Losing the ball in your own third is dangerous because the opponent is already close to goal.",
    "punished": "A turnover is only costly if the opponent turns it into a chance, and here they did.",
    "high_press": "Winning the ball high up the pitch leaves the opponent's goal close, so a shot can follow within seconds. "
                  "It only pays if the ball is actually won.",
    "deep_defence": "Defending deep keeps shots away from the most dangerous areas and invites counter-attacks. "
                    "It works if the opponent's chances stay low.",
    "possession": "Keeping the ball only helps if it turns into shots; passing around the edge of the box does not score.",
    "counter": "Counter-attacks work by winning the ball and reaching goal before the opponent can get back into shape.",
    "chance_quality": "Goals follow from the quality of chances: many shots from poor positions are worth less than a few from close range.",
    "finishing": "Scoring more or fewer goals than the chances were worth is the difference between clinical and wasteful finishing.",
    "pressure": "Repeated shots in a short spell mean the defence cannot clear its lines, and one is likely to go in.",
    "final_third": "Reaching the final third is not enough; the better team turns those attacks into shots.",
    "creativity": "The passes that lead straight to shots are where chances are actually made.",
    "turnovers": "Giving the ball away in your own third hands the opponent a short route to goal.",
    "discipline": "Fouling near your own goal gives the opponent set-piece chances.",
    "shift": "A team that changes how it plays at half-time has either fixed a problem or created one; the results show which.",
    "territory": "A team that controls the ball keeps the game in the opponent's half and limits their chances.",
    "difficult_pass": "A long or angled pass under pressure is harder to complete, so completing it creates more than a simple square ball.",
    "long_pass": "A long pass covers ground quickly but is harder to complete; the distance is part of the risk.",
    "accurate_pass": "A completed pass keeps the attack alive; an incomplete one hands the ball to the opponent.",
}

# ---------------------------------------------------------------- chance value (own simple model)

GOAL_WIDTH_M = 7.32


def danger(x: float, y: float) -> float:
    """How likely a shot from here is to score, 0 to 1.

    A simple distance-and-angle estimate of our own (the pitch is taken as 105 x 68 m): close and
    central is dangerous, far or tight-angled is not. It is NOT a fitted xG model; treat it as a
    consistent yardstick for comparing moments inside one match.
    """
    dx = max((100 - x) * 1.05, 0.5)
    dy = (y - 50) * 0.68
    distance = math.hypot(dx, dy)
    angle = math.atan2(GOAL_WIDTH_M * dx, dx * dx + dy * dy - (GOAL_WIDTH_M / 2) ** 2)
    return round(min(0.95, 0.7 * math.exp(-distance / 9) * min(1.0, angle / 0.5)), 3)


def ball_value(x: float, y: float) -> float:
    """What having the ball here is worth: the learned xT grid when data/xt_grid.json exists, else danger()."""
    value = xt_value(x, y)
    return danger(x, y) if value is None else round(value, 3)


def team_xg(events: list[MatchEvent], team: str, lo: float = 0.0, hi: float = 1e9) -> float:
    return round(sum(danger(e.x, e.y) for e in events
                     if e.team == team and e.type in SHOTS and lo <= e.minute < hi), 2)


def _poss(team: str) -> str:
    return team + ("'" if team.endswith("s") else "'s")


def _pct(value: float) -> str:
    return f"{round(value * 100)}%"


def _in_box(x: float, y: float) -> bool:
    return x >= 83 and 21 <= y <= 79


# ---------------------------------------------------------------- 1. was this pass good?

def pass_quality(events: list[MatchEvent], index: int) -> dict | None:
    """Why a pass was good, routine or poor, with the football idea behind each reason."""
    event = events[index]
    if event.type != EventType.PASS:
        return None
    who = event.player or event.team
    evidence = [event.id]
    reasons: list[dict] = []
    metrics = pass_metrics(events, index) or {}
    distance = metrics.get("distance_m")
    accuracy = metrics.get("accuracy")
    difficulty = metrics.get("difficulty")
    difficulty_label = metrics.get("difficulty_rating")

    def add(code: str, text: str):
        reasons.append({"code": code, "text": text, "principle": PRINCIPLES[code]})

    def measured() -> dict:
        return {"distance_m": distance, "accuracy": accuracy,
                "difficulty": difficulty, "difficulty_rating": difficulty_label}

    nxt = events[index + 1] if index + 1 < len(events) else None
    if nxt is None:
        return {"rating": "routine", "reasons": [], "evidence": evidence,
                "danger_before": ball_value(event.x, event.y), "danger_after": None,
                **measured()}

    if nxt.team != event.team:                              # the pass did not reach a team-mate
        evidence.append(nxt.id)
        how = ("intercepted" if nxt.type == EventType.INTERCEPTION else
               "tackled" if nxt.type == EventType.TACKLE else "lost")
        by = f" by {nxt.player}" if nxt.player and how != "lost" else ""
        add("risky_loss" if event.x < 33 else "punished",
            f"{who}'s pass was {how}{by}, so {event.team} lost the ball in {_where(event.x)}.")
        shot = _punishing_shot(events, index + 1, nxt.team, 20 / 60)
        if shot:
            evidence.append(shot.id)
            seconds = round((shot.minute - nxt.minute) * 60)
            reasons.append({"code": "punished", "text": f"{nxt.team} had a shot {seconds} seconds later.",
                            "principle": PRINCIPLES["punished"]})
        rating = "poor" if (event.x < 33 or shot) else "unsuccessful"
        return {"rating": rating, "reasons": reasons, "evidence": evidence,
                "danger_before": ball_value(event.x, event.y), "danger_after": None,
                **measured()}

    before, after = ball_value(event.x, event.y), ball_value(nxt.x, nxt.y)
    receiver = nxt.player if nxt.player and nxt.player != event.player else None
    to_whom = f" to {receiver}" if receiver else ""
    evidence.append(nxt.id)
    points = 0

    if _in_box(nxt.x, nxt.y) and not _in_box(event.x, event.y):
        points += 3
        add("box_entry", f"{who}'s pass{to_whom} took the ball into the penalty area.")
    # Require a meaningful gain on the fitted xT grid; the current 20-match sample flags about 1.7% of
    # pass transitions with a same-team next event, keeping small cell changes from being called dangerous.
    if after - before >= 0.03:
        points += 2
        add("danger_up", f"It moved the ball somewhere more dangerous: the chance of a goal from there "
                         f"rose from {_pct(before)} to {_pct(after)}.")
    shot = None
    for later in events[index + 1:]:
        if later.team != event.team or later.minute - event.minute > 20 / 60:
            break
        if later.type in SHOTS:
            shot = later
            break
    if shot is not None:
        points += 3
        seconds = round((shot.minute - event.minute) * 60)
        what = "goal" if shot.type == EventType.GOAL else "shot"
        by_whom = f"{shot.player}'s " if shot.player and shot.player != event.player else "a "
        add("led_to_shot", f"It led to {by_whom}{what} {seconds} seconds later.")
        evidence.append(shot.id)
    if abs(nxt.y - event.y) >= 40:
        points += 1
        add("switch", f"{who} switched play from one side of the pitch to the other.")
    if nxt.x - event.x >= 15 and not any(r["code"] == "box_entry" for r in reasons):
        points += 1
        add("progressive", f"{who}'s pass{to_whom} moved the ball well forward, from {_where(event.x)} "
                           f"to {_where(nxt.x)}.")
    if not reasons and nxt.x < event.x - 5:
        add("recycle", f"{who} passed back{to_whom}, keeping possession in {_where(event.x)}.")

    if difficulty is not None and difficulty >= DIFFICULT_PASS:
        length = f" over {distance:.0f} metres" if distance else ""
        add("difficult_pass", f"{who}'s pass was a {str(difficulty_label).replace('_', ' ')} one{length}.")
    elif distance is not None and distance >= LONG_PASS_M:
        add("long_pass", f"{who}'s pass travelled {distance:.0f} metres.")

    rating = "excellent" if points >= 5 else "good" if points >= 2 else "routine"
    return {"rating": rating, "reasons": reasons, "evidence": list(dict.fromkeys(evidence)),
            "danger_before": before, "danger_after": after, **measured()}


def _where(x: float) -> str:
    return "their own third" if x < 33 else "the middle third" if x < 66 else "the final third"


# ---------------------------------------------------------------- 2. how a team played, per half

MIN_HALF_EVENTS = 10           # fewer team events than this in a half: not enough to compare
MIN_SECOND_HALF_MIN = 20       # a half-time comparison needs this much second half
SHIFT_MIN = {"high_share": 0.30, "possession": 0.10, "directness": 0.15, "wide": 0.15, "tempo": 0.25}
EFFECT_MIN = 0.08              # expected goals per 10 minutes that counts as a real change


def _last_minute(events: list[MatchEvent]) -> float:
    return max((e.minute for e in events), default=0.0)


def profile(events: list[MatchEvent], team: str, lo: float, hi: float) -> dict:
    """How a team played between two minutes, from counts only."""
    opp = _other(team, events)
    inside = [e for e in events if lo <= e.minute < hi]
    mine = [e for e in inside if e.team == team]
    defensive = [e for e in mine if e.type in DEFENSIVE]
    high = [e for e in defensive if e.x >= 50]
    duration = max(min(hi, _last_minute(events) + 0.01) - lo, 0.01)

    passes = forward = 0
    for i, e in enumerate(inside[:-1]):
        nxt = inside[i + 1]
        if e.team == team and e.type == EventType.PASS and nxt.team == team:
            passes += 1
            forward += nxt.x - e.x >= 15

    return {
        "events": len(mine),
        "possession": len(mine) / len(inside) if inside else None,
        "defensive_actions": len(defensive),
        "high_share": len(high) / len(defensive) if len(defensive) >= 3 else None,
        "directness": forward / passes if passes >= 5 else None,
        "wide": sum(e.y < 25 or e.y > 75 for e in mine) / len(mine) if mine else None,
        "tempo": len(mine) / duration,
        "xg_for": team_xg(events, team, lo, hi),
        "xg_against": team_xg(events, opp, lo, hi),
        "duration": duration,
        "_defensive_ids": [e.id for e in defensive],
        "_ids": [e.id for e in mine],
    }


def half_shifts(events: list[MatchEvent], team: str) -> dict:
    """Did the team play differently after half-time, and did the change help?"""
    last = _last_minute(events)
    if last < HALF_TIME + MIN_SECOND_HALF_MIN:
        return {"available": False, "reason": "Not enough of the second half has been played to compare."}
    first = profile(events, team, 0.0, HALF_TIME)
    second = profile(events, team, HALF_TIME, last + 0.01)
    if min(first["events"], second["events"]) < MIN_HALF_EVENTS:
        return {"available": False, "reason": "Too few actions in one half to compare fairly."}

    opp = _other(team, events)
    score = {team: 0, opp: 0}
    for e in events:
        if e.minute < HALF_TIME and e.type == EventType.GOAL:
            score[e.team] += 1

    def pick(a: dict, b: dict, key: str) -> list[str]:
        return list(dict.fromkeys(a[key][:2] + b[key][:2]))

    changes: list[dict] = []

    def compare(code: str, key: str, up_title: str, down_title: str, sentence, ids_key: str):
        a, b = first[key], second[key]
        if a is None or b is None or abs(b - a) < SHIFT_MIN[code]:
            return
        changes.append({"code": code, "direction": "up" if b > a else "down",
                        "title": up_title if b > a else down_title,
                        "detail": sentence(a, b), "before": round(a, 2), "after": round(b, 2),
                        "evidence": pick(first, second, ids_key)})

    compare("high_share", "high_share", "Winning the ball higher up", "Winning the ball deeper",
            lambda a, b: f"{_pct(a)} of {_poss(team)} tackles and interceptions were in the opponent's half before "
                         f"the break, {_pct(b)} after it.", "_defensive_ids")
    compare("possession", "possession", "Controlling more of the game", "Controlling less of the game",
            lambda a, b: f"{team} made {_pct(a)} of the recorded actions in the first half and {_pct(b)} "
                         f"in the second.", "_ids")
    compare("directness", "directness", "Playing more directly", "Playing more patiently",
            lambda a, b: f"{_pct(a)} of {_poss(team)} passes went well forward in the first half, {_pct(b)} in "
                         f"the second.", "_ids")
    compare("wide", "wide", "Using the wings more", "Playing more through the middle",
            lambda a, b: f"{_pct(a)} of {_poss(team)} actions were out wide in the first half, {_pct(b)} in "
                         f"the second.", "_ids")
    if first["tempo"] > 0 and abs(second["tempo"] - first["tempo"]) / first["tempo"] >= SHIFT_MIN["tempo"]:
        faster = second["tempo"] > first["tempo"]
        changes.append({"code": "tempo", "direction": "up" if faster else "down",
                        "title": "Raising the tempo" if faster else "Slowing the game down",
                        "detail": f"{team} made {first['tempo']:.1f} actions a minute in the first half and "
                                  f"{second['tempo']:.1f} in the second.",
                        "before": round(first["tempo"], 2), "after": round(second["tempo"], 2),
                        "evidence": pick(first, second, "_ids")})

    def net(p: dict) -> float:
        return (p["xg_for"] - p["xg_against"]) / p["duration"] * 10

    swing = round(net(second) - net(first), 2)
    effect = "worked" if swing >= EFFECT_MIN else "backfired" if swing <= -EFFECT_MIN else "no clear effect"
    return {"available": True, "team": team, "changes": changes, "effect": effect,
            "halftime_score": score, "swing": swing,
            "xg_first": {"for": first["xg_for"], "against": first["xg_against"]},
            "xg_second": {"for": second["xg_for"], "against": second["xg_against"]}}


def shift_story(team: str, shifts: dict) -> list[str]:
    if not shifts.get("available"):
        return []
    opp = next(iter(k for k in shifts["halftime_score"] if k != team), "the opposition")
    mine, theirs = shifts["halftime_score"].get(team, 0), shifts["halftime_score"].get(opp, 0)
    if not shifts["changes"]:
        return [f"{team} played the same way in both halves."]
    context = (f"At half-time {team} were {mine}-{theirs} down" if mine < theirs else
               f"At half-time {team} were {mine}-{theirs} up" if mine > theirs else
               f"At half-time it was level at {mine}-{theirs}")
    lines = [f"{context}, and in the second half {team} changed how they played."]
    lines += [c["detail"] for c in shifts["changes"][:3]]
    xf, xs = shifts["xg_first"], shifts["xg_second"]
    result = {"worked": "The change worked", "backfired": "The change backfired",
              "no clear effect": "The change made no clear difference"}[shifts["effect"]]
    lines.append(f"{result}: {_poss(team)} chances were worth {xf['for']:.1f} expected goals against {xf['against']:.1f} "
                 f"conceded before the break, and {xs['for']:.1f} against {xs['against']:.1f} after it.")
    return lines


# ---------------------------------------------------------------- 6. what the first half showed

def first_half_brief(events: list[MatchEvent], team: str) -> dict:
    """What the first half showed for one team: what worked, what didn't, and what to watch.

    The rules pick the facts and rank them. Nothing here is a guess about intent: every line is a
    count over the first half's events, and every line carries the events behind it.
    """
    opp = _other(team, events)
    last = _last_minute(events)
    if last < HALF_TIME - 5:
        return {"available": False, "reason": "The first half has not been played yet."}
    inside = [e for e in events if e.minute < HALF_TIME]
    mine = [e for e in inside if e.team == team]
    if len(mine) < MIN_HALF_EVENTS:
        return {"available": False,
                "reason": f"{team} have {len(mine)} actions so far, which is too few to judge a half."}
    me = team_metrics(inside, team)
    them = team_metrics(inside, opp) if any(e.team == opp for e in inside) else None
    first = profile(events, team, 0.0, HALF_TIME)
    xg_for, xg_against = first["xg_for"], first["xg_against"]
    entries, converted = me["final_third_entries"], me["entries_with_shot"]
    worked: list[dict] = []
    didnt: list[dict] = []
    watch: list[dict] = []

    def finding(code, title, detail, evidence, weight):
        return {"code": code, "title": title, "detail": detail, "evidence": list(dict.fromkeys(evidence))[:6],
                "principle": PRINCIPLES.get(code, ""), "weight": weight}

    # ---- what worked
    if me["shots"] >= 1:
        worked.append(finding(
            "chance_quality", "They had chances worth something",
            f"{team} had {me['shots']} shot{'s' if me['shots'] != 1 else ''} in the first half, worth "
            f"{xg_for:.1f} expected goals against {xg_against:.1f} conceded.",
            [e.id for e in mine if e.type in SHOTS][:4], 4 if xg_for >= xg_against else 2))
    if me["goals"]:
        worked.append(finding(
            "finishing", "They scored",
            f"{team} scored {me['goals']} from chances worth {xg_for:.1f} expected goals.",
            [e.id for e in inside if e.team == team and e.type == EventType.GOAL][:3], 5))
    if entries >= 2 and converted / entries >= 0.4:
        worked.append(finding(
            "final_third", "They made things of their entries",
            f"{team} reached the final third {entries} times and {converted} of those spells ended in a shot.",
            me["_entry_evidence"], 4))
    if len(me["high_wins"]) >= 3:
        worked.append(finding(
            "high_press", "They won the ball high up the pitch",
            f"{team} won the ball in the final third {len(me['high_wins'])} times in the first half.",
            me["high_wins"][:4], 3))
    share = len(mine) / len(inside) if inside else 0.0
    if share >= 0.55:
        worked.append(finding(
            "possession", "They had more of the game",
            f"{team} made {_pct(share)} of the recorded actions in the first half.",
            [e.id for e in mine][:3], 2))

    # ---- what did not
    if entries >= 2 and converted / entries < 0.34:
        didnt.append(finding(
            "final_third", "Their entries did not end in shots",
            f"{team} reached the final third {entries} times but only {converted} of those spells ended in a shot.",
            me["_entry_evidence"], 4))
    if len(me["punished_losses"]) >= 1:
        didnt.append(finding(
            "turnovers", "Losing the ball cost them",
            f"{team} lost the ball in their own third {len(me['punished_losses'])} times in ways that gave "
            f"{opp} a shot within 15 seconds.",
            [i for loss in me["punished_losses"] for i in loss], 4))
    if len(me["own_third_fouls"]) >= 1 and me["punished_fouls"]:
        didnt.append(finding(
            "discipline", "Fouls in dangerous places",
            f"{team} fouled {len(me['own_third_fouls'])} times in their own third, and {len(me['punished_fouls'])} "
            f"of them led to a {opp} shot.",
            [i for pair in me["punished_fouls"] for i in pair], 3))
    if them is not None and xg_against > xg_for:
        didnt.append(finding(
            "chance_quality", "The chances went against them",
            f"{opp}'s chances were worth {xg_against:.1f} expected goals against {xg_for:.1f} for {team}.",
            [e.id for e in inside if e.team == opp and e.type in SHOTS][:4], 4))
    if me["shots"] == 0:
        didnt.append(finding(
            "chance_quality", "They did not have a shot",
            f"{team} did not have a shot in the first half.",
            [e.id for e in mine][:3], 3))

    # ---- what to watch: the advice the data gives for the second half
    if entries >= 2 and converted / entries < 0.34:
        watch.append(finding(
            "final_third", "Whether they turn entries into shots",
            f"{team} got into the final third {entries} times and only shot {converted} of those times, so "
            f"the second half shows whether they are getting closer to goal or only closer to the box.",
            me["_entry_evidence"], 3))
    if me["punished_losses"]:
        watch.append(finding(
            "turnovers", "How they protect the ball in their own third",
            f"{team} lost the ball in their own third {len(me['punished_losses'])} times in ways that were "
            f"punished, and that is where the second half can be won or lost.",
            [i for loss in me["punished_losses"] for i in loss][:4], 3))
    if them is not None and xg_against > xg_for:
        watch.append(finding(
            "chance_quality", "How they stop conceding chances",
            f"{opp}'s chances were worth more than {team}'s in the first half, so the second half shows "
            f"whether that changes.",
            [e.id for e in inside if e.team == opp and e.type in SHOTS][:4], 3))
    if me["shots"] == 0:
        watch.append(finding(
            "chance_quality", "Whether they can get a shot away",
            f"{team} had no shot before the break, so the second half shows whether the ball can get "
            f"into the box at all.",
            [e.id for e in mine][:3], 3))

    worked.sort(key=lambda f: -f["weight"])
    didnt.sort(key=lambda f: -f["weight"])
    watch.sort(key=lambda f: -f["weight"])
    score = {team: 0, opp: 0}
    for e in inside:
        if e.type == EventType.GOAL:
            score[e.team] += 1
    return {
        "available": True, "team": team, "opponent": opp,
        "worked": worked[:3], "didnt": didnt[:3], "watch": watch[:3],
        "halftime_score": score,
        "stats": {"shots": me["shots"], "xg_for": xg_for, "xg_against": xg_against,
                  "final_third_entries": entries, "entries_with_shot": converted,
                  "actions": len(mine), "possession": round(share, 3)},
    }


def halftime_insight(events: list[MatchEvent], team: str, brief: dict) -> Insight:
    """The half-time brief as an Insight, so the model words it and the template can too."""
    story: list[str] = []
    evidence: list[str] = []
    for finding in brief["worked"]:
        story.append(f"{finding['title']}: {finding['detail']}")
        evidence += finding["evidence"]
    for finding in brief["didnt"]:
        story.append(f"{finding['title']}: {finding['detail']}")
        evidence += finding["evidence"]
    for finding in brief["watch"]:
        story.append(f"Watch: {finding['detail']}")
        evidence += finding["evidence"]
    if not story:
        story = [f"There is not enough of the first half to say much about {team}."]
    last = max((e for e in events if e.team == team), key=lambda e: e.minute)
    return Insight(kind="halftime_brief", team=team, minute=last.minute,
                   evidence=list(dict.fromkeys(evidence))[:12] or [last.id], facts={"story": story})


# ---------------------------------------------------------------- 3. which tactics, and did they work?

def tactic_verdicts(events: list[MatchEvent], team: str) -> list[dict]:
    """The visible tactics of a team and whether each paid off in this match."""
    opp = _other(team, events)
    index = {e.id: i for i, e in enumerate(events)}
    mine = [e for e in events if e.team == team]
    out: list[dict] = []
    if not mine:
        return out

    defensive = [e for e in mine if e.type in DEFENSIVE]
    if len(defensive) >= 3:
        high = [e for e in defensive if e.x >= 60]
        share = len(high) / len(defensive)
        if share >= 0.4:
            converted = [e for e in high if _punishing_shot(events, index[e.id], team, 20 / 60)]
            ratio = len(converted) / len(high)
            verdict = "worked" if ratio >= 0.3 else "did not work" if not converted else "mixed"
            out.append({"code": "high_press", "title": "High press", "verdict": verdict,
                        "principle": PRINCIPLES["high_press"],
                        "detail": f"{team} won the ball in the final third {len(high)} times "
                                  f"and {len(converted)} of those led to a shot within 20 seconds.",
                        "evidence": [e.id for e in (converted or high)][:4]})
        elif share <= 0.2:
            own, against = team_xg(events, team), team_xg(events, opp)
            share_against = against / (own + against) if own + against else 0.5
            verdict = "worked" if share_against <= 0.45 else "did not work" if share_against > 0.55 else "mixed"
            out.append({"code": "deep_defence", "title": "Deep defending", "verdict": verdict,
                        "principle": PRINCIPLES["deep_defence"],
                        "detail": f"{team} won the ball mostly in their own half, and {_poss(opp)} chances were worth "
                                  f"{against:.1f} expected goals to {_poss(team)} {own:.1f}.",
                        "evidence": [e.id for e in defensive][:4]})

    info = team_metrics(events, team)
    all_events = len(events)
    possession = len(mine) / all_events if all_events else 0.5
    if possession >= 0.55 and info["final_third_entries"] >= 3:
        ratio = info["entries_with_shot"] / info["final_third_entries"]
        verdict = "worked" if ratio >= 0.5 else "did not work" if ratio <= 0.34 else "mixed"
        out.append({"code": "possession", "title": "Possession game", "verdict": verdict,
                    "principle": PRINCIPLES["possession"],
                    "detail": f"{team} made {_pct(possession)} of the recorded actions and reached the final "
                              f"third {info['final_third_entries']} times, but only {info['entries_with_shot']} "
                              f"of those spells ended in a shot.",
                    "evidence": info["_entry_evidence"]})
    elif possession <= 0.45:
        counters = [i for i in detect_counter_attacks(events) if i.team == team]
        if counters:
            out.append({"code": "counter", "title": "Counter-attacking", "verdict": "worked",
                        "principle": PRINCIPLES["counter"],
                        "detail": f"{team} had less of the ball but won it and reached a shot or goal "
                                  f"{len(counters)} {'time' if len(counters) == 1 else 'times'} within seconds.",
                        "evidence": counters[0].evidence[:4]})
        else:
            out.append({"code": "counter", "title": "Counter-attacking", "verdict": "did not work",
                        "principle": PRINCIPLES["counter"],
                        "detail": f"{team} had less of the ball but no break after winning it reached a shot.",
                        "evidence": [e.id for e in defensive][:3] or [mine[0].id]})
    return out


def formation_estimate(events: list[MatchEvent], team: str, min_touches: int = 6) -> dict:
    """A rough shape (defence-midfield-attack) from where players touched the ball. Needs plenty of data."""
    by_player: dict[str, list[MatchEvent]] = {}
    for e in events:
        if e.team == team and e.player:
            by_player.setdefault(e.player, []).append(e)
    regulars = sorted((p for p in by_player.values() if len(p) >= min_touches), key=len, reverse=True)[:10]
    if len(regulars) < 10:
        return {"available": False,
                "reason": f"Only {len(regulars)} players have {min_touches} or more actions, so a formation "
                          f"would be a guess. This feed has no player positions or line-ups."}
    spots = sorted(sum(e.x for e in p) / len(p) for p in regulars)
    gaps = sorted(range(1, 10), key=lambda i: spots[i] - spots[i - 1], reverse=True)
    cuts = sorted(i for i in gaps if 2 <= i <= 8)[:2]
    if len(cuts) < 2 or cuts[1] - cuts[0] < 2:
        return {"available": False, "reason": "The players do not fall into clear lines."}
    lines = [cuts[0], cuts[1] - cuts[0], 10 - cuts[1]]
    return {"available": True, "shape": "-".join(map(str, lines)),
            "note": "Estimated from where outfield players touched the ball; not an official line-up."}


def tactical_report(events: list[MatchEvent], team: str) -> dict | None:
    if not any(e.team == team for e in events):
        return None
    shifts = half_shifts(events, team)
    return {"team": team, "tactics": tactic_verdicts(events, team), "second_half": shifts,
            "second_half_story": shift_story(team, shifts), "formation": formation_estimate(events, team)}


def tactics_insight(events: list[MatchEvent], team: str) -> Insight | None:
    """The tactical report as an Insight, so the model words it and the template can too."""
    report = tactical_report(events, team)
    if report is None:
        return None
    story: list[str] = []
    evidence: list[str] = []
    for t in report["tactics"]:
        verdict = {"worked": "it worked", "did not work": "it did not work",
                   "mixed": "the result was mixed"}[t["verdict"]]
        story.append(f"{t['title']}: {t['detail']} Verdict: {verdict}.")
        evidence += t["evidence"]
    story += report["second_half_story"]
    shifts = report["second_half"]
    if shifts.get("available"):
        for c in shifts["changes"][:3]:
            evidence += c["evidence"]
    if report["formation"]["available"]:
        story.append(f"{team} lined up roughly as a {report['formation']['shape']}.")
    if not story:
        story = [f"There is not enough play from {team} to judge their tactics."]
    last = max((e for e in events if e.team == team), key=lambda e: e.minute)
    return Insight(kind="tactics_report", team=team, minute=last.minute,
                   evidence=list(dict.fromkeys(evidence))[:12] or [last.id], facts={"story": story})


# ---------------------------------------------------------------- 4. why the result went one way

def match_factors(events: list[MatchEvent]) -> list[dict]:
    """The reasons behind the result, strongest first. Each one favours a team and cites its evidence."""
    teams = list(dict.fromkeys(e.team for e in events))
    if len(teams) < 2:
        return []
    a, b = teams[0], teams[1]
    out: list[dict] = []

    def add(code, weight, team, effect, title, detail, evidence):
        favours = team if effect == "helped" else (b if team == a else a)
        out.append({"code": code, "weight": weight, "team": team, "effect": effect, "favours": favours,
                    "title": title, "detail": detail, "principle": PRINCIPLES[code.split(":")[0]],
                    "evidence": list(dict.fromkeys(evidence))[:6]})

    xg = {t: team_xg(events, t) for t in teams}
    shot_ids = {t: [e.id for e in events if e.team == t and e.type in SHOTS] for t in teams}
    if abs(xg[a] - xg[b]) >= 0.3:
        lead, other = (a, b) if xg[a] > xg[b] else (b, a)
        add("chance_quality", 4, lead, "helped", "Better chances",
            f"{_poss(lead)} shots were worth {xg[lead]:.1f} expected goals against {_poss(other)} {xg[other]:.1f}, "
            f"so they created the better chances.", shot_ids[lead])
    goals = {t: sum(e.type == EventType.GOAL and e.team == t for e in events) for t in teams}
    for t in teams:
        gap = goals[t] - xg[t]
        goal_ids = [e.id for e in events if e.team == t and e.type == EventType.GOAL] or shot_ids[t]
        if gap >= 0.8:
            add("finishing:" + t, 3, t, "helped", "Clinical finishing",
                f"{t} scored {goals[t]} from chances worth {xg[t]:.1f} expected goals.", goal_ids)
        elif -gap >= 0.8 and shot_ids[t]:
            add("finishing:" + t, 3, t, "held back", "Wasteful finishing",
                f"{t} scored {goals[t]} from chances worth {xg[t]:.1f} expected goals.", shot_ids[t])

    for t in teams:
        m = team_metrics(events, t)
        if len(m["punished_losses"]) >= 2:
            add("turnovers:" + t, 3, t, "held back", "Costly turnovers",
                f"{t} lost the ball in their own third {len(m['punished_losses'])} times in ways that gave "
                f"{m['opponent']} a shot within 15 seconds.", [i for loss in m["punished_losses"] for i in loss])
        if len(m["own_third_fouls"]) >= 2 and m["punished_fouls"]:
            add("discipline:" + t, 2, t, "held back", "Fouls in dangerous areas",
                f"{t} fouled {len(m['own_third_fouls'])} times in their own third and "
                f"{len(m['punished_fouls'])} led to a {m['opponent']} shot.",
                [i for pair in m["punished_fouls"] for i in pair])
        for tactic in tactic_verdicts(events, t):
            if tactic["code"] == "high_press" and tactic["verdict"] != "mixed":
                good = tactic["verdict"] == "worked"
                add("high_press:" + t, 2, t, "helped" if good else "held back",
                    "A high press that worked" if good else "A high press that did not pay off",
                    tactic["detail"], tactic["evidence"])
        shifts = half_shifts(events, t)
        if shifts.get("available") and shifts["changes"] and shifts["effect"] != "no clear effect":
            good = shifts["effect"] == "worked"
            top = shifts["changes"][0]
            add("shift:" + t, 3, t, "helped" if good else "held back",
                f"Second-half change {'that worked' if good else 'that backfired'}",
                f"{top['detail']} After the change, the balance of chances moved "
                f"{'towards' if good else 'against'} {t}.",
                [i for c in shifts["changes"][:2] for i in c["evidence"]])

    for spell in detect_shot_pressure(events):
        add("pressure:" + spell.id, 2, spell.team, "helped", "Sustained pressure",
            f"{spell.team} had {spell.facts['shots']} shots in {spell.facts['span_min']} "
            f"{'minute' if spell.facts['span_min'] == 1 else 'minutes'} starting at minute {int(spell.minute)}.",
            spell.evidence)

    metrics = {t: team_metrics(events, t) for t in teams}
    rate = {t: (m["entries_with_shot"] / m["final_third_entries"] if m["final_third_entries"] >= 3 else None)
            for t, m in metrics.items()}
    if rate[a] is not None and rate[b] is not None and abs(rate[a] - rate[b]) >= 0.25:
        lead, other = (a, b) if rate[a] > rate[b] else (b, a)
        add("final_third:" + lead, 2, lead, "helped", "Made more of their attacks",
            f"{lead} turned {metrics[lead]['entries_with_shot']} of {metrics[lead]['final_third_entries']} "
            f"spells in the final third into a shot; {other} managed {metrics[other]['entries_with_shot']} "
            f"of {metrics[other]['final_third_entries']}.", metrics[lead]["_entry_evidence"])

    creators = {t: [] for t in teams}
    for i, e in enumerate(events):
        if e.type == EventType.PASS:
            q = pass_quality(events, i)
            if q and any(r["code"] == "led_to_shot" for r in q["reasons"]):
                creators[e.team].append(e.id)
    if abs(len(creators[a]) - len(creators[b])) >= 2:
        lead, other = (a, b) if len(creators[a]) > len(creators[b]) else (b, a)
        add("creativity:" + lead, 2, lead, "helped", "Passes that created shots",
            f"{lead} had {len(creators[lead])} passes that led straight to a shot, against {len(creators[other])} "
            f"for {other}.", creators[lead])

    shares = {t: sum(e.team == t for e in events) / len(events) for t in teams}
    if abs(shares[a] - shares[b]) >= 0.10:
        lead = a if shares[a] > shares[b] else b
        add("territory", 1, lead, "helped", "More of the ball",
            f"{lead} made {_pct(shares[lead])} of the recorded actions.",
            [e.id for e in events if e.team == lead][:3])
    return sorted(out, key=lambda f: (-f["weight"], f["code"]))


def factors_summary(factors: list[dict], winner: str | None, limit: int = 3) -> str:
    """One paragraph of reasons that explain the result (or the draw)."""
    if not factors:
        return ""
    if winner:
        loser_help = [f for f in factors if f["favours"] == winner]
        text = [f["detail"] for f in loser_help[:limit]]
        against = [f for f in factors if f["favours"] != winner]
        if against:
            text.append(f"Going the other way: {against[0]['detail']}")
        return " ".join(text)
    return " ".join(f["detail"] for f in factors[:limit])


# ---------------------------------------------------------------- 5. who is going to win?

PRIOR_GOALS_PER_90 = 1.35        # a typical team's goals in a match; the starting assumption
PRIOR_MINUTES = 45               # how many minutes of play the starting assumption is worth
MATCH_MINUTES = 90.0


def _poisson(k: int, lam: float) -> float:
    return math.exp(-lam) * lam ** k / math.factorial(k)


def win_probability(events: list[MatchEvent], minute: float | None = None) -> dict:
    """Chance of each result, from the score so far and how good each team's chances have been.

    Each team's scoring rate is the expected goals of its shots so far, blended with a typical rate.
    The goals still to come are then modelled as Poisson. It is a simple, explainable model, not a
    trained one, so read the numbers as a guide.
    """
    teams = list(dict.fromkeys(e.team for e in events))
    if len(teams) < 2:
        return {"available": False, "reason": "Two teams are needed to predict a result."}
    a, b = teams[0], teams[1]
    now = _last_minute(events) if minute is None else minute
    seen = [e for e in events if e.minute <= now]
    goals = {t: sum(e.type == EventType.GOAL and e.team == t for e in seen) for t in teams}
    xg = {t: team_xg(seen, t) for t in teams}
    remaining = max(MATCH_MINUTES - now, 0.0)
    if remaining < 1:
        remaining = 0.0                   # the final whistle: nothing left to play
    rate = {t: (xg[t] + PRIOR_GOALS_PER_90 / MATCH_MINUTES * PRIOR_MINUTES) / (now + PRIOR_MINUTES) for t in teams}
    lam = {t: rate[t] * remaining for t in teams}

    win = {a: 0.0, b: 0.0, "draw": 0.0}
    for i in range(11):
        for j in range(11):
            p = _poisson(i, lam[a]) * _poisson(j, lam[b])
            diff = goals[a] + i - goals[b] - j
            win[a if diff > 0 else b if diff < 0 else "draw"] += p
    total = sum(win.values()) or 1.0
    percent = {k: round(v / total * 100) for k, v in win.items()}
    percent["draw"] = 100 - percent[a] - percent[b]

    reasons = []
    if goals[a] != goals[b]:
        lead, trail = (a, b) if goals[a] > goals[b] else (b, a)
        reasons.append(f"{lead} lead {goals[lead]}-{goals[trail]}"
                       f"{' with little time left' if 0 < remaining <= 15 else ''}.")
    elif now > 0:
        reasons.append(f"The score is level at {goals[a]}-{goals[b]}.")
    if abs(xg[a] - xg[b]) >= 0.2:
        better, worse = (a, b) if xg[a] > xg[b] else (b, a)
        reasons.append(f"{_poss(better)} chances so far are worth {xg[better]:.1f} expected goals against "
                       f"{_poss(worse)} {xg[worse]:.1f}.")
    elif now > 0:
        reasons.append("Both teams have created chances of similar quality.")
    if remaining > 0:
        reasons.append(f"About {round(remaining)} minutes remain, so the result can still change.")
    else:
        reasons.append("The match is over, so the result is settled.")
    favourite = max((a, b, "draw"), key=lambda k: percent[k])
    return {"available": True, "minute": round(now, 1), "teams": [a, b], "score": goals,
            "probabilities": percent, "favourite": favourite,
            "expected_goals_so_far": xg, "minutes_left": round(remaining),
            "reasons": reasons,
            "method": "Score so far plus the quality of each team's chances, projected over the minutes left."}


def win_timeline(events: list[MatchEvent], step: int = 5) -> list[dict]:
    """Win probability every few minutes, for a chart. Minute 0 is the starting assumption."""
    last = _last_minute(events)
    minutes = list(range(0, int(last) + 1, step)) + [last]
    out = []
    for m in dict.fromkeys(minutes):
        p = win_probability(events, m)
        if p.get("available"):
            out.append({"minute": p["minute"], "probabilities": p["probabilities"]})
    return out
