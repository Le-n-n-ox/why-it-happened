"""Backbone tests. Run from the repo root:  pytest -q"""
from app.detectors import detect_all
from app.events import load_events
from app.narrator import citations_are_valid, narrate_all, template_narration
from app.store import InsightStore

EVENTS = load_events("data/sample_match.json")


def test_sample_data_loads():
    assert len(EVENTS) == 15
    assert len({e.id for e in EVENTS}) == 15          # ids are unique


def test_detects_three_counter_attacks():
    found = detect_all(EVENTS)
    assert [i.team for i in found] == ["Reds", "Reds", "Blues"]
    assert found[0].evidence == ["e1", "e2", "e3", "e4"]
    assert found[1].facts["ended_in"] == "goal"
    # the slow Blues move at minute 20 (30 seconds) must NOT count
    assert all("e11" not in i.evidence for i in found)


def test_citation_check_rejects_invented_ids():
    insight = detect_all(EVENTS)[0]
    assert citations_are_valid("Great break! [e1, e2]", insight)
    assert not citations_are_valid("Great break! [e1, e99]", insight)
    assert not citations_are_valid("No citation at all", insight)


def test_template_has_valid_citations():
    insight = detect_all(EVENTS)[0]
    assert citations_are_valid(template_narration(insight), insight)


class _FakeClient:
    """Stands in for the NVIDIA client so tests need no network."""

    def __init__(self, reply):
        self.reply = reply
        reply_text = reply

        class _Completions:
            @staticmethod
            def create(**kwargs):
                msg = type("M", (), {"content": reply_text})
                return type("R", (), {"choices": [type("C", (), {"message": msg})]})

        self.chat = type("Chat", (), {"completions": _Completions})


def test_narrate_uses_model_when_citations_ok():
    insight = detect_all(EVENTS)[0]
    out = narrate_all(insight, _FakeClient("Quick break! [e1, e2, e3, e4]"), "any-model", ["en", "sw"])
    assert out["en"].startswith("Quick break!") and out["sw"].startswith("Quick break!")


def test_narrate_falls_back_when_model_invents_evidence():
    insight = detect_all(EVENTS)[0]
    out = narrate_all(insight, _FakeClient("Wow! [e1, e77]"), "any-model", ["en"])
    assert out["en"] == template_narration(insight)


def test_narrate_without_client_uses_template():
    insight = detect_all(EVENTS)[0]
    out = narrate_all(insight, None, None, ["en"])
    assert out["en"] == template_narration(insight)


def test_store_roundtrip():
    store = InsightStore()
    insight = detect_all(EVENTS)[1]
    insight.narration = {"en": "x"}
    store.add(insight.to_dict())
    store.add(insight.to_dict())                      # same id: replaced, not duplicated
    assert len(store.list()) == 1
    store.clear()
    assert store.list() == []
