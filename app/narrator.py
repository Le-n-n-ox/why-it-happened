"""Turn a detected Insight into short, grounded, multilingual text.

Uses NVIDIA's hosted models via their OpenAI-compatible API. If there is no
NVIDIA_API_KEY, or the model fails or cites evidence that does not exist, we fall
back to a plain template, so the app (and the demo) never breaks.
"""
import json
import logging
import os
import re

from app.detectors import Insight

log = logging.getLogger("narrator")

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

LANGUAGE_NAMES = {"en": "English", "sw": "Swahili", "fr": "French", "es": "Spanish"}

SYSTEM = (
    "You are a Premier League studio analyst writing one or two sentences. "
    "Use ONLY the facts provided. Do not invent players, scores or stats. "
    "End with the evidence ids in square brackets, e.g. [e12, e13]. "
    "Write in {language}."
)


def make_client():
    """Returns an OpenAI client pointed at NVIDIA, or None if no key is set."""
    key = os.getenv("NVIDIA_API_KEY")
    if not key:
        return None
    from openai import OpenAI  # imported here so tests run without the package

    return OpenAI(base_url=NVIDIA_BASE_URL, api_key=key)


def template_narration(insight: Insight) -> str:
    """Plain English fallback. No model involved."""
    f = insight.facts
    if insight.kind == "counter_attack":
        passes = f.get("passes", 0)
        text = (
            f"{int(insight.minute)}' {insight.team} win the ball in their own half and reach "
            f"a {f.get('ended_in', 'shot')} in {f.get('duration_s', '?')} seconds "
            f"after {passes} {'pass' if passes == 1 else 'passes'}."
        )
    else:
        text = f"{int(insight.minute)}' {insight.team}: {insight.kind.replace('_', ' ')}."
    return f"{text} [{', '.join(insight.evidence)}]"


def citations_are_valid(text: str, insight: Insight) -> bool:
    """Every id in square brackets must be one of the insight's evidence ids,
    and there must be at least one citation."""
    groups = re.findall(r"\[([^\]]+)\]", text)
    if not groups:
        return False
    cited = {c.strip() for g in groups for c in g.split(",")}
    return cited <= set(insight.evidence)


def narrate(client, model: str, insight: Insight, language: str = "English") -> str:
    """One LLM call. Raises on API errors; narrate_all() handles fallbacks."""
    payload = {
        "kind": insight.kind,
        "team": insight.team,
        "minute": insight.minute,
        "facts": insight.facts,
        "evidence": insight.evidence,
    }
    resp = client.chat.completions.create(
        model=model,
        temperature=0.4,
        max_tokens=200,
        messages=[
            {"role": "system", "content": SYSTEM.format(language=language)},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )
    return resp.choices[0].message.content.strip()


def narrate_all(insight: Insight, client, model: str | None, langs: list[str]) -> dict:
    """language code -> text, with template fallback per language."""
    out = {}
    for code in langs:
        text = None
        if client is not None and model:
            try:
                text = narrate(client, model, insight, LANGUAGE_NAMES.get(code, code))
                if not citations_are_valid(text, insight):
                    log.warning("bad citations from model for %s (%s); using template", insight.id, code)
                    text = None
            except Exception as exc:  # network, quota, bad model id...
                log.warning("LLM call failed (%s); using template", exc)
        out[code] = text or template_narration(insight)
    return out
