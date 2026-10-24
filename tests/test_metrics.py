"""Derived physical metrics and the threshold detectors built on them."""
from app.detectors import detect_distance_thresholds, detect_milestones, detect_speed_thresholds
from app.events import EventType, MatchEvent
from app.metrics import (BALL_SPEED_KPH, SHOT_SPEED_KPH, SPRINT_KPH, enrich_events,
                         pass_accuracy, pass_metrics, pitch_distance)
from app.tactics import pass_quality


def ev(id, minute, team, type, x, y=50, player=None, **fields):
    return MatchEvent(id=id, minute=minute, team=team, player=player,
                      type=EventType(type), x=x, y=y, **fields)


def test_pitch_distance_uses_metres_not_pitch_units():
    assert round(pitch_distance(0, 50, 100, 50), 1) == 105.0
    assert round(pitch_distance(50, 0, 50, 100), 1) == 68.0


def test_long_pressure_pass_is_measured_and_rated_hard():
    events = [
        ev("p1", 10.0, "Reds", "pass", 20, 50, "Pryce", end_x=62, end_y=50,
           pressure=0.9),
        ev("p2", 10.1, "Reds", "carry", 65, 50, "Quill"),
    ]
    metrics = pass_metrics(events, 0)
    assert 40 <= metrics["distance_m"] <= 46
    assert metrics["accuracy"] == 1.0
    assert metrics["difficulty"] >= 0.55
    assert metrics["difficulty_rating"] in {"difficult", "very_difficult"}

    quality = pass_quality(events, 0)
    assert quality["distance_m"] == metrics["distance_m"]
    assert quality["difficulty"] == metrics["difficulty"]
    assert "difficult_pass" in {reason["code"] for reason in quality["reasons"]}


def test_short_square_pass_stays_routine():
    events = [
        ev("p1", 10.0, "Reds", "pass", 50, 50, "Pryce", end_x=53, end_y=50),
        ev("p2", 10.1, "Reds", "carry", 55, 50, "Quill"),
    ]
    metrics = pass_metrics(events, 0)
    assert metrics["distance_m"] < 5
    assert metrics["difficulty_rating"] == "easy"
    assert pass_quality(events, 0)["reasons"] == []


def test_lost_pass_is_incomplete_and_has_no_forward_end():
    events = [
        ev("p1", 10.0, "Reds", "pass", 50, 50, "Pryce"),
        ev("p2", 10.1, "Blues", "interception", 60, 50, "Winter"),
    ]
    metrics = pass_metrics(events, 0)
    assert metrics["accuracy"] == 0.0
    assert metrics["distance_m"] is None


def test_enrich_events_fills_pass_and_ball_speed_fields():
    events = [
        ev("p1", 10.0, "Reds", "pass", 40, 50, "Pryce"),
        ev("p2", 10.1, "Reds", "carry", 60, 50, "Quill"),
        ev("p3", 10.2, "Reds", "shot", 90, 50, "Quill"),
    ]
    enriched = enrich_events(events)
    assert enriched[0].pass_distance_m and enriched[0].pass_distance_m > 15
    assert enriched[0].pass_accuracy == 1.0
    assert enriched[0].ball_speed_kph and enriched[0].ball_speed_kph > 0
    assert enriched[1].distance_m and enriched[1].distance_m > 15
    assert pass_accuracy(enriched, "Reds") == 100


def test_speed_thresholds_keep_the_fastest_crossing_per_player():
    events = [
        ev("s1", 10, "Reds", "carry", 40, 50, "Pryce",
           player_speed_kph=SPRINT_KPH + 1, distance_m=5),
        ev("s2", 20, "Reds", "carry", 60, 50, "Pryce",
           player_speed_kph=SPRINT_KPH + 5, distance_m=6),
        ev("b1", 30, "Reds", "pass", 70, 50, "Quill",
           ball_speed_kph=BALL_SPEED_KPH + 10),
        ev("h1", 40, "Blues", "shot", 90, 50, "Winter",
           shot_speed_kph=SHOT_SPEED_KPH + 5),
    ]
    found = detect_speed_thresholds(events)
    kinds = {i.kind for i in found}
    assert {"sprint", "ball_speed", "shot_speed"} <= kinds
    sprint = next(i for i in found if i.kind == "sprint")
    assert sprint.evidence == ["s2"] and sprint.facts["value"] == SPRINT_KPH + 5


def test_distance_threshold_fires_once_per_player_and_mark():
    events = [
        ev("d1", 10, "Reds", "carry", 40, 50, "Pryce", distance_m=600),
        ev("d2", 20, "Reds", "carry", 50, 50, "Pryce", distance_m=500),
        ev("d3", 30, "Reds", "carry", 60, 50, "Pryce", distance_m=100),
    ]
    found = detect_distance_thresholds(events)
    assert [(i.kind, i.facts["threshold_m"]) for i in found] == [("distance_threshold", 1000)]


def test_milestones_cover_first_goal_brace_hat_trick_and_comeback():
    events = [
        ev("g1", 10, "Blues", "goal", 92, 50, "Winter"),
        ev("g2", 15, "Blues", "goal", 92, 50, "Winter"),
        ev("g3", 25, "Reds", "goal", 92, 50, "Thorne"),
        ev("g4", 35, "Reds", "goal", 92, 50, "Thorne"),
        ev("g5", 45, "Reds", "goal", 92, 50, "Thorne"),
    ]
    found = detect_milestones(events)
    kinds = [i.kind for i in found]
    assert kinds.count("first_goal") == 1
    assert kinds.count("brace") == 2          # both scorers reached two
    assert "hat_trick" in kinds and "comeback" in kinds
    comeback = next(i for i in found if i.kind == "comeback")
    assert comeback.team == "Reds" and comeback.facts["from_score"] == "2-2"
