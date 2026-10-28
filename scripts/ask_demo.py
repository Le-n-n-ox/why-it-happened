"""Put rules-only and model answers side by side for the match served by the app.

  python scripts/ask_demo.py
  python scripts/ask_demo.py --url http://localhost:8001 "Why did the match end this way?"

With no questions supplied, the demo reads the current teams from /events and builds questions
that fit that match. The facts in both answers come from the same rule engine.
"""
import argparse
import textwrap

import requests


def match_teams(url: str) -> list[str]:
    """Get the real team names for the match currently served by the API."""
    response = requests.get(f"{url.rstrip('/')}/events", timeout=15)
    response.raise_for_status()
    events = response.json()
    if not isinstance(events, list):
        raise ValueError("The /events endpoint did not return an event list")
    return list(dict.fromkeys(
        event["team"] for event in events
        if isinstance(event, dict) and isinstance(event.get("team"), str) and event["team"]
    ))


def demo_questions(teams: list[str]) -> list[str]:
    """Build useful questions using the teams in this match, if available."""
    questions = [
        "What shaped the result?",
        "Which passes created the best chances, and why?",
        "Who is likely to win from here?",
    ]
    if teams:
        first = teams[0]
        questions.extend([
            f"What tactics did {first} use, and did they work?",
            f"What should {first} improve?",
        ])
        second = teams[1] if len(teams) > 1 else first
        questions.append(f"How did {second} change after half-time, and did it help?")
    return questions


def ask(url: str, question: str, mode: str) -> dict:
    response = requests.get(
        f"{url.rstrip('/')}/ask", params={"q": question, "mode": mode}, timeout=90
    )
    response.raise_for_status()
    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("questions", nargs="*", help="questions to ask; defaults adapt to the current match")
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()

    if args.questions:
        questions = args.questions
    else:
        try:
            questions = demo_questions(match_teams(args.url))
        except (requests.RequestException, ValueError) as exc:
            parser.error(f"could not read match teams from {args.url.rstrip('/')}/events: {exc}")

    for question in questions:
        print("=" * 100)
        print("Q:", question)
        for mode in ("rules", "auto"):
            result = ask(args.url, question, mode)
            label = "RULES ONLY" if mode == "rules" else (
                f"WITH MODEL (answer by {result['mode']}, router: {result['router']})"
            )
            print(f"\n--- {label}; analyses: {[a['name'] for a in result['analyses']]}")
            print(textwrap.fill(result["answer"], 98))


if __name__ == "__main__":
    main()
