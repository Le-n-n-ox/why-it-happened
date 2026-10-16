import os
import json
import re
import requests
import time

from app.detectors import Insight
from .db import get_existing_narration, save_insight

SYSTEM = (
    "You are an expert Premier League tactical analyst and broadcaster. "
    "Given a JSON payload of a match event, write a sharp, professional studio commentary "
    "in {language}. Use only the facts in the JSON payload. "
    "Stay strictly on what the JSON says: say nothing about defenders, goalkeepers, momentum or how the opposition reacted. "
    "Never write coordinates or distances. Write natural, simple {language}, not a word-for-word translation. "
    "End with the evidence ids in square brackets (e.g., [e1]). Keep it under 3 sentences."
)

LANGUAGE_NAMES = {
    "en": "English", "sw": "Swahili", "fr": "French", "es": "Spanish",
    "pt": "Portuguese", "de": "German", "ar": "Arabic",
}

# Raw positions are deliberately withheld so models cannot turn coordinates into distances.
MODEL_FACT_KEYS = ("duration_s", "passes", "ended_in")

KIND_MEANING = {
    "counter_attack": "won the ball in their own half and reached a shot or goal within seconds",
    "turnover_shot": "won the ball back and worked it into a shot, a little more slowly",
    "high_press_turnover": "won the ball high up the pitch by pressing, then reached a shot or goal quickly",
}

def make_client():
    """Returns a dummy client placeholder since we are using direct REST requests."""
    return None


def ensure_citations(text: str, insight: Insight) -> str:
    """Add real evidence ids when absent and reject citations outside the evidence."""
    groups = re.findall(r"\[([^\]]+)\]", text)
    if not groups:
        return f"{text} [{', '.join(insight.evidence)}]"
    cited = {c.strip() for g in groups for c in g.split(",")}
    unknown = cited - set(insight.evidence)
    if unknown:
        raise ValueError(f"model cited ids that are not evidence: {sorted(unknown)}")
    return text


def numbers_are_grounded(text: str, insight: Insight) -> bool:
    """Every number in the text must be the minute or one of the facts shown to the model."""
    allowed = {int(insight.minute)}
    for key in MODEL_FACT_KEYS:
        value = insight.facts.get(key)
        if isinstance(value, (int, float)):
            allowed.add(int(value))
    body = re.sub(r"\[[^\]]*\]", "", text)
    return {int(n) for n in re.findall(r"\d+", body)} <= allowed


def template_narration(insight: Insight) -> str:
    facts = insight.facts or {}
    cites = ", ".join(insight.evidence)
    if insight.kind == "counter_attack" and {"duration_s", "passes", "ended_in"} <= facts.keys():
        ended = str(facts["ended_in"]).replace("_", " ")
        n = facts["passes"]
        body = (f"{insight.team} win the ball and reach a {ended} in "
                f"{facts['duration_s']} seconds after {n} {'pass' if n == 1 else 'passes'}.")
    elif insight.kind == "turnover_shot" and {"duration_s", "ended_in"} <= facts.keys():
        body = (f"{insight.team} win the ball back and work it into a "
                f"{str(facts['ended_in']).replace('_', ' ')} in {facts['duration_s']} seconds.")
    elif insight.kind == "high_press_turnover" and {"duration_s", "ended_in"} <= facts.keys():
        body = (f"{insight.team} win the ball high up the pitch and reach a "
                f"{str(facts['ended_in']).replace('_', ' ')} in {facts['duration_s']} seconds.")
    else:
        body = f"{insight.team}: {insight.kind.replace('_', ' ')} detected."
    return f"{int(insight.minute)}' {body} [{cites}]"


_failures = 0
_pause_until = 0.0


def _record_model_result(ok: bool) -> None:
    """Pause model calls for 60 seconds after two consecutive failures."""
    global _failures, _pause_until
    if ok:
        _failures = 0
        return
    _failures += 1
    if _failures >= 2:
        _pause_until = time.time() + 60
        _failures = 0

def narrate(client, model: str, insight: Insight, language: str = "English") -> str:
    """Uses a direct REST request to the NVIDIA NIM endpoint, bypassing SDK wrapper issues."""

    api_key = os.getenv("NVIDIA_API_KEY")
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"

    payload_data = {
        "kind": insight.kind,
        "team": insight.team,
        "minute": insight.minute,
        "meaning": KIND_MEANING.get(insight.kind, ""),
        "facts": {k: v for k, v in insight.facts.items() if k in MODEL_FACT_KEYS},
        "evidence": insight.evidence,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM.format(language=language)},
            {"role": "user", "content": json.dumps(payload_data)}
        ],
        "temperature": 0.4,
        "max_tokens": 1024,
        "reasoning_effort": "low",
        "stream": False
    }

    # Nemotron 3.5 thinks by default. Its reasoning and final answer share
    # max_tokens, so a long reasoning trace can leave message.content empty.
    if model == "nvidia/nemotron-3.5-lightning-30b-a3b":
        body.pop("reasoning_effort", None)
        body["chat_template_kwargs"] = {"enable_thinking": False}

    print(f"\n[DEBUG] Requesting model '{model}' via direct REST API...")
    timeout_seconds = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "15"))
    response = requests.post(
        invoke_url,
        headers=headers,
        json=body,
        timeout=(10, timeout_seconds),
    )

    if response.status_code != 200:
        raise RuntimeError(f"NVIDIA API Error {response.status_code}: {response.text}")

    res_json = response.json()
    choices = res_json.get("choices", [])
    if not choices:
        raise ValueError("The NVIDIA API returned an empty response choices list.")

    content = choices[0].get("message", {}).get("content")
    if not content:
        choice = choices[0]
        usage = res_json.get("usage", {}).get("completion_tokens_details", {})
        raise ValueError(
            "The NVIDIA API returned no visible text "
            f"(finish_reason={choice.get('finish_reason')}, "
            f"reasoning_tokens={usage.get('reasoning_tokens')})."
        )

    return content.strip()

def narrate_all(client, model: str | None, insight: Insight, languages: list[str] | None = None) -> dict[str, str]:
    """Narrate one insight in each requested language and persist each result."""
    results: dict[str, str] = {}
    for code in languages or ["en"]:
        cached = get_existing_narration(insight.id, code)
        if cached:
            results[code] = cached
            continue
        failed = False
        paused = time.time() < _pause_until
        try:
            if not model or not os.getenv("NVIDIA_API_KEY"):
                raise RuntimeError("NVIDIA model or API key is not configured")
            if paused:
                raise RuntimeError("model paused for 60 s after repeated failures")
            text = ensure_citations(
                narrate(client, model, insight, LANGUAGE_NAMES.get(code, code)), insight
            )
            if not numbers_are_grounded(text, insight):
                raise ValueError("model used a number that is not in the facts")
            _record_model_result(True)
        except Exception as e:
            if not paused:
                _record_model_result(False)
            print(f"[DEBUG] LLM call failed for '{code}' ({e}); using template fallback")
            if code != "en":
                continue
            text = template_narration(insight)
            failed = True
        save_insight(insight, text, language=code, cache_result=not failed)
        results[code] = text
        if not failed:
            time.sleep(1.5)
    if not results:
        text = template_narration(insight)
        save_insight(insight, text, language="en", cache_result=False)
        results["en"] = text
    return results
