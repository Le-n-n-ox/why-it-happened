"""Momentum swings: the rules find the jumps in the win-probability line, the model proposes why."""
import os

from app import momentum as mom
from app import narrator
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)


class FakeModel:
    def __init__(self, reply):
        self.reply, self.calls = reply, 0

    def __call__(self, model, messages, label, max_tokens=0):
        self.calls += 1
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def run(reply, **kw):
    old_chat, old_key = mom._chat if hasattr(mom, "_chat") else None, os.environ.get("NVIDIA_API_KEY")
    from app import hypotheses as hyp
    old_hyp_chat = hyp._chat
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    fake = FakeModel(reply)
    hyp._chat = fake
    try:
        return mom.momentum(EVENTS, model="m", **kw), fake
    finally:
        hyp._chat = old_hyp_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def test_the_line_is_read_every_minute():
    line = mom.probability_line(EVENTS)
    assert line and line[0]["minute"] == 0
    assert set(line[0]["probabilities"]) == {"Reds", "Blues", "draw"}
    assert sum(line[0]["probabilities"].values()) == 100


def test_a_jump_becomes_a_swing_and_merges_with_its_neighbours():
    line = [{"minute": 0, "probabilities": {"Reds": 40, "Blues": 40, "draw": 20}, "score": {"Reds": 0, "Blues": 0}},
            {"minute": 1, "probabilities": {"Reds": 55, "Blues": 25, "draw": 20}, "score": {"Reds": 0, "Blues": 0}},
            {"minute": 2, "probabilities": {"Reds": 80, "Blues": 10, "draw": 10}, "score": {"Reds": 1, "Blues": 0}},
            {"minute": 3, "probabilities": {"Reds": 80, "Blues": 10, "draw": 10}, "score": {"Reds": 1, "Blues": 0}}]
    jumps = mom._jumps(line)
    assert len(jumps) == 1                       # the two jumps are one spell, not two
    assert jumps[0]["from"] == 40 and jumps[0]["to"] == 80 and jumps[0]["delta"] == 40


def test_a_small_move_is_not_a_swing():
    line = [{"minute": 0, "probabilities": {"Reds": 40, "Blues": 40, "draw": 20}, "score": {"Reds": 0, "Blues": 0}},
            {"minute": 1, "probabilities": {"Reds": 45, "Blues": 35, "draw": 20}, "score": {"Reds": 0, "Blues": 0}}]
    assert mom._jumps(line) == []


def test_the_report_names_the_turn_and_tests_the_claims():
    out, fake = run("not json", mode="sweep")
    assert out["swings"], "the demo match must have a swing"
    swing = out["swings"][0]
    assert swing["team"] in ("Reds", "Blues")
    assert swing["to"] > swing["from"] and swing["delta"] >= mom.SWING_MIN_POINTS
    assert swing["summary"] and swing["cause"]["id"]
    assert swing["source"] == "sweep" and swing["alpha"] is None
    assert all(h["verdict"] == "supported" for h in swing["hypotheses"])
    assert all(h["evidence"] for h in swing["hypotheses"])


def test_a_model_reply_is_proposed_and_then_tested():
    reply = ('{"hypotheses": [{"statement": "Reds pinned them back.", "team": "Reds", "from": 55, "to": 60, '
             '"where": {"x": [67, 100]}, "measure": "share", "versus": "rest_of_match", "direction": "higher"}]}')
    out, fake = run(reply, mode="auto")
    swing = out["swings"][0]
    assert swing["source"] == "model" and swing["alpha"] is not None
    assert fake.calls >= 2                       # the proposal, then the evidence picker
    assert swing["hypotheses"], "the claim must reach the tests"
    for claim in swing["hypotheses"]:
        assert claim["verdict"] in ("supported", "not supported", "too little data")
        assert claim["evidence"] and set(claim["evidence"]) <= {e.id for e in EVENTS}
