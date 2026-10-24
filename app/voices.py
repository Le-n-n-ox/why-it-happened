"""One match, written for the side of the story each audience came for.

The rules find the facts once. Each voice then gets its own brief from app.audience:

    fan        the score, their club's mood, the goals and key moments, their player
    announcer  a timed cue sheet: what happened, when, and who to name
    analyst    the measured factors, each team's numbers and the chosen metric
    player     one player's involvement, rating and moments

The model may only word the brief it was given, and the same guards apply to every voice: real
evidence ids, every number in the brief, and no player name the brief does not mention. A fan's
brief deliberately has no measured numbers, so a fan's answer cannot become an analyst's answer
with different adjectives.
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor

from app import audience
from app.detectors import Insight
from app.events import MatchEvent
from app.narrator import (LANGUAGE_NAMES, _chat, _facts_text, ensure_citations, model_available,
                          names_are_grounded, numbers_are_grounded)

VOICE_SYSTEM = {
    "fan": (
        "You are a football fan talking about the match you just watched, in {language}. "
        "The JSON brief is YOUR side of the story: your club, the mood, the goals and your player. "
        "It deliberately contains no measured numbers. Do not use any number except the score and "
        "the minute. Do not claim one side dominated or controlled the play: you were not given "
        "possession numbers. Write two or three sentences: the feeling first, then the moments that explain "
        "it, in plain, excited or disappointed language. Never say what anyone intended, felt or "
        "said about the tactics. End with the evidence ids exactly as written in the brief's `evidence` list, in square brackets."
    ),
    "announcer": (
        "You are a television commentator calling the match, in {language}. "
        "The JSON brief is your cue sheet: the score, the names and the moments with their minutes. "
        "Write two or three sentences to say live, in a broadcaster's voice: the result, then the "
        "cues in order. Use only the names and numbers in the brief. Never say what anyone intended. "
        "End with the evidence ids exactly as written in the brief's `evidence` list, in square brackets."
    ),
    "analyst": (
        "You are a football analyst writing the match review, in {language}. "
        "The JSON brief is your side of the story: the measured factors, each team's numbers and "
        "the metric the viewer chose. `chance_quality` is the correct reading of which side created "
        "the better chances; never contradict it. Use the numbers precisely and neutrally: what the "
        "result was, which patterns produced it, and how the balance of play looked. Never say what "
        "anyone intended or believed. End with the evidence ids exactly as written in the brief's `evidence` list, in square brackets."
    ),
    "player": (
        "You are a football writer following one player for a viewer who chose them, in {language}. "
        "The JSON brief is your side of the story: that player's match, their numbers, rating and "
        "moments. Write two or three sentences about their match and what it meant for the result. "
        "Use only the names and numbers in the brief. Never say what anyone intended or felt. "
        "End with the evidence ids exactly as written in the brief's `evidence` list, in square brackets."
    ),
}

VOICE_LABELS = {
    "fan": "A fan",
    "announcer": "An announcer",
    "analyst": "An analyst",
    "player": "Following a player",
}


def voices(events: list[MatchEvent], found: list[Insight], model: str | None = None,
           lang: str = "en", profile: audience.Profile | None = None) -> dict:
    """The same match, but each voice is given a different side of it."""
    resolved = audience.resolve(profile or audience.Profile(lang=lang), events, found)
    modes = ["fan", "announcer", "analyst"]
    if resolved.players:
        modes.append("player")
    briefs = {mode: audience.build_brief(events, found, resolved, mode) for mode in modes}
    use_model = bool(model and os.getenv("NVIDIA_API_KEY") and model_available())
    team = resolved.clubs[0] if resolved.clubs else ""

    def write(mode: str) -> dict:
        brief = briefs[mode]
        evidence = list(brief.get("evidence") or [])
        if not evidence:
            evidence = [event.id for event in events[:3]]
        insight = Insight(kind="match_voices", team=team, minute=0.0, evidence=evidence, facts=brief)
        allowed = _facts_text(insight)
        text = ""
        if use_model:
            try:
                reply = _chat(model, [
                    {"role": "system",
                     "content": VOICE_SYSTEM[mode].format(language=LANGUAGE_NAMES.get(lang, lang))},
                    {"role": "user", "content": json.dumps(brief, ensure_ascii=False)}],
                    f"voices {mode}", max_tokens=300)
                text = ensure_citations(reply, insight)
                if not numbers_are_grounded(text, insight):
                    raise ValueError("the voice used a number that is not in its brief")
                if not names_are_grounded(text, allowed):
                    raise ValueError("the voice named a player who is not in its brief")
            except Exception as exc:
                print(f"[DEBUG] the {mode} voice failed ({exc}); using its plain brief")
                text = ""
        if not text:
            text = audience.fallback_line(mode, brief) + f" [{', '.join(evidence)}]"
        return {"voice": mode, "label": VOICE_LABELS[mode], "text": text, "evidence": evidence,
                "brief": brief, "inputs": sorted(brief.keys())}

    # The voices never depend on each other, so wait for the slowest wording, not the sum of four.
    with ThreadPoolExecutor(max_workers=max(1, len(modes))) as pool:
        out = list(pool.map(write, modes))
    return {
        "voices": out,
        "profile": resolved.as_dict(),
        "primary": resolved.profile.mode if resolved.profile.mode in modes else "fan",
        "note": ("Each voice gets a different brief: the fan the story and their club, the announcer "
                 "the timed cues, the analyst the measured factors, the player that player's match. "
                 "The guards are the same for all, so no voice can add a fact it was not given."),
    }
