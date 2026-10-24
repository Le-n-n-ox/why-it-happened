import os
from unittest.mock import patch

os.environ["DB_PATH"] = ":memory:"

from app import db, narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402
from app.narrator import ensure_citations, narrate_all, numbers_are_grounded, template_narration, write_recap  # noqa: E402
from app.store import OmniPitchStore  # noqa: E402

EVENTS = load_events("data/sample_match.json")


def fresh_db():
    """Reset in-memory database and narrator state between tests."""
    db._connection = None
    db.init_db()
    narrator._failures, narrator._pause_until = 0, 0.0    # breaker state must not leak between tests


def test_detects_insights_in_the_sample():
    found = detect_all(EVENTS)
    assert [(i.kind, i.team) for i in found] == [
        ("counter_attack", "Reds"), ("counter_attack", "Reds"),
        ("first_goal", "Reds"),
        ("turnover_shot", "Blues"), ("counter_attack", "Blues"),
    ]
    assert found[3].evidence == ["e11", "e12"]


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


def test_recap_accepts_grounded_numbers_and_rejects_invented_ones():
    score = {"Reds": 1, "Blues": 0}
    moments = [{"minute": 14, "team": "Reds", "what": "14' Reds reach a goal in 11 seconds after 1 pass."}]
    try:
        with patch.object(narrator, "_chat", return_value="Reds won 1-0, a goal at 14 after 11 seconds."):
            assert write_recap("m", "en", score, moments).startswith("Reds won")
        with patch.object(narrator, "_chat", return_value="Reds won 4-0 with a goal at 77 [e1]"):
            try:
                write_recap("m", "en", score, moments)
                raise AssertionError("should have rejected 4 and 77")
            except ValueError:
                pass
    finally:
        narrator._failures, narrator._pause_until = 0, 0.0      # leave the breaker clean


def test_few_shot_examples_obey_our_own_rules():
    from app.detectors import Insight
    from app.narrator import EXAMPLE_PAYLOAD, FEW_SHOT_BY_LANGUAGE, numbers_are_grounded

    example = Insight(
        kind=EXAMPLE_PAYLOAD["kind"], team=EXAMPLE_PAYLOAD["team"], minute=EXAMPLE_PAYLOAD["minute"],
        evidence=EXAMPLE_PAYLOAD["evidence"],
        facts={**EXAMPLE_PAYLOAD["facts"], "why": EXAMPLE_PAYLOAD["why"]},
    )
    for language, text in FEW_SHOT_BY_LANGUAGE.items():
        assert ensure_citations(text, example) == text, language      # cites every evidence id
        assert numbers_are_grounded(text, example), language          # only the minute and the facts


def test_example_is_sent_before_the_real_insight():
    insight = detect_all(EVENTS)[0]
    sent = {}
    with patch.object(narrator, "_chat", side_effect=lambda model, messages, label, **kw: sent.update(m=messages) or "x"):
        narrator.narrate(None, "m", insight, "Swahili")
        swahili = sent["m"]
        narrator.narrate(None, "m", insight, "Klingon")                # no example for this language
        klingon = sent["m"]
    assert [m["role"] for m in swahili] == ["system", "user", "assistant", "user"]
    assert "e901" in swahili[1]["content"] and "e1" in swahili[3]["content"]
    assert [m["role"] for m in klingon] == ["system", "user"]


def test_a_match_file_with_repeated_ids_is_loaded_once_and_in_order(tmp_path):
    import json
    from app.events import load_events

    base = json.loads(open("data/sample_match.json").read())
    doubled = base + base + [{"id": "late", "minute": 1.0, "team": "Reds", "player": None,
                              "type": "pass", "x": 10, "y": 10}]
    path = tmp_path / "doubled.json"
    path.write_text(json.dumps(doubled))
    loaded = load_events(path)
    assert len(loaded) == len(base) + 1
    assert [event.minute for event in loaded] == sorted(event.minute for event in loaded)
