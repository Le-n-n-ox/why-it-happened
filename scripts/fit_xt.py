"""Learn the expected-threat grid from real matches and save it as data/xt_grid.json.

  python scripts/fit_xt.py data/sb_*.json                      (our own small fitter; no extra packages)
  python scripts/fit_xt.py --engine socceraction --match 1 --match 2 ...

--engine socceraction uses socceraction's StatsBomb loader, SPADL conversion and ExpectedThreat model
(pip install socceraction statsbombpy). The default, auto, uses socceraction when it is installed.
Either way the grid is the same 16 x 12 file, and the app only reads that file.
More matches give a better grid: use at least 20.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.events import load_events  # noqa: E402
from app.xt import L, W, fit_xt, save_grid  # noqa: E402


def fit_with_socceraction(match_ids: list[int], competition: int, season: int) -> list[list[float]]:
    from socceraction import spadl
    from socceraction.data.statsbomb import StatsBombLoader
    from socceraction.xthreat import ExpectedThreat

    loader = StatsBombLoader(getter="remote", creds={"user": None, "passwd": None})
    games = loader.games(competition, season)
    actions = []
    for _, game in games.iterrows():
        if match_ids and int(game.game_id) not in match_ids:
            continue
        events = loader.events(game.game_id)
        actions.append(spadl.statsbomb.convert_to_actions(events, game.home_team_id))
    import pandas as pd
    model = ExpectedThreat(l=L, w=W)
    model.fit(pd.concat(actions))
    return [[float(v) for v in row] for row in model.xT]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--engine", choices=["auto", "ours", "socceraction"], default="auto")
    ap.add_argument("--match", type=int, action="append", default=[])
    ap.add_argument("--competition", type=int)
    ap.add_argument("--season", type=int)
    ap.add_argument("--out", default="data/xt_grid.json")
    args = ap.parse_args()

    engine = args.engine
    if engine == "auto":
        try:
            import socceraction  # noqa: F401
            engine = "socceraction" if args.competition else "ours"
        except ImportError:
            engine = "ours"
    if engine == "socceraction":
        if not (args.competition and args.season):
            sys.exit("--engine socceraction needs --competition and --season (and optionally --match ids)")
        grid = fit_with_socceraction(args.match, args.competition, args.season)
    else:
        if not args.files:
            sys.exit("give the converted match files, e.g. data/sb_*.json")
        grid = fit_xt([load_events(f) for f in args.files])
    save_grid(grid, args.out, f"fitted with {engine}")
    print(f"saved {args.out} using {engine}; value at the penalty spot ~ {grid[W // 2][int(0.88 * L)]:.3f}")


if __name__ == "__main__":
    main()