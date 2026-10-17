"""Warm the demo: stream the whole match once so every narration is generated and cached,
then ask for each language's recap. Works against any running copy of the app.

    python scripts/warm_demo.py                              # http://localhost:8000
    python scripts/warm_demo.py --url https://your-app.example --retries 3

Narrations that fail are not cached by the server, so a retry only redoes the missing ones.
If the model is paused after repeated failures (60 s), --wait lets it come back before the retry.
Exit code 0 = every language present for every insight, 1 = something is still missing.
"""
import argparse
import json
import sys
import time

import requests


def run_stream(base: str, timeout: float) -> list[dict]:
    """Play the whole match at full speed and return the insights that arrived."""
    insights, event = [], None
    with requests.get(f"{base}/stream", params={"speed": 0}, stream=True, timeout=(10, timeout)) as r:
        r.raise_for_status()
        r.encoding = "utf-8"
        for line in r.iter_lines(decode_unicode=True):
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                if event == "done":
                    break
                if event is None:                    # an unnamed message is an insight
                    insights.append(json.loads(line[5:].strip()))
            elif line == "":
                event = None
    return insights


def missing_languages(insights: list[dict], languages: list[str]) -> dict[str, list[str]]:
    gaps = {}
    for insight in insights:
        absent = [code for code in languages if not (insight.get("narration") or {}).get(code)]
        if absent:
            gaps[insight["id"]] = absent
    return gaps


def warm_reviews(base: str, languages: list[str], top: int, timeout: float) -> list[str]:
    """Generate and cache reviews for the best-rated named players."""
    if top <= 0:
        return []
    players = requests.get(f"{base}/players", timeout=30).json()[:top]
    if not players:
        print("\nReviews: this match has no player names. Nothing to warm.")
        return []
    print(f"\nReviews (top {len(players)} players)")
    gaps = []
    for player in players:
        have = []
        for code in languages:
            try:
                got = requests.get(
                    f"{base}/players/{player['id']}/review",
                    params={"lang": code}, timeout=timeout,
                ).json()
                if got["lang"] == code:
                    have.append(code)
                else:
                    gaps.append(f"{player['id']}:{code}")
            except Exception:
                gaps.append(f"{player['id']}:{code}")
        print(f"  {player['name']:20} {player['rating']:>4}  {' '.join(have)}")
    return gaps


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--retries", type=int, default=2, help="extra passes while something is missing")
    parser.add_argument("--wait", type=float, default=65, help="seconds to wait before a retry")
    parser.add_argument("--timeout", type=float, default=180, help="max seconds without data from the server")
    parser.add_argument("--reviews", type=int, default=6, help="warm the reviews of the top N players (0 = skip)")
    args = parser.parse_args(argv)
    base = args.url.rstrip("/")

    try:
        response = requests.get(f"{base}/health", timeout=10)
        response.raise_for_status()
        health = response.json()
    except requests.exceptions.ConnectionError:
        print(
            f"Cannot connect to {base}. Start the backend with "
            "'uvicorn app.main:app --reload --port 8000', then retry.",
            file=sys.stderr,
        )
        return 1
    except requests.exceptions.RequestException as exc:
        print(f"Could not check backend health at {base}: {exc}", file=sys.stderr)
        return 1
    languages = health["languages"]
    print(f"Server {base} | model configured: {health['llm_configured']} | languages: {', '.join(languages)}")
    if not health["llm_configured"]:
        print("No model configured: narrations will be English templates. Nothing to warm.")

    gaps: dict[str, list[str]] = {}
    for attempt in range(args.retries + 1):
        started = time.time()
        insights = run_stream(base, args.timeout)
        gaps = missing_languages(insights, languages)
        print(f"\nPass {attempt + 1}: {len(insights)} insights in {time.time() - started:.0f}s")
        for insight in insights:
            have = [c for c in languages if (insight.get("narration") or {}).get(c)]
            note = f"  missing: {', '.join(gaps[insight['id']])}" if insight["id"] in gaps else ""
            print(f"  {insight['id']:28} {' '.join(have)}{note}")
        if not gaps or attempt == args.retries:
            break
        print(f"Retrying the missing ones in {args.wait:.0f}s...")
        time.sleep(args.wait)

    print("\nRecaps")
    for code in languages:
        try:
            text = requests.get(f"{base}/recap", params={"lang": code}, timeout=args.timeout).json()["text"]
            print(f"  {code}: {text[:110]}{'...' if len(text) > 110 else ''}" if text else f"  {code}: EMPTY")
        except Exception as exc:
            print(f"  {code}: FAILED ({exc})")

    review_gaps = warm_reviews(base, languages, args.reviews, args.timeout)

    if gaps or review_gaps:
        print(f"\nStill missing: {len(gaps)} insight(s), {len(review_gaps)} review(s). "
              "Check the server log for '[DEBUG] LLM call failed'.")
        return 1
    print("\nWarm: every language is present for every insight.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
