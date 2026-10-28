"""Small adapter helpers for converting official event data to our internal schema."""

from typing import Final


TYPE_MAP: Final[dict[str, str]] = {
    "Pass": "pass",
    "Carry": "carry",
    "Shot": "shot",
    "Goal": "goal",
    "Tackle": "tackle",
    "Interception": "interception",
    "Foul": "foul",
    "Possession": "possession",
    "Pressure": "pressure",
    "pass": "pass",
    "carry": "carry",
    "shot": "shot",
    "goal": "goal",
    "tackle": "tackle",
    "interception": "interception",
    "foul": "foul",
    "possession": "possession",
    "pressure": "pressure",
}


def normalise_xy(
    x: float,
    y: float,
    source_width: float,
    source_height: float,
    attacks_right: bool,
) -> tuple[float, float]:
    """Scale coordinates to a 0-100 pitch and orient them toward the attack."""
    normalised_x = (float(x) / source_width) * 100
    normalised_y = (float(y) / source_height) * 100
    if not attacks_right:
        normalised_x = 100 - normalised_x
    return (
        max(0.0, min(100.0, normalised_x)),
        max(0.0, min(100.0, normalised_y)),
    )
