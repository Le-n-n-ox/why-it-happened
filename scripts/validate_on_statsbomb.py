"""How far can we trust our numbers? Compare them with real matches.

  python scripts/validate_on_statsbomb.py data/sb_*.json

Needs the sb_<match>_context.json next to each file (fetch_statsbomb.py writes both). Prints:
  1. our shot value against StatsBomb's xG (correlation), and the average shot position, which must be
     near x = 100: if it is not, the pitch direction in the adapter is wrong
  2. our formation estimate against the official starting formation
  3. our win probability against the real result, as a Brier score (lower is better), compared with
     just predicting how often home teams win
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.events import load_events  # noqa: E402
from app.validation import formation_agreement, probability_check, xg_agreement  # noqa: E402


def main(paths: list[str]) -> None:
    matches = []
    for path in paths:
        context = Path(path).with_name(Path(path).stem + "_context.json")
        if not context.exists():
            print(f"skip {path}: no {context.name}")
            continue
        matches.append((load_events(path), json.loads(context.read_text())))

    print(f"== {len(matches)} matches")
    shots = []
    for (events, ctx), path in zip(matches, paths):
        agree = xg_agreement(events, ctx)
        shots.append(agree)
        r = agree["correlation"]
        print(f"{Path(path).name}: {agree['shots']} shots, mean shot x {agree['mean_shot_x']:.0f}, "
              f"correlation with StatsBomb xG {'n/a' if r is None else f'{r:.2f}'}, "
              f"total ours {agree['our_total']} vs StatsBomb {agree['statsbomb_total']}")
        for row in formation_agreement(events, ctx):
            print(f"   {row['team']}: official {row['truth']}, ours {row['ours']}, "
                  f"{'match' if row['match'] else row.get('why', 'differs')}")

    checked = [row for events, ctx in matches for row in formation_agreement(events, ctx) if row["match"] is not None]
    if checked:
        print(f"\nformation: {sum(r['match'] for r in checked)} of {len(checked)} teams matched the official shape")
    print("\nwin probability (Brier score, lower is better):")
    for minute, row in probability_check(matches).items():
        print(f"  at minute {minute}: ours {row['ours']} vs base rate {row['base_rate']} over {row['matches']} matches")


if __name__ == "__main__":
    main(sys.argv[1:])