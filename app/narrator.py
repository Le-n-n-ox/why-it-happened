import os
import json
import requests

from app.detectors import Insight

SYSTEM = (
    "You are an expert Premier League tactical analyst and broadcaster. "
    "Given a JSON payload of a match event, write a sharp, professional studio commentary "
    "in {language}. You must strictly incorporate the provided facts and cite the evidence keys "
    "in square brackets at the end of your sentences (e.g., [e1]). Keep it under 3 sentences."
)

def make_client():
    """Returns a dummy client placeholder since we are using direct REST requests."""
    return None

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
    
    print(f"\n[DEBUG] Requesting model '{model}' via direct REST API...")
    timeout_seconds = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "90"))
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
    """Narrate one insight in each requested language, with a safe fallback."""
    results = {}
    for language in languages or ["en"]:
        try:
            if not model or not os.getenv("NVIDIA_API_KEY"):
                raise RuntimeError("NVIDIA model or API key is not configured")
            text = narrate(client, model, insight, language)
            results[language] = text
        except Exception as e:
            print(f"[DEBUG] LLM call failed ({e}); using template fallback")
            results[language] = f"[{insight.minute}'] {insight.team} tactical shift detected: {insight.kind}."
    return results
