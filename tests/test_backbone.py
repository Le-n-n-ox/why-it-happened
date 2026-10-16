import os
from unittest.mock import patch

os.environ["DB_PATH"] = ":memory:"

from app import db, narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402
from app.narrator import ensure_citations, narrate_all, numbers_are_grounded, template_narration  # noqa: E402
from app.store import OmniPitchStore  # noqa: E402

EVENTS = load_events("data/sample_match.json")


def fresh_db():
    """Reset in-memory database and narrator state between tests."""
    db._connection = None
    db.init_db()
    narrator._failures = 0
    narrator._pause_until = 0.0


def test_detects_four_insights_in_the_sample():
    found = detect_all(EVENTS)
    assert [(i.kind, i.team) for i in found] == [
        ("counter_attack", "Reds"), ("counter_attack", "Reds"),
        ("turnover_shot", "Blues"), ("counter_attack", "Blues"),
    ]
    assert found[2].evidence == ["e11", "e12"]


def test_ensure_citations():
    insight = detect_all(EVENTS)[0]
    assert ensure_citations("Great break [e1, e2]", insight) == "Great break [e1, e2]"
    assert ensure_citations("Great break", insight).endswith("[e1, e2, e3, e4]")
    try:
        ensure_citations("Great break [e1, e99]", insight)
        raise AssertionError("should have rejected e99")
    except ValueError:
        pass


def test_every_template_cites_real_evidence():
    for insight in detect_all(EVENTS):
        text = template_narration(insight)
        assert text.endswith("[" + ", ".join(insight.evidence) + "]")
        assert "detected" not in text


def test_narrate_falls_back_when_model_invents_evidence():
    fresh_db()
    insight = detect_all(EVENTS)[0]
    with patch.object(narrator, "narrate", return_value="Wow [e1, e77]"), \
            patch.dict(os.environ, {"NVIDIA_API_KEY": "x"}), patch.object(narrator.time, "sleep"):
        out = narrate_all(None, "any-model", insight, ["en", "sw"])
    assert out == {"en": template_narration(insight)}


def test_second_call_comes_from_the_cache():
    fresh_db()
    insight = detect_all(EVENTS)[0]
    with patch.object(narrator, "narrate", return_value="First [e1]") as model, \
            patch.dict(os.environ, {"NVIDIA_API_KEY": "x"}), patch.object(narrator.time, "sleep"):
        narrate_all(None, "m", insight, ["en"])
        narrate_all(None, "m", insight, ["en"])
    assert model.call_count == 1


def test_store_roundtrip():
    store = OmniPitchStore()
    insight = detect_all(EVENTS)[1]
    insight.narration = {"en": "x"}
    store.add_insight(insight.to_dict())
    store.add_insight(insight.to_dict())
    assert len(store.list_insights()) == 1
    store.clear()
    assert store.list_insights() == []


def test_numbers_must_come_from_the_facts():
    insight = detect_all(EVENTS)[0]      # minute 10, 12 seconds, 2 passes
    assert numbers_are_grounded("At 10' Reds reached a shot in 12 seconds after 2 passes [e1]", insight)
    assert not numbers_are_grounded("They ran from 30 metres to 88 [e1]", insight)
