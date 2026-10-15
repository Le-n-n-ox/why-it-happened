import os
import json
import re
import requests
import time

from .db import get_existing_narration, save_insight
from app.detectors import Insight

SYSTEM = (
    "You are a Premier League tactical analyst writing a live studio caption in {language}. "
    "Use ONLY the facts in the JSON payload. Do not invent numbers, units (no yards or metres), "
    "players, home/away roles, or raw coordinates. "
    "Write at most two short sentences, plain and punchy. "
    "End with the evidence ids in square brackets, e.g. [e1, e2]."
)

# Language codes (NARRATION_LANGS) -> names the model understands.
LANGUAGE_NAMES = {
    "en": "English",
    "sw": "Swahili",
    "fr": "French",
    "es": "Spanish",
    "pt": "Portuguese",
    "de": "German",
    "ar": "Arabic",
}


def make_client():
    """Returns a dummy client placeholder since we are using direct REST requests."""
    return None


def template_narration(insight: Insight) -> str:
    """English sentence built from the facts, with citations. Used when the LLM is unavailable."""
    facts = insight.facts or {}
    cites = ", ".join(insight.evidence)
    if insight.kind == "counter_attack" and {"duration_s", "passes", "ended_in"} <= facts.keys():
        ended = str(facts["ended_in"]).replace("_", " ")
        body = (
            f"{insight.team} win the ball and reach a {ended} in "
            f"{facts['duration_s']} seconds after {facts['passes']} passes."
        )
    else:
        body = f"{insight.team}: {insight.kind.replace('_', ' ')} detected."
    return f"{int(insight.minute)}' {body} [{cites}]"


def _clean(text: str) -> str:
    """Drop any <think> block and wrapping quotes the model may add."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.strip().strip('"').strip()


def narrate(client, model: str, insight: Insight, language: str = "English") -> str:
    """Uses a direct REST request to the NVIDIA NIM endpoint, bypassing SDK wrapper issues."""

    api_key = os.getenv("NVIDIA_API_KEY")
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"

    payload_data = {
        "kind": insight.kind,
        "team": insight.team,
        "minute": insight.minute,
        "facts": insight.facts,
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

    print(f"\n[DEBUG] Requesting model '{model}' ({language}) via direct REST API...")
    timeout_seconds = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "20"))
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

    text = _clean(content)
    if not text:
        raise ValueError("The NVIDIA API returned only reasoning text.")
    return text


def narrate_all(client, model: str | None, insight: Insight, languages: list[str] | None = None) -> dict[str, str]:
    """Narrate one insight in each requested language and persist each result."""
    results: dict[str, str] = {}
    requested_languages = languages or ["en"]
    for code in requested_languages:
        cached = get_existing_narration(insight.id, code)
        if cached:
            print(f"[DEBUG] Served insight '{insight.id}' ({code}) from DB cache.")
            results[code] = cached
            continue

        failed = False
        try:
            if not model or not os.getenv("NVIDIA_API_KEY"):
                raise RuntimeError("NVIDIA model or API key is not configured")
            text = narrate(client, model, insight, LANGUAGE_NAMES.get(code, code))
        except Exception as e:
            print(f"[DEBUG] LLM call failed for '{code}' ({e}); using template fallback")
            if code != "en":
                # An English sentence under another language key would be mislabeled.
                # Leave the language out: the frontend falls back to English and tags it EN.
                continue
            text = template_narration(insight)
            failed = True

        # Persist the generated narration (and the English fallback) immediately.
        save_insight(insight, text, language=code, cache_result=not failed)
        results[code] = text
        if not failed:
            time.sleep(1.5)  # Respect NVIDIA rate limits.

    if not results:
        # Every language failed (for example NARRATION_LANGS=sw with no working LLM).
        text = template_narration(insight)
        save_insight(insight, text, language="en", cache_result=False)
        results["en"] = text
    return results