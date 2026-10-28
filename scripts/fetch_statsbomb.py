"""Download StatsBomb open data and convert it to our format. Run on your own machine (needs internet).

  python scripts/fetch_statsbomb.py --list                                 competitions and seasons
  python scripts/fetch_statsbomb.py --competition 2 --season 44            matches of one season
  python scripts/fetch_statsbomb.py --match 12345 [--match 67890 ...]      download and convert

Writes data/sb_<match>.json (our events) and data/sb_<match>_context.json (formations, xG, score).
Play one with: EVENTS_FILE=data/sb_<match>.json  (in .env).
StatsBomb's open data licence asks you to credit StatsBomb wherever you show it.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.statsbomb import load_statsbomb  # noqa: E402

RAW_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/{}.json"


def fetch_events(match_id: int, raw: bool) -> list[dict]:
    if raw:
        import requests
        response = requests.get(RAW_URL.format(match_id), timeout=60)
        response.raise_for_status()
        return response.json()
    from statsbombpy import sb
    try:
        data = sb.events(match_id=match_id, fmt="dict", flatten_attrs=False)
    except TypeError:                                  # older statsbombpy without flatten_attrs
        data = sb.events(match_id=match_id, fmt="dict")
    return list(data.values()) if isinstance(data, dict) else list(data)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--competition", type=int)
    ap.add_argument("--season", type=int)
    ap.add_argument("--match", type=int, action="append", default=[])
    ap.add_argument("--raw", action="store_true", help="read the JSON from GitHub with requests, not statsbombpy")
    ap.add_argument("--out", default="data")
    args = ap.parse_args()

    if args.list or args.competition:
        from statsbombpy import sb
        if args.competition:
            rows = sb.matches(competition_id=args.competition, season_id=args.season).to_dict("records")
            for r in rows:
                print(r["match_id"], r["match_date"], r["home_team"], r["home_score"], "-", r["away_score"], r["away_team"])
        else:
            for r in sb.competitions().to_dict("records"):
                print(r["competition_id"], r["season_id"], r["competition_name"], r["season_name"])
        return

    for match_id in args.match:
        events, context = load_statsbomb(fetch_events(match_id, args.raw))
        out = Path(args.out)
        (out / f"sb_{match_id}.json").write_text(json.dumps([e.model_dump(mode="json") for e in events]))
        (out / f"sb_{match_id}_context.json").write_text(json.dumps(context, indent=1))
        print(f"match {match_id}: {len(events)} events, score {context['score']}, formations {context['formations']}")


if __name__ == "__main__":
    main()