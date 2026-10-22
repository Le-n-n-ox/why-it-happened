"""The same facts, written for a fan, an announcer or an analyst.

The rules find the facts once. The model then writes them three ways, and the same guards apply to
each: the ids must be real, every number must be in the facts, and no player may be named unless the
facts name them. Only the wording changes: the three answers are about the same match and the same
evidence.
"""
import json
import os

from app.causes import why_they_won
from app.detectors import Insight
from app.events import MatchEvent
from app.matchinfo import match_info
from app.narrator import (LANGUAGE_NAMES, _chat, _facts_text, ensure_citations, model_available,
                          names_are_grounded, numbers_are_grounded)
from app.tactics import match_factors

VOICE_SYSTEM = {
    "fan": (
        "You are a football fan writing about the match you just watched, in {language}. "
        "Use ONLY the facts in the JSON payload. Write two or three sentences: the feeling first, then "
        "the facts that explain it, in plain excited or disappointed language. Never say what anyone "
        "intended, felt or said about the tactics. Do not invent numbers, players, events or reasons. "
        "End with the evidence ids in square brackets, e.g. [e1, e2]."
    ),
    "announcer": (
        "You are a television commentator calling the end of the match, in {language}. "
        "Use ONLY the facts in the JSON payload. Write two or three sentences as if you were saying it "
        "live: the result, then the moments that made it, in a broadcaster's voice. Never say what "
        "anyone intended. Do not invent numbers, players, events or reasons. "
        "End with the evidence ids in square brackets, e.g. [e1, e2]."
    ),
    "analyst": (
        "You are a football analyst writing the match review, in {language}. "
        "Use ONLY the facts in the JSON payload. Write two or three sentences: what the result was, which "
        "patterns produced it, and how the balance of the two teams' play looked. Be precise and "
        "neutral. Never say what anyone intended or believed. Do not invent numbers, players, events, "
        "tactics or reasons. End with the evidence ids in square brackets, e.g. [e1, e2]."
    ),
}

VOICE_LABELS = {"fan": "A fan", "announcer": "An announcer", "analyst": "An analyst"}


def _story(events: list[MatchEvent], found: list[Insight]) -> tuple[list[str], list[str]]:
    """The facts every voice gets: the result and the reasons behind it."""
    info = match_info(events)
    result = why_they_won(events, found)
    home, away = info.get("home"), info.get("away")
    score = info.get("score", {})
    if home and away:
        lines = [f"{home} {score.get(home, 0)}-{score.get(away, 0)} {away} was the final score."]
    else:
        lines = ["The match is over."]
    evidence: list[str] = []
    for reason in result["reasons"][:3]:
        lines.append(reason["text"])
        evidence += reason["evidence"][:4]
    for factor in match_factors(events)[:3]:
        lines.append(factor["detail"])
        evidence += factor["evidence"][:4]
    return lines, list(dict.fromkeys(evidence))[:12]


def voices(events: list[MatchEvent], found: list[Insight], model: str | None = None,
           lang: str = "en") -> dict:
    """The same match facts, written three ways."""
    story, evidence = _story(events, found)
    if not evidence:
        evidence = [e.id for e in events[:3]]
    insight = Insight(kind="match_voices", team="", minute=0.0, evidence=evidence, facts={"story": story})
    allowed = _facts_text(insight)
    use_model = bool(model and os.getenv("NVIDIA_API_KEY") and model_available())
    out = []
    for voice, system in VOICE_SYSTEM.items():
        text = ""
        if use_model:
            try:
                reply = _chat(model, [
                    {"role": "system", "content": system.format(language=LANGUAGE_NAMES.get(lang, lang))},
                    {"role": "user", "content": json.dumps({"story": story, "evidence": evidence})}],
                    f"voices {voice}", max_tokens=300)
                text = ensure_citations(reply, insight)
                if not numbers_are_grounded(text, insight):
                    raise ValueError("the voice used a number that is not in the facts")
                if not names_are_grounded(text, allowed):
                    raise ValueError("the voice named a player who is not in the facts")
            except Exception as exc:
                print(f"[DEBUG] the {voice} voice failed ({exc}); using the plain join")
                text = ""
        if not text:
            text = " ".join(story) + f" [{', '.join(evidence)}]"
        out.append({"voice": voice, "label": VOICE_LABELS[voice], "text": text, "evidence": evidence})
    return {
        "voices": out,
        "note": "The same facts, three ways. The rules find the facts once and every voice cites the "
                "same events; only the wording changes.",
    }
