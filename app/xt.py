"""Expected threat (xT): how valuable it is to have the ball in each part of the pitch.

The grid is learned from real matches (scripts/fit_xt.py, with socceraction or the small fitter below)
and saved to data/xt_grid.json. At runtime this module only reads that file, so the app needs no extra
packages. Without the file, app/tactics.py falls back to its own distance-and-angle estimate.

The method is Karun Singh's xT: the value of a zone is the chance of shooting from it times the chance
that shot scores, plus the chance of moving the ball times where the ball usually goes next.
"""
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

from app.events import EventType, MatchEvent

L, W = 16, 12                      # columns along the pitch, rows across it
_cache: dict = {}


def zone(x: float, y: float, l: int = L, w: int = W) -> tuple[int, int]:
    return min(int(x / 100 * l), l - 1), min(int(y / 100 * w), w - 1)      # (column, row)


def load_grid(path: str | None = None) -> dict | None:
    """The saved grid, or None when there is none."""
    path = path or os.getenv("XT_GRID", "data/xt_grid.json")
    if path in _cache:
        return _cache[path]
    grid = None
    try:
        data = json.loads(Path(path).read_text())
        if len(data["grid"]) == data["w"] and len(data["grid"][0]) == data["l"]:
            grid = data
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        grid = None
    _cache[path] = grid
    return grid


def xt_value(x: float, y: float, path: str | None = None) -> float | None:
    grid = load_grid(path)
    if grid is None:
        return None
    col, row = zone(x, y, grid["l"], grid["w"])
    return float(grid["grid"][row][col])


def save_grid(grid: list[list[float]], path: str, source: str) -> None:
    data = {"l": len(grid[0]), "w": len(grid), "source": source,
            "grid": [[round(v, 5) for v in row] for row in grid]}
    Path(path).write_text(json.dumps(data))
    _cache.pop(path, None)


def fit_xt(matches: list[list[MatchEvent]], l: int = L, w: int = W, iterations: int = 40) -> list[list[float]]:
    """Learn the grid from events. A pass or carry moves the ball to wherever the team's next event is;
    one that ends with the opposition having the ball moves it nowhere, so it adds no value."""
    shots, goals, moves = Counter(), Counter(), Counter()
    went: dict = defaultdict(Counter)
    for events in matches:
        for i, e in enumerate(events):
            z = zone(e.x, e.y, l, w)
            if e.type in (EventType.SHOT, EventType.GOAL):
                shots[z] += 1
                goals[z] += e.type == EventType.GOAL
            elif e.type in (EventType.PASS, EventType.CARRY):
                moves[z] += 1
                nxt = events[i + 1] if i + 1 < len(events) else None
                if nxt is not None and nxt.team == e.team:
                    went[z][zone(nxt.x, nxt.y, l, w)] += 1

    zones = [(c, r) for r in range(w) for c in range(l)]
    shoot_value, move_prob = {}, {}
    for z in zones:
        total = shots[z] + moves[z]
        if total == 0:
            shoot_value[z], move_prob[z] = 0.0, 0.0
            continue
        scored = goals[z] / shots[z] if shots[z] else 0.0
        shoot_value[z] = shots[z] / total * scored
        move_prob[z] = moves[z] / total

    value = {z: 0.0 for z in zones}
    for _ in range(iterations):
        value = {z: shoot_value[z] + move_prob[z] * sum(n / moves[z] * value[dest] for dest, n in went[z].items())
                 for z in zones}
    return [[value[(c, r)] for c in range(l)] for r in range(w)]