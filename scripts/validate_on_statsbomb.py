"""How far can we trust our numbers? Compare them with real matches.

  python scripts/validate_on_statsbomb.py data/sb_*.json

Needs the sb_<match>_context.json next to each file (fetch_statsbomb.py writes both). Prints:
  1. our shot value against StatsBomb's xG (correlation), and the average shot position, which must be
     near x = 100: if it is not, the pitch direction in the adapter is wrong
  2. our formation estimate against the official starting formation
  3. our win probability against the real result, as a Brier score (lower is better), compared with
     just predicting how often home teams win
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.events import load_events  # noqa: E402
from app.validation import formation_agreement, probability_check, xg_agreement  # noqa: E402


def main(paths: list[str], report_path: str = "data/validation_report.json") -> None:
    matches = []
    for path in paths:
        context = Path(path).with_name(Path(path).stem + "_context.json")
        if not context.exists():
            print(f"skip {path}: no {context.name}")
            continue
        matches.append((path, load_events(path), json.loads(context.read_text())))

    print(f"== {len(matches)} matches")
    per_match = []
    for path, events, ctx in matches:
        agree = xg_agreement(events, ctx)
        formations = formation_agreement(events, ctx)
        per_match.append({"match": Path(path).name, "xg": agree, "formations": formations})
        r = agree["correlation"]
        print(f"{Path(path).name}: {agree['shots']} shots, mean shot x {agree['mean_shot_x']:.0f}, "
              f"correlation with StatsBomb xG {'n/a' if r is None else f'{r:.2f}'}, "
              f"total ours {agree['our_total']} vs StatsBomb {agree['statsbomb_total']}")
        for row in formations:
            print(f"   {row['team']}: official {row['truth']}, ours {row['ours']}, "
                  f"{'match' if row['match'] else row.get('why', 'differs')}")

    checked = [row for item in per_match for row in item["formations"] if row["match"] is not None]
    if checked:
        print(f"\nformation: {sum(r['match'] for r in checked)} of {len(checked)} teams matched the official shape")
    print("\nwin probability (Brier score, lower is better):")
    probability = probability_check([(events, ctx) for _, events, ctx in matches])
    for minute, row in probability.items():
        print(f"  at minute {minute}: ours {row['ours']} vs base rate {row['base_rate']} over {row['matches']} matches")

    xg_rows = [item["xg"] for item in per_match]
    correlations = [row["correlation"] for row in xg_rows if row["correlation"] is not None]
    shot_count = sum(row["shots"] for row in xg_rows)
    report = {
        "available": bool(matches),
        "source": "StatsBomb Open Data",
        "matches": len(matches),
        "shots": shot_count,
        "xg": {
            "mean_correlation": round(sum(correlations) / len(correlations), 3) if correlations else None,
            "correlation_matches": len(correlations),
            "mean_shot_x": round(sum((row["mean_shot_x"] or 0) * row["shots"] for row in xg_rows)
                                 / shot_count, 2) if shot_count else None,
            "our_total": round(sum(row["our_total"] for row in xg_rows), 2),
            "statsbomb_total": round(sum(row["statsbomb_total"] for row in xg_rows), 2),
        },
        "formation": {"matched": sum(row["match"] is True for row in checked), "compared": len(checked)},
        "win_probability": {str(minute): row for minute, row in probability.items()},
        "per_match": per_match,
    }
    if not matches:
        report["reason"] = "No event files with matching StatsBomb context files were supplied."
    output = Path(report_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"saved validation report to {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="*")
    parser.add_argument("--out", default="data/validation_report.json")
    args = parser.parse_args()
    main(args.files, args.out)
