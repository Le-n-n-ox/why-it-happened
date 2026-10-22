"""The half-time brief: the rules pick the facts and rank them, the model only words them."""
from app.detectors import detect_all
from app.events import load_events
from app.tactics import HALF_TIME, first_half_brief, halftime_insight

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)


def test_the_brief_says_what_worked_what_did_not_and_what_to_watch():
    brief = first_half_brief(EVENTS, "Reds")
    assert brief["available"] and brief["team"] == "Reds"
    for key in ("worked", "didnt", "watch"):
        assert isinstance(brief[key], list)
    assert brief["worked"] or brief["didnt"]


def test_every_finding_carries_its_evidence():
    brief = first_half_brief(EVENTS, "Reds")
    real = {e.id for e in EVENTS}
    for group in ("worked", "didnt", "watch"):
        for finding in brief[group]:
            assert finding["detail"] and finding["title"]
            assert set(finding["evidence"]) <= real, finding


def test_the_facts_are_counts_over_the_first_half_only():
    brief = first_half_brief(EVENTS, "Reds")
    first_half = [e for e in EVENTS if e.minute < HALF_TIME]
    reds = [e for e in first_half if e.team == "Reds"]
    assert brief["stats"]["actions"] == len(reds)
    assert brief["stats"]["shots"] == sum(e.type in ("shot", "goal") for e in reds)
    assert brief["stats"]["xg_for"] > 0


def test_too_little_of_the_first_half_is_reported_not_guessed():
    early = [e for e in EVENTS if e.minute < 12]
    brief = first_half_brief(early, "Reds")
    assert brief["available"] is False and brief["reason"]


def test_the_insight_carries_the_story_for_the_model_to_word():
    brief = first_half_brief(EVENTS, "Reds")
    insight = halftime_insight(EVENTS, "Reds", brief)
    assert insight.kind == "halftime_brief" and insight.team == "Reds"
    assert insight.facts["story"]
    assert set(insight.evidence) <= {e.id for e in EVENTS}
    assert any(line.startswith("Watch:") for line in insight.facts["story"])
