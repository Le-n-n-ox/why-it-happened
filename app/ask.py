"""Ask the match: free-form questions answered from the rule engine, never from the model's memory.

Why a model at all? Every NUMBER in this app comes from plain rules and arithmetic, and could be
produced without a model. What equations cannot do is the language part:

  1. understand an open question ("how did Blues get back into it?") and pick which analyses bear on it
  2. choose and order the few findings that answer THAT question out of dozens, and link them as an argument
  3. say plainly when the data cannot answer ("why did the coach make that change?")

So the model does exactly those three things, in two steps. Step 1 (router) turns the question into a
list of analyses to run, from a fixed catalogue. Step 2 (writer) answers from the facts those analyses
return and may cite only their evidence ids. The same guards as everywhere else apply (citations, numbers,
names). If the model is off or fails, a keyword router and a plain join of the facts take over, which is
also what `mode=rules` forces, so you can put the two answers side by side.
"""
import json
import os
import re

from app.assessment import assess_team
from app.causes import foul_explanations, why_they_won
from app.detectors import Insight
from app.events import EventType, MatchEvent
from app.narrator import (KNOWN_PLAYERS, LANGUAGE_NAMES, _chat, _facts_text, _record_model_result,
                          ensure_citations, model_available, names_are_grounded, numbers_are_grounded)
from app.players import player_stats, review_insight, slug
from app.tactics import (half_shifts, match_factors, pass_quality, shift_story, tactical_report,
                         win_probability)

CATALOGUE = {
    "match_summary": "why the match ended as it did: the football factors and the cause of each goal",
    "team_tactics": "the tactics a team visibly used and whether each worked (needs team)",
    "second_half_change": "whether a team played differently after half-time and whether it helped (needs team)",
    "team_assessment": "how well a team played, its strengths, problems and what to change (needs team)",
    "win_probability": "who is likely to win, from the score and chance quality (optional minute)",
    "best_passes": "the passes that created the most, and why they were good (optional team)",
    "fouls": "fouls, what led to them and what followed (optional team)",
    "player": "what one player did that mattered (needs player)",
}

ROUTER_SYSTEM = (
    "You decide which analyses to run to answer a fan's question about ONE football match. "
    "Reply with JSON only, no other text: {{\"answerable\": true|false, \"analyses\": [{{\"name\": ..., "
    "\"team\": ..., \"player\": ..., \"minute\": ...}}]}}. Use only these analysis names:\n{catalogue}\n"
    "Teams: {teams}. Add team, player or minute only when the analysis needs them or the question names them. "
    "Choose at most three analyses. If the question asks for something these analyses cannot show "
    "(what a coach intended or said, injuries, other matches, transfers, opinions about people), reply "
    "{{\"answerable\": false, \"analyses\": []}}."
)

FOLLOW_UP_SYSTEM = (
    "You are resolving a follow-up question about ONE football match. You are given the previous question "
    "and the new one. Reply with JSON only: {{\"question\": \"<the new question, written so that it stands "
    "on its own>\"}}. Keep everything the new question says and fill in what 'it', 'they', 'that' or 'them' "
    "refers to, using the previous question. Add nothing that neither question says, and add no numbers. "
    "If the new question already stands on its own, return it unchanged."
)

ANSWER_SYSTEM = (
    "You answer a fan's question about one football match in {language}. Use ONLY the facts in the JSON. "
    "Answer the question directly in at most four short sentences: pick only the facts that bear on it and "
    "link them as an argument with words like 'because', 'so' or 'which led to'. If the facts do not contain "
    "the answer, say plainly what the data cannot show and give only what it can. Never say what anyone "
    "intended or felt. Do not invent names, numbers, tactics or causes. End with evidence ids in square "
    "brackets, e.g. [d1, d2], using only ids from 'evidence'."
)


# ---------------------------------------------------------------- facts: every analysis returns [{text, evidence}]

def _teams(events: list[MatchEvent]) -> list[str]:
    return list(dict.fromkeys(e.team for e in events))


def _fact(text: str, evidence: list[str]) -> dict:
    return {"text": text, "evidence": list(dict.fromkeys(evidence))}


def _team_ids(events, team, n=2):
    return [e.id for e in events if e.team == team][-n:]


def _run(name: str, args: dict, events: list[MatchEvent], found: list[Insight]) -> list[dict]:
    team = args.get("team")
    if name == "match_summary":
        facts = [_fact(f["detail"], f["evidence"]) for f in match_factors(events)[:4]]
        facts += [_fact(r["text"], r["evidence"]) for r in why_they_won(events, found)["reasons"]]
        return facts
    if name == "team_tactics" and team:
        report = tactical_report(events, team)
        facts = [_fact(f"{t['title']}: {t['detail']} Verdict: {t['verdict']}.", t["evidence"])
                 for t in report["tactics"]]
        return facts or [_fact(f"No single tactic stands out for {team}.", _team_ids(events, team))]
    if name == "second_half_change" and team:
        shifts = half_shifts(events, team)
        ids = [i for c in shifts.get("changes", []) for i in c["evidence"]] or _team_ids(events, team)
        lines = shift_story(team, shifts) or [shifts.get("reason", "No half-time comparison is possible yet.")]
        return [_fact(line, ids) for line in lines]
    if name == "team_assessment" and team:
        report = assess_team(events, team)
        if report is None:
            return []
        facts = [_fact(f"{team} are {report['verdict']} ({report['score']} on the checks).", _team_ids(events, team))]
        facts += [_fact(s["detail"], s["evidence"] or _team_ids(events, team)) for s in report["strengths"][:2]]
        facts += [_fact(f"{i['detail']} {i['advice']}", i["evidence"]) for i in report["issues"][:3]]
        return facts
    if name == "win_probability":
        p = win_probability(events, args.get("minute"))
        if not p.get("available"):
            return []
        a, b = p["teams"]
        pr = p["probabilities"]
        text = f"At minute {round(p['minute'])}: {a} {pr[a]}%, draw {pr['draw']}%, {b} {pr[b]}%."
        ids = [e.id for e in events if e.type in (EventType.GOAL,) and e.minute <= p["minute"]][-3:] or [events[0].id]
        return [_fact(text, ids)] + [_fact(r, ids) for r in p["reasons"]]
    if name == "best_passes":
        out = []
        for i, e in enumerate(events):
            if e.type != EventType.PASS or (team and e.team != team):
                continue
            q = pass_quality(events, i)
            if q and q["rating"] == "excellent":
                out.append(_fact(f"At {int(e.minute)}' " + " ".join(r["text"] for r in q["reasons"][:2]), q["evidence"]))
        return out[:3]
    if name == "fouls":
        return [_fact(f["why"], f["evidence"]) for f in foul_explanations(events, found)
                if not team or f["team"] == team][:4]
    if name == "player" and args.get("player"):
        player = args["player"]
        owner = next((e.team for e in events if e.player == player), None)
        insight = review_insight(events, slug(owner, player), found) if owner else None
        if insight is None:
            return []
        stats = player_stats(events, found)[slug(owner, player)]
        lines = insight.facts["story"] or [
            f"{player} ({owner}) had {stats['touches']} touches but was not part of any key move."]
        return [_fact(line, insight.evidence) for line in lines]
    return []


# ---------------------------------------------------------------- routers

def _clean_plan(raw_items, events, players: set[str]) -> list[dict]:
    """Keep only analyses from the catalogue, with teams, players and minutes that really exist."""
    teams = {t.casefold(): t for t in _teams(events)}
    plan = []
    for item in raw_items or []:
        if not isinstance(item, dict) or item.get("name") not in CATALOGUE:
            continue
        args = {"name": item["name"]}
        team = teams.get(str(item.get("team", "")).casefold())
        if team:
            args["team"] = team
        if item.get("player") in players:
            args["player"] = item["player"]
        if isinstance(item.get("minute"), (int, float)) and 0 <= item["minute"] <= 130:
            args["minute"] = float(item["minute"])
        needs_team = item["name"] in ("team_tactics", "second_half_change", "team_assessment")
        if needs_team and "team" not in args:
            plan += [{**args, "team": t} for t in _teams(events)]
        elif item["name"] != "player" or "player" in args:
            plan.append(args)
        if len(plan) >= 4:
            break
    return plan[:4]


def keyword_plan(question: str, events: list[MatchEvent], focus: str | None = None) -> list[dict]:
    """The rules-only router: fixed phrases, no understanding."""
    q = question.casefold()
    teams = [t for t in _teams(events) if t.casefold() in q] or ([focus] if focus else []) or _teams(events)
    names = [n for n in sorted({e.player for e in events if e.player}) if n.casefold() in q
             or n.split()[-1].casefold() in re.findall(r"[\w']+", q)]
    plan: list[dict] = []
    if names:
        plan.append({"name": "player", "player": names[0]})
    # "why did the match end as it did" and "how did it finish" ask for the summary, like "who won".
    if re.search(r"\b(won|win|winner|result|score|end(?:s|ed|ing)?|finish(?:es|ed|ing)?|happen(?:s|ed|ing)?)\b"
                 r"|why .*\b(win|lose|end|finish)", q):
        plan.append({"name": "match_summary"})
    if re.search(r"tactic|press|style|formation|defend", q):
        plan += [{"name": "team_tactics", "team": t} for t in teams]
    if re.search(r"half|changed|change|switch", q):
        plan += [{"name": "second_half_change", "team": t} for t in teams]
    if re.search(r"predict|likely|going to win|probab|chance of winning", q):
        plan.append({"name": "win_probability"})
    if re.search(r"\bpass", q):
        plan.append({"name": "best_passes", **({"team": teams[0]} if len(teams) == 1 else {})})
    if re.search(r"foul|discipline|booking", q):
        plan.append({"name": "fouls", **({"team": teams[0]} if len(teams) == 1 else {})})
    if re.search(r"improve|should|advice|weak|problem|struggl|how well|playing well", q):
        plan += [{"name": "team_assessment", "team": t} for t in teams]
    return plan[:4]


def _json_object(text: str):
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in the router reply")
    return json.loads(text[start:end + 1])


def model_plan(model: str, question: str, events: list[MatchEvent], focus: str | None = None) -> tuple[list[dict], bool]:
    system = ROUTER_SYSTEM.format(
        catalogue="\n".join(f"- {name}: {text}" for name, text in CATALOGUE.items()),
        teams=", ".join(_teams(events)))
    if focus:
        system += f" The question follows an earlier one about {focus}, so that is the team it is about."
    reply = _chat(model, [{"role": "system", "content": system},
                          {"role": "user", "content": question}], "ask router", max_tokens=200)
    data = _json_object(reply)
    plan = _clean_plan(data.get("analyses"), events, KNOWN_PLAYERS)
    return plan, bool(data.get("answerable", True)) and bool(plan)


# ---------------------------------------------------------------- follow-up questions

FOLLOW_UP_START = re.compile(r"^(and|also|then|what about|how about|and what|and how|and why|and who|and in)\b")
FOLLOW_UP_PRONOUN = re.compile(r"\b(it|its|they|their|them|that|those|this)\b")


def looks_like_followup(question: str, previous: str | None) -> bool:
    """Does this question lean on the one before it?"""
    if not previous:
        return False
    q = question.casefold().strip()
    if FOLLOW_UP_START.match(q):
        return True
    return bool(FOLLOW_UP_PRONOUN.search(q))


def focus_team(question: str, previous: str | None, events: list[MatchEvent]) -> str | None:
    """The team the earlier question was about, when the new one does not name one."""
    if not previous:
        return None
    q, prev = question.casefold(), previous.casefold()
    teams = _teams(events)
    if any(t.casefold() in q for t in teams):
        return None
    named = [t for t in teams if t.casefold() in prev]
    return named[0] if len(named) == 1 else None


def resolve_followup(model: str, question: str, previous: str) -> str | None:
    """The model rewrites a follow-up so it stands alone. It only resolves the reference."""
    try:
        reply = _chat(model, [{"role": "system", "content": FOLLOW_UP_SYSTEM},
                              {"role": "user", "content": json.dumps({"previous": previous, "question": question})}],
                      "ask follow-up", max_tokens=200)
        resolved = str(_json_object(reply).get("question", "")).strip()
    except Exception as exc:
        print(f"[DEBUG] ask follow-up failed ({exc}); using the question as it stands")
        return None
    return resolved[:300] or None


# ---------------------------------------------------------------- answer

def _join(facts: list[dict], limit: int = 4) -> str:
    chosen = facts[:limit]
    ids = list(dict.fromkeys(i for f in chosen for i in f["evidence"]))
    return " ".join(f["text"] for f in chosen) + (f" [{', '.join(ids)}]" if ids else "")


def answer(events: list[MatchEvent], found: list[Insight], question: str, lang: str = "en",
           mode: str = "auto", model: str | None = None, previous: str | None = None) -> dict:
    question = question.strip()[:300]
    out = {"question": question, "mode": "rules", "router": "keywords", "analyses": [], "facts": [],
           "evidence": [], "answerable": False, "answer": ""}
    if not events or not question:
        out["answer"] = "There is no match data to answer from yet."
        return out

    use_model = bool(mode != "rules" and model and os.getenv("NVIDIA_API_KEY") and model_available())

    # A follow-up leans on the question before it: the model resolves what "it" means, and the rules
    # keep the team the earlier question was about.
    follow_up = looks_like_followup(question, previous)
    focus = focus_team(question, previous, events) if follow_up else None
    working = question
    if follow_up and previous:
        resolved = resolve_followup(model, question, previous) if use_model else None
        working = resolved or question
    out["follow_up"] = follow_up
    out["resolved"] = working

    plan, answerable = [], True
    if use_model:
        try:
            plan, answerable = model_plan(model, working, events, focus)
            out["router"] = "model"
            _record_model_result(True)
        except Exception as exc:
            _record_model_result(False, exc)
            print(f"[DEBUG] ask router failed ({exc}); using the keyword router")
            use_model = False
    if not use_model:
        plan = keyword_plan(working, events, focus)
        answerable = bool(plan)

    facts: list[dict] = []
    for step in plan:
        facts += _run(step["name"], step, events, found)
    out["analyses"] = plan
    out["facts"] = facts
    out["evidence"] = list(dict.fromkeys(i for f in facts for i in f["evidence"]))
    out["answerable"] = bool(facts) and answerable

    if not out["answerable"]:
        out["answer"] = ("The match data cannot answer that. It records passes, carries, shots, goals, tackles, "
                         "interceptions and fouls, so it can show what happened and why, but not what anyone "
                         "intended or anything outside this match.")
        return out

    if use_model and model_available():
        insight = Insight(kind="answer", team="", minute=0.0, evidence=out["evidence"] or [events[0].id],
                          facts={"story": [f["text"] for f in facts] + [question]})
        payload = {"question": question, "facts": [f["text"] for f in facts], "evidence": insight.evidence}
        try:
            text = _chat(model, [
                {"role": "system", "content": ANSWER_SYSTEM.format(language=LANGUAGE_NAMES.get(lang, lang))},
                {"role": "user", "content": json.dumps(payload)}], "ask answer", max_tokens=400)
            text = ensure_citations(text, insight)
            if not numbers_are_grounded(text, insight):
                raise ValueError("answer used a number that is not in the facts")
            if not names_are_grounded(text, _facts_text(insight)):
                raise ValueError("answer named a player who is not in the facts")
            _record_model_result(True)
            out.update(answer=text, mode="model")
            return out
        except Exception as exc:
            _record_model_result(False, exc)
            print(f"[DEBUG] ask answer failed ({exc}); joining the facts instead")
    out["answer"] = _join(facts)
    return out