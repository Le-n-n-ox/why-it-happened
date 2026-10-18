"""Pretend to be a video parser: send a match to the backend one event at a time, in clock order.

    python scripts/simulate_video_feed.py --file data/demo_match.json --reset --end

Open the dashboard with its stream pointed at /stream?source=live to watch it react.
Use --token if the server was started with INGEST_TOKEN set.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import requests


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", default="data/demo_match.json")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--speed", type=float, default=0.2, help="seconds per match minute (default 0.2)")
    parser.add_argument("--max-gap", type=float, default=2.0, help="longest pause between events, seconds")
    parser.add_argument("--token", default=None, help="value for the X-Ingest-Token header")
    parser.add_argument("--reset", action="store_true", help="forget any earlier live match first")
    parser.add_argument("--end", action="store_true", help="send /live/end when the match is finished")
    args = parser.parse_args()

    headers = {"X-Ingest-Token": args.token} if args.token else {}
    base = args.url.rstrip("/")
    events = sorted(json.loads(Path(args.file).read_text()), key=lambda e: float(e["minute"]))

    def post(path: str, body=None) -> requests.Response:
        return requests.post(f"{base}{path}", json=body, headers=headers, timeout=10)

    try:
        if args.reset:
            print("reset:", post("/live/reset").json())
        previous = None
        sent = skipped = 0
        for event in events:
            if previous is not None:
                wait = min(max((event["minute"] - previous) * args.speed, 0.0), args.max_gap)
                time.sleep(wait)
            previous = event["minute"]
            reply = post("/events", event)
            if reply.status_code == 200 and reply.json().get("status") == "success":
                sent += 1
            else:
                skipped += 1
                print(f"{event['id']}: {reply.status_code} {reply.text[:120]}")
            if reply.status_code == 401:
                print("The server wants a token: pass --token.")
                return 1
        print(f"sent {sent} events, skipped {skipped}")
        if args.end:
            print("end:", post("/live/end").json())
    except requests.ConnectionError:
        print(f"Could not reach {base}. Is the backend running there? (try --url http://localhost:8001)")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())