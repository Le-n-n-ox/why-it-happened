"""goal_buildup: a goal that follows a patient passing move."""
from app.detectors import detect_all, detect_goal_buildups
from app.events import MatchEvent, load_events
from app.narrator import template_narration


def ev(id, minute, team, type, x):
    return MatchEvent(id=id, minute=minute, team=team, type=type, x=x, y=50)


# six touches over 48 seconds, four of them passes, ending in a goal
BUILDUP = [
    ev("b1", 50.0, "Reds", "pass", 20), ev("b2", 50.2, "Reds", "pass", 40),
    ev("b3", 50.4, "Reds", "pass", 55), ev("b4", 50.6, "Reds", "carry", 70),
    ev("b5", 50.7, "Reds", "pass", 80), ev("b6", 50.8, "Reds", "goal", 92),
]


def test_patient_move_into_a_goal_is_found():
    found = detect_all(BUILDUP)
    assert found[0].kind == "goal_buildup"
    assert "first_goal" in {i.kind for i in found}
    assert found[0].evidence == ["b1", "b2", "b3", "b4", "b5", "b6"]
    assert found[0].facts["passes"] == 4 and found[0].facts["duration_s"] == 48


def test_opponent_touch_breaks_the_move():
    broken = [BUILDUP[0], BUILDUP[1], ev("x", 50.3, "Blues", "tackle", 50), *BUILDUP[2:4], BUILDUP[5]]
    assert detect_goal_buildups(broken) == []


def test_needs_enough_passes():
    carries = [ev("c1", 50.0, "Reds", "carry", 20), ev("c2", 50.2, "Reds", "carry", 40),
               ev("c3", 50.3, "Reds", "pass", 60), ev("c4", 50.4, "Reds", "goal", 92)]
    assert detect_goal_buildups(carries) == []


def test_a_goal_already_explained_is_not_shown_twice():
    sample = load_events("data/sample_match.json")        # its goal is already a counter_attack
    assert "goal_buildup" not in {i.kind for i in detect_all(sample)}
    assert len(detect_all(sample)) == 5


def test_trimmed_window_still_overlaps_the_earlier_insight():
    full = detect_all(BUILDUP)[0]
    short = detect_goal_buildups(BUILDUP[1:])[0]            # same goal, the first touch fell out of the window
    assert full.id != short.id                             # the id changes (first evidence differs)...
    assert set(full.evidence) & set(short.evidence)         # ...but the evidence still overlaps


def test_template_sentence_cites_evidence():
    text = template_narration(detect_all(BUILDUP)[0])
    assert "4 passes over 48 seconds" in text and text.endswith("[b1, b2, b3, b4, b5, b6]")
