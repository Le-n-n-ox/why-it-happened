"""The synthetic generator must produce a loadable, explainable match."""
import json

from app.detectors import detect_all
from app.events import load_match
from app.metrics import enrich_events
from app.tactics import pass_quality
from scripts.generate_match import generate_match


def test_generator_is_deterministic_and_has_metadata():
    first = generate_match(seed=7)
    second = generate_match(seed=7)
    assert first["metadata"] == second["metadata"]
    assert [e["id"] for e in first["events"]] == [e["id"] for e in second["events"]]
    meta = first["metadata"]
    assert meta["home"] == "Reds" and meta["away"] == "Blues"
    assert meta["competition"] and meta["pitch_length_m"] == 105.0


def test_generator_covers_possession_pressure_and_physical_fields():
    match = generate_match(seed=7)
    events = match["events"]
    types = {event["type"] for event in events}
    assert {"possession", "pressure", "pass", "carry", "shot", "goal"} <= types
    assert any(event.get("pass_distance_m") for event in events)
    assert any(event.get("pass_difficulty", 0) >= 0.55 for event in events)
    assert any(event.get("shot_speed_kph", 0) >= 110 for event in events)
    assert any(event.get("player_speed_kph", 0) >= 25 for event in events)
    assert any(event.get("distance_m", 0) > 0 for event in events)


def test_generated_file_loads_and_reaches_the_milestones(tmp_path):
    match = generate_match(seed=7)
    path = tmp_path / "synthetic.json"
    path.write_text(json.dumps(match), encoding="utf-8")

    events, metadata = load_match(path)
    assert metadata["home"] == "Reds" and len(events) == len(match["events"])
    assert [event.minute for event in events] == sorted(event.minute for event in events)
    assert len({event.id for event in events}) == len(events)

    enriched = enrich_events(events)
    found = detect_all(enriched)
    kinds = {insight.kind for insight in found}
    assert {"first_goal", "brace", "hat_trick", "comeback"} <= kinds
    assert {"sprint", "shot_speed", "distance_threshold"} <= kinds

    pass_event = next(event for event in enriched
                      if event.type.value == "pass" and event.pass_distance_m)
    index = next(i for i, event in enumerate(enriched) if event.id == pass_event.id)
    quality = pass_quality(enriched, index)
    assert quality["distance_m"] == pass_event.pass_distance_m
    assert quality["difficulty"] is not None and pass_event.pass_difficulty is not None
    assert quality["accuracy"] == pass_event.pass_accuracy
