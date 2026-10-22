"""Whole-match style claims: the same grammar and the same tests, over a much longer window."""
import json
import os

from app import hypotheses as hyp
from app import narrator
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)
TEAMS = ["Reds", "Blues"]


def test_a_style_claim_covers_the_whole_match():
    raw = {"team": "Reds", "from": 10, "to": 20, "where": {"y": [67, 100]}, "measure": "share",
           "versus": "opponent", "direction": "higher"}
    claim = hyp.clean_claim(raw, TEAMS, 30.0, whole_match=True, match_minute=30.0)
    assert claim["from"] == 0 and claim["to"] == 30.0            # a short window is not a style claim
    assert claim["versus"] == "opponent"


def test_a_long_window_the_model_asks_for_is_kept():
    raw = {"team": "Reds", "from": 5, "to": 28, "where": {"y": [67, 100]}, "measure": "share",
           "versus": "opponent", "direction": "higher"}
    claim = hyp.clean_claim(raw, TEAMS, 30.0, whole_match=True, match_minute=30.0)
    assert (claim["from"], claim["to"]) == (5, 28)


def test_a_goal_style_claim_still_uses_the_short_window():
    raw = {"team": "Reds", "from": 10, "to": 25, "where": {"y": [67, 100]}}
    claim = hyp.clean_claim(raw, TEAMS, 30.0)
    assert (claim["from"], claim["to"]) == (25.0, 30.0)


def test_a_whole_match_claim_is_compared_with_the_opponent():
    raw = {"team": "Reds", "from": 0, "to": 30, "where": {"x": [67, 100]}, "measure": "share",
           "versus": "rest_of_match", "direction": "higher"}
    claim = hyp.clean_claim(raw, TEAMS, 30.0, whole_match=True, match_minute=30.0)
    assert claim["versus"] == "opponent"                        # there is no rest of the match
    result = hyp.check_claim(EVENTS, claim)
    assert result["verdict"] in ("supported", "not supported", "too little data")
    assert result["n"] > hyp.MIN_WINDOW_EVENTS                  # more data than a five-minute window


class FakeModel:
    def __init__(self, reply):
        self.reply, self.calls = reply, 0

    def __call__(self, model, messages, label, max_tokens=0):
        self.calls += 1
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def run(reply, **kw):
    old_chat, old_key = hyp._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    fake = FakeModel(reply)
    hyp._chat = fake
    try:
        return hyp.style_claims(EVENTS, model="m", **kw), fake
    finally:
        hyp._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def test_the_sweep_tests_the_whole_match_against_the_opponent():
    out, _ = run("unused", mode="sweep", team="Reds")
    assert out["available"] and out["team"] == "Reds"
    assert out["window"]["from"] == 0
    assert out["source"] == "sweep" and out["alpha"] is None
    for claim in out["hypotheses"]:
        assert claim["from"] == 0 and abs(claim["to"] - out["window"]["to"]) < 0.1
        assert claim["versus"] == "opponent"
        assert claim["evidence"]


def test_the_model_claims_about_the_team_are_tested():
    reply = json.dumps({"hypotheses": [
        {"statement": "Reds attacked down the right.", "team": "Reds", "from": 0, "to": 30,
         "where": {"y": [67, 100]}, "measure": "share", "versus": "opponent", "direction": "higher"},
        {"statement": "About someone else.", "team": "Blues", "from": 0, "to": 30,
         "where": {"y": [67, 100]}, "measure": "share", "versus": "opponent", "direction": "higher"}]})
    out, fake = run(reply, mode="auto", team="Reds")
    assert out["source"] == "model"
    assert len(out["hypotheses"]) == 1                          # the claim about the other team is dropped
    assert out["hypotheses"][0]["team"] == "Reds"
    assert out["hypotheses"][0]["verdict"] in ("supported", "not supported", "too little data")
    assert out["alpha"] == round(0.05 / 1, 4)


def test_an_unknown_team_says_so():
    out = hyp.style_claims(EVENTS, mode="sweep", team="Nobody FC")
    assert out["available"] is False and out["reason"]
