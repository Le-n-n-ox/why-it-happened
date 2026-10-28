"""The evidence picker: the rules offer the events, the model chooses among them."""
import json
import os

from app import hypotheses as hyp
from app import narrator
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)
TEAMS = ["Reds", "Blues"]
PRESSURE = {"team": "Reds", "from": 59.3, "to": 64.3, "where": {"x": [67, 100]},
            "measure": "share", "versus": "rest_of_match", "direction": "higher"}


def _result():
    claim = hyp.clean_claim(PRESSURE, TEAMS, 64.3)
    return hyp.check_claim(EVENTS, claim)


def test_the_rules_offer_the_candidates():
    result = _result()
    offers = hyp.offer_candidates(EVENTS, [result])
    assert result["candidates"], "the rules must offer some candidates"
    assert set(result["candidates"]) <= {e.id for e in EVENTS}
    assert len(offers[0]) == len(result["candidates"])
    assert offers[0][0]["id"] in result["candidates"]


def test_the_model_may_only_pick_from_the_candidates():
    result = _result()
    hyp.offer_candidates(EVENTS, [result])
    allowed = result["candidates"]
    reply = json.dumps({"picks": [{"index": 0, "ids": [allowed[1], allowed[0], "not-a-real-id"]}]})
    old_chat, old_key = hyp._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    hyp._chat = lambda *a, **k: reply
    try:
        hyp.pick_evidence("m", EVENTS, [result])
    finally:
        hyp._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key
    assert result["evidence"] == [allowed[1], allowed[0]]      # the invented id is dropped
    assert len(result["evidence"]) <= hyp.PICKED_EVIDENCE


def test_a_broken_reply_leaves_the_rules_choice():
    result = _result()
    old_chat, old_key = hyp._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    hyp._chat = lambda *a, **k: "sorry, no json here"
    try:
        hyp.pick_evidence("m", EVENTS, [result])
    finally:
        hyp._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key
    assert result["evidence"] == result["candidates"][:hyp.PICKED_EVIDENCE]


def test_a_pick_for_another_claim_is_ignored():
    results = [_result(), _result()]
    hyp.offer_candidates(EVENTS, results)
    reply = json.dumps({"picks": [{"index": 5, "ids": [results[0]["candidates"][0]]}]})
    old_chat, old_key = hyp._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    hyp._chat = lambda *a, **k: reply
    try:
        hyp.pick_evidence("m", EVENTS, results)
    finally:
        hyp._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key
    for result in results:
        assert result["evidence"] == result["candidates"][:hyp.PICKED_EVIDENCE]
