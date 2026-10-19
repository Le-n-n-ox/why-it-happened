"""Pitch pictures for the demo video and slides, drawn with mplsoccer (pip install mplsoccer matplotlib).

  python scripts/make_visuals.py data/demo_match.json --out out

Writes, into out/:
  chain_<insight id>.png   the arrows of each causal chain, so the 'why' can be seen
  positions_<team>.png     where each player touched the ball in each half, so a tactical shift can be seen
  shots.png                every shot, sized by how dangerous the spot was
"""
import argparse
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
from mplsoccer import Pitch  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.causes import chain_for  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import EventType, load_events  # noqa: E402
from app.tactics import HALF_TIME, danger  # noqa: E402

LENGTH, WIDTH = 105, 68
COLOURS = {0: "#e63946", 1: "#4361ee"}


def pitch():
    p = Pitch(pitch_type="custom", pitch_length=LENGTH, pitch_width=WIDTH, line_color="#8d99ae",
              pitch_color="#14213d", linewidth=1.5)
    fig, ax = p.draw(figsize=(11, 7.2))
    return p, fig, ax


def xy(e):
    return e.x * LENGTH / 100, e.y * WIDTH / 100


def chain_picture(events, insight, path):
    by_id = {e.id: e for e in events}
    steps = [by_id[i] for i in insight.evidence if i in by_id]
    p, fig, ax = pitch()
    for a, b in zip(steps, steps[1:]):
        (x1, y1), (x2, y2) = xy(a), xy(b)
        p.arrows(x1, y1, x2, y2, ax=ax, color="#ffd166", width=2.5, headwidth=5, zorder=3)
    for n, e in enumerate(steps, 1):
        x, y = xy(e)
        p.scatter(x, y, ax=ax, s=260, color="#06d6a0", edgecolors="white", zorder=4)
        p.annotate(f"{n}", (x, y), ax=ax, color="black", ha="center", va="center", fontsize=9, zorder=5)
    chain = chain_for(events, insight)
    ax.set_title(chain["summary"] if chain else insight.kind, color="white", fontsize=10, wrap=True)
    fig.savefig(path, dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")


def positions_picture(events, team, path):
    p, fig, ax = pitch()
    for half, (lo, hi, colour) in enumerate(((0, HALF_TIME, "#ffd166"), (HALF_TIME, 1e9, "#06d6a0"))):
        spots = defaultdict(list)
        for e in events:
            if e.team == team and e.player and lo <= e.minute < hi:
                spots[e.player].append(xy(e))
        xs = [sum(a for a, _ in v) / len(v) for v in spots.values() if len(v) >= 3]
        ys = [sum(b for _, b in v) / len(v) for v in spots.values() if len(v) >= 3]
        p.scatter(xs, ys, ax=ax, s=180, color=colour, edgecolors="white", zorder=3,
                  label="first half" if half == 0 else "second half")
    ax.legend(loc="lower center", ncol=2, facecolor="#14213d", labelcolor="white")
    ax.set_title(f"{team}: average touch position per player", color="white")
    fig.savefig(path, dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")


def shots_picture(events, path):
    p, fig, ax = pitch()
    teams = list(dict.fromkeys(e.team for e in events))
    for e in events:
        if e.type in (EventType.SHOT, EventType.GOAL):
            x, y = xy(e)
            if teams.index(e.team) == 1:                    # draw the second team attacking the left goal
                x, y = LENGTH - x, WIDTH - y
            p.scatter(x, y, ax=ax, s=80 + 900 * danger(e.x, e.y), color=COLOURS[teams.index(e.team) % 2],
                      marker="*" if e.type == EventType.GOAL else "o", edgecolors="white", alpha=0.9, zorder=3)
    ax.set_title("Shots (bigger = more dangerous spot, star = goal)", color="white")
    fig.savefig(path, dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("events")
    ap.add_argument("--out", default="out")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(exist_ok=True)
    events = load_events(args.events)
    for insight in detect_all(events):
        if insight.evidence[-1] and next(e for e in events if e.id == insight.evidence[-1]).type == EventType.GOAL:
            chain_picture(events, insight, out / f"chain_{insight.id}.png")
    for team in dict.fromkeys(e.team for e in events):
        positions_picture(events, team, out / f"positions_{team}.png")
    shots_picture(events, out / "shots.png")
    print("wrote pictures to", out)


if __name__ == "__main__":
    main()