"""Generate a deterministic synthetic match with the full event vocabulary.

The generator exists so the speed, distance, pass-difficulty, possession, pressure and
milestone paths can be demonstrated without pretending an event feed contains a tracking
sensor. It writes the same shape the API already loads:

    {"metadata": {...}, "events": [...]}

Run:
    python scripts/generate_match.py --out data/synthetic_match.json --seed 7
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.metrics import in_box, pitch_distance  # noqa: E402

HOME = "Reds"
AWAY = "Blues"
HOME_PLAYERS = [
    "Jonas Reed", "Milo Hart", "Callum Pike", "Ari Vega", "Nico Brand",
    "Samir Okoye", "Theo Marsh", "Luca Vane", "Elias Thorne", "Rui Calder",
    "Pavel Soren",
]
AWAY_PLAYERS = [
    "Dario Kest", "Owen Vale", "Emil Rask", "Tomas Ibarra", "Noah Wren",
    "Iker Sol", "Milan Frost", "Yusuf Adeyemi", "Leo Marchetti", "Rafael Winter",
    "Anton Grey",
]


class Builder:
    def __init__(self, rng: random.Random):
        self.rng = rng
        self.time = 0.6
        self.events: list[dict] = []

    def tick(self, low: float = 1.0, high: float = 4.0) -> None:
        self.time += self.rng.uniform(low, high) / 60.0

    def add(self, kind: str, team: str, player: str, x: float, y: float, **fields) -> dict:
        x = round(max(0.0, min(100.0, x)), 2)
        y = round(max(0.0, min(100.0, y)), 2)
        event = {
            "id": f"g{len(self.events) + 1}",
            "minute": round(self.time, 2),
            "team": team,
            "player": player,
            "type": kind,
            "x": x,
            "y": y,
            **fields,
        }
        self.events.append(event)
        return event


def _difficulty(distance: float | None, angle: float, pressure: float, into_box: bool,
                progressive: bool) -> float:
    distance_part = min(1.0, (distance or 0.0) / 45.0)
    angle_part = min(1.0, angle / math.pi)
    score = (0.50 * distance_part + 0.25 * angle_part + 0.20 * pressure
             + 0.05 * (1.0 if into_box else 0.0) + (0.05 if progressive else 0.0))
    return round(min(1.0, score), 2)


def _pass(builder: Builder, team: str, player: str, x: float, y: float,
          long: bool = False) -> tuple[float, float]:
    rng = builder.rng
    if long:
        end_x, end_y = x + rng.uniform(24, 42), y + rng.uniform(-30, 30)
    else:
        end_x, end_y = x + rng.uniform(5, 20), y + rng.uniform(-14, 14)
    end_x, end_y = max(2.0, min(98.0, end_x)), max(3.0, min(97.0, end_y))
    distance = pitch_distance(x, y, end_x, end_y)
    pressure = round(rng.uniform(0.0, 0.9), 2)
    angle = rng.uniform(0.0, math.pi / 2)
    difficulty = _difficulty(distance, angle, pressure, in_box(end_x, end_y),
                             end_x - x >= 15)
    completed = rng.random() < (0.93 - 0.30 * difficulty)
    builder.add(
        "pass", team, player, x, y,
        end_x=round(end_x, 2), end_y=round(end_y, 2),
        outcome="complete" if completed else "incomplete",
        pass_distance_m=round(distance, 1),
        pass_accuracy=1.0 if completed else 0.0,
        pass_difficulty=difficulty,
        ball_speed_kph=round(rng.uniform(12, 38), 1),
        player_speed_kph=round(rng.uniform(8, 22), 1),
        distance_m=round(rng.uniform(5, 15), 1),
        pressure=pressure,
    )
    builder.tick(1.0, 4.0)
    return end_x, end_y


def _carry(builder: Builder, team: str, player: str, x: float, y: float) -> tuple[float, float]:
    rng = builder.rng
    end_x = max(2.0, min(97.0, x + rng.uniform(3, 18)))
    end_y = max(3.0, min(97.0, y + rng.uniform(-10, 10)))
    distance = pitch_distance(x, y, end_x, end_y)
    builder.add(
        "carry", team, player, x, y,
        end_x=round(end_x, 2), end_y=round(end_y, 2),
        outcome="carry",
        ball_speed_kph=round(rng.uniform(8, 26), 1),
        player_speed_kph=round(rng.uniform(10, 28), 1),
        distance_m=round(distance, 1),
        pressure=round(rng.uniform(0.0, 0.8), 2),
    )
    builder.tick(1.0, 3.0)
    return end_x, end_y


def _pressure(builder: Builder, team: str, player: str, x: float, y: float) -> None:
    rng = builder.rng
    builder.add(
        "pressure", team, player, x + rng.uniform(-4, 4), y + rng.uniform(-4, 4),
        outcome="pressed",
        pressure=round(rng.uniform(0.65, 1.0), 2),
        player_speed_kph=round(rng.uniform(22, 33), 1),
        distance_m=round(rng.uniform(5, 15), 1),
    )
    builder.tick(0.8, 2.0)


def _shot(builder: Builder, team: str, player: str, x: float, y: float,
          goal: bool = False) -> None:
    rng = builder.rng
    speed = round(rng.uniform(70, 126), 1)
    builder.add(
        "goal" if goal else "shot", team, player, x, y,
        end_x=100.0, end_y=50.0,
        outcome="goal" if goal else rng.choice(["saved", "off_target", "blocked"]),
        shot_speed_kph=speed,
        ball_speed_kph=speed,
        player_speed_kph=round(rng.uniform(10, 24), 1),
        distance_m=round(rng.uniform(2, 8), 1),
        pressure=round(rng.uniform(0.2, 1.0), 2),
    )
    builder.tick(2.0, 5.0)


def _goal_move(builder: Builder, team: str, scorer: str, opponent: str,
               players: list[str], defenders: list[str]) -> None:
    """A short, believable move that ends in a goal."""
    rng = builder.rng
    x, y = rng.uniform(40, 58), rng.uniform(25, 75)
    builder.add("possession", team, players[0], x, y, outcome="won")
    builder.tick(0.8, 1.5)
    for _ in range(3):
        x, y = _pass(builder, team, rng.choice(players), x, y, long=rng.random() < 0.15)
    _pressure(builder, opponent, rng.choice(defenders), x, y)
    x, y = _carry(builder, team, scorer, x, y)
    _shot(builder, team, scorer, min(96, max(82, x)), y)
    _shot(builder, team, scorer, rng.uniform(88, 96), rng.uniform(40, 60), goal=True)


def _phase(builder: Builder, team: str, opponent: str, players: list[str],
           defenders: list[str]) -> None:
    rng = builder.rng
    x, y = rng.uniform(18, 55), rng.uniform(12, 88)
    builder.add("possession", team, rng.choice(players), x, y, outcome="won")
    builder.tick(0.8, 1.5)
    for _ in range(rng.randint(2, 5)):
        if rng.random() < 0.30:
            _pressure(builder, opponent, rng.choice(defenders), x, y)
        if rng.random() < 0.07:
            kind = rng.choice(["tackle", "interception"])
            builder.add(kind, opponent, rng.choice(defenders), x, y, outcome="won",
                        pressure=round(rng.uniform(0.3, 0.9), 2),
                        distance_m=round(rng.uniform(2, 8), 1))
            builder.tick(1.0, 3.0)
            return
        if rng.random() < 0.03:
            builder.add("foul", opponent, rng.choice(defenders), x, y, outcome="committed",
                        pressure=round(rng.uniform(0.3, 1.0), 2),
                        distance_m=round(rng.uniform(1, 5), 1))
            builder.tick(2.0, 5.0)
            return
        if x >= 74 and rng.random() < 0.24:
            _shot(builder, team, rng.choice(players), x, y)
            return
        if rng.random() < 0.62:
            x, y = _pass(builder, team, rng.choice(players), x, y, long=rng.random() < 0.14)
        else:
            x, y = _carry(builder, team, rng.choice(players), x, y)
    if x >= 72:
        _shot(builder, team, rng.choice(players), x, y)


def generate_match(seed: int = 7, minutes: float = 90.0,
                   home: str = HOME, away: str = AWAY) -> dict:
    """Return a deterministic match object with metadata and a full event list."""
    rng = random.Random(seed)
    builder = Builder(rng)
    score = {home: 0, away: 0}

    # A scripted spine so every milestone is reachable in the demo data:
    # away lead, home equalise and lead (comeback), home hat-trick, away pull one back.
    script = [
        (12.0, away, AWAY_PLAYERS[9]),
        (28.0, home, HOME_PLAYERS[8]),
        (41.0, home, HOME_PLAYERS[8]),
        (63.0, home, HOME_PLAYERS[8]),
        (78.0, away, AWAY_PLAYERS[9]),
        (88.0, home, HOME_PLAYERS[10]),
    ]
    script_index = 0

    while builder.time < minutes:
        if script_index < len(script) and builder.time >= script[script_index][0] - 1.0:
            minute, team, scorer = script[script_index]
            builder.time = max(builder.time, minute - 1.0)
            opponent = away if team == home else home
            players = HOME_PLAYERS if team == home else AWAY_PLAYERS
            defenders = AWAY_PLAYERS if team == home else HOME_PLAYERS
            _goal_move(builder, team, scorer, opponent, players, defenders)
            score[team] += 1
            script_index += 1
            continue

        team = home if rng.random() < 0.52 else away
        opponent = away if team == home else home
        players = HOME_PLAYERS if team == home else AWAY_PLAYERS
        defenders = AWAY_PLAYERS if team == home else HOME_PLAYERS
        _phase(builder, team, opponent, players, defenders)

    # The scripted goals must be in the file even if the clock ran out mid-move.
    while script_index < len(script):
        minute, team, scorer = script[script_index]
        builder.time = max(builder.time, minute)
        opponent = away if team == home else home
        players = HOME_PLAYERS if team == home else AWAY_PLAYERS
        defenders = AWAY_PLAYERS if team == home else HOME_PLAYERS
        _goal_move(builder, team, scorer, opponent, players, defenders)
        score[team] += 1
        script_index += 1

    builder.events.sort(key=lambda event: (event["minute"], event["id"]))
    metadata = {
        "home": home,
        "away": away,
        "competition": "Synthetic League",
        "season": "2026",
        "venue": "Generated Stadium",
        "kickoff": "2026-10-24T15:00:00Z",
        "weather": "clear",
        "pitch_length_m": 105.0,
        "pitch_width_m": 68.0,
        "source": "synthetic generator",
        "generator": "scripts/generate_match.py",
        "seed": seed,
        "scripted_score": f"{score[home]}-{score[away]}",
    }
    return {"metadata": metadata, "events": builder.events}


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a synthetic football match.")
    parser.add_argument("--out", default="data/synthetic_match.json")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--minutes", type=float, default=90.0)
    parser.add_argument("--home", default=HOME)
    parser.add_argument("--away", default=AWAY)
    args = parser.parse_args()

    match = generate_match(args.seed, args.minutes, args.home, args.away)
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(match, indent=2), encoding="utf-8")
    print(f"wrote {len(match['events'])} events to {path} "
          f"({match['metadata']['scripted_score']})")


if __name__ == "__main__":
    main()
