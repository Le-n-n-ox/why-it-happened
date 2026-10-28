"""Checks of our numbers against real matches (StatsBomb), so the demo can say how far to trust them."""
import math

from app.assessment import SHOTS
from app.tactics import danger, formation_estimate, win_probability


def pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if sx == 0 or sy == 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy)


def collapse_formation(shape: str) -> str:
    """Our estimate has three lines, so 4-2-3-1 becomes 4-5-1 before comparing."""
    parts = [int(p) for p in shape.split("-")]
    return f"{parts[0]}-{sum(parts[1:-1])}-{parts[-1]}" if len(parts) > 2 else shape


def xg_agreement(events, context: dict) -> dict:
    """Our shot value against StatsBomb's xG for the same shots. Also shows which way the pitch points."""
    shots = [e for e in events if e.type in SHOTS and e.id in context.get("xg", {})]
    ours = [danger(e.x, e.y) for e in shots]
    theirs = [context["xg"][e.id] for e in shots]
    return {"shots": len(shots), "correlation": pearson(ours, theirs),
            "mean_shot_x": sum(e.x for e in shots) / len(shots) if shots else None,
            "our_total": round(sum(ours), 2), "statsbomb_total": round(sum(theirs), 2)}


def formation_agreement(events, context: dict) -> list[dict]:
    rows = []
    for team in context.get("teams", []):
        truth = (context.get("formations") or {}).get(team)
        guess = formation_estimate(events, team)
        if not truth or not guess["available"]:
            rows.append({"team": team, "truth": truth, "ours": None, "match": None,
                         "why": guess.get("reason", "no official formation")})
            continue
        want = collapse_formation(truth)
        rows.append({"team": team, "truth": truth, "ours": guess["shape"], "match": guess["shape"] == want})
    return rows


def brier(probabilities: dict[str, float], outcome: str) -> float:
    """Squared error of a forecast over home / draw / away; 0 is perfect, 0.67 is a coin toss among three."""
    return sum((p / 100 - (1.0 if key == outcome else 0.0)) ** 2 for key, p in probabilities.items())


def probability_check(matches: list[tuple[list, dict]], minutes=(30, 60)) -> dict:
    """Average Brier score of win_probability at given minutes, against always predicting the base rate."""
    outcomes = []
    for events, context in matches:
        score = context["score"]
        teams = context["teams"]
        a, b = teams[0], teams[1]
        outcomes.append(a if score[a] > score[b] else b if score[b] > score[a] else "draw")
    if not outcomes:
        return {}
    result = {}
    for minute in minutes:
        ours, base = [], []
        for (events, context), outcome in zip(matches, outcomes):
            p = win_probability(events, minute)
            if not p.get("available"):
                continue
            a, b = p["teams"]
            ours.append(brier(p["probabilities"], outcome))
            rate = {key: 100 * sum(
                (o == (a if key == a else b if key == b else "draw")) for o in outcomes) / len(outcomes)
                for key in (a, b, "draw")}
            base.append(brier(rate, outcome))
        if ours:
            result[minute] = {"matches": len(ours), "ours": round(sum(ours) / len(ours), 3),
                              "base_rate": round(sum(base) / len(base), 3)}
    return result