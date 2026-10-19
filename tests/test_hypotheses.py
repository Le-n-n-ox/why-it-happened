"""Hypotheses: the model proposes, the rules test. Nothing the model writes becomes a number."""
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


def test_clean_claim_keeps_only_what_the_grammar_allows():
    ok = hyp.clean_claim({**PRESSURE, "statement": "Reds camped in the final third."}, TEAMS, 64.3)
    assert ok["team"] == "Reds" and ok["where"] == {"x": [67.0, 100.0]} and ok["statement"]
    assert hyp.clean_claim({**PRESSURE, "team": "Nobody FC"}, TEAMS, 64.3) is None
    assert hyp.clean_claim({**PRESSURE, "where": {}}, TEAMS, 64.3) is None                 # would match everything
    assert hyp.clean_claim({**PRESSURE, "where": {"types": ["teleport"]}}, TEAMS, 64.3) is None
    assert hyp.clean_claim({**PRESSURE, "where": {"x": [90, 10]}}, TEAMS, 64.3) is None
    assert hyp.clean_claim("rubbish", TEAMS, 64.3) is None
    odd = hyp.clean_claim({**PRESSURE, "from": 0, "to": 120, "measure": "magic", "direction": "sideways"}, TEAMS, 64.3)
    assert (odd["from"], odd["to"]) == (59.3, 64.3)                                        # window too long: reset
    assert odd["measure"] == "share" and odd["direction"] == "higher"


def test_the_model_writes_no_numbers():
    claim = hyp.clean_claim({**PRESSURE, "statement": "Reds had 90% of the ball."}, TEAMS, 64.3)
    assert claim["statement"] == ""


def test_exact_tails():
    assert abs(hyp._binom_tail(8, 8, 0.5, True) - 1 / 256) < 1e-12
    assert abs(hyp._binom_tail(0, 4, 0.5, False) - 1 / 16) < 1e-12
    assert abs(hyp._poisson_tail(0, 2.0, False) - 0.1353352832) < 1e-9
    assert abs(hyp._poisson_tail(1, 2.0, True) - (1 - 0.1353352832)) < 1e-9


def test_supported_claim_has_numbers_evidence_and_a_plain_sentence():
    r = hyp.check_claim(EVENTS, hyp.clean_claim(PRESSURE, TEAMS, 64.3))
    assert r["verdict"] == "supported" and r["value"] > r["baseline"] and r["p_value"] < 0.05
    assert r["evidence"] and set(r["evidence"]) <= {e.id for e in EVENTS}
    text = hyp.sentence(r)
    assert "final third" in text and "x=" not in text and "pitch units" not in text


def test_a_wrong_claim_is_not_supported():
    wrong = {**PRESSURE, "where": {"x": [0, 33]}}                    # Reds were nowhere near their own third
    assert hyp.check_claim(EVENTS, hyp.clean_claim(wrong, TEAMS, 64.3))["verdict"] == "not supported"
    lower = {**PRESSURE, "where": {"y": [0, 33]}, "direction": "lower"}
    # Avoiding a flank is only weakly supported (p about 0.05), so it fails once three claims share the bar.
    assert hyp.check_claim(EVENTS, hyp.clean_claim(lower, TEAMS, 64.3), alpha=0.05 / 3)["verdict"] == "not supported"


def test_too_little_data_is_reported_not_guessed():
    tiny = {**PRESSURE, "from": 0.0, "to": 0.4}
    assert hyp.check_claim(EVENTS, hyp.clean_claim(tiny, TEAMS, 0.4))["verdict"] == "too little data"


def test_a_stricter_bar_for_more_claims():
    claim = hyp.clean_claim({"team": "Blues", "from": 73.2, "to": 78.2, "where": {"x": [0, 33]},
                             "measure": "share", "versus": "rest_of_match", "direction": "lower"}, TEAMS, 78.2)
    loose = hyp.check_claim(EVENTS, claim, alpha=0.05)
    strict = hyp.check_claim(EVENTS, claim, alpha=0.05 / 3)
    assert loose["p_value"] == strict["p_value"]
    assert loose["verdict"] == "supported" and strict["verdict"] == "not supported"


def test_rate_claims_work_against_the_opponent():
    claim = hyp.clean_claim({**PRESSURE, "measure": "rate", "versus": "opponent"}, TEAMS, 64.3)
    r = hyp.check_claim(EVENTS, claim)
    assert r["verdict"] == "supported" and "a minute" in hyp.sentence(r)


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
        return hyp.hypotheses(EVENTS, FOUND, model="m", **kw), fake
    finally:
        hyp._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def test_model_ideas_are_tested_and_refuted_ones_stay_visible():
    reply = json.dumps({"hypotheses": [
        {**PRESSURE, "statement": "Reds pinned Blues back."},
        {**PRESSURE, "where": {"x": [0, 33]}, "statement": "Reds were stuck deep."},
        {**PRESSURE, "team": "Nobody FC"}]})
    out, fake = run(reply, goal_id="d134")
    assert len(out) == 1 and out[0]["source"] == "model" and fake.calls == 1
    verdicts = [h["verdict"] for h in out[0]["hypotheses"]]
    assert verdicts == ["supported", "not supported"]          # the invalid claim never reaches the tests
    assert all(h["text"] and "evidence" in h for h in out[0]["hypotheses"])
    assert out[0]["alpha"] == round(0.05 / 2, 4)


def test_without_a_working_model_the_sweep_takes_over():
    out, _ = run(RuntimeError("down"), goal_id="d134")
    assert out[0]["source"] == "sweep" and out[0]["alpha"] is None
    assert all(h["verdict"] == "supported" for h in out[0]["hypotheses"])
    out, _ = run("not json at all", goal_id="d134")
    assert out[0]["source"] == "sweep"


def test_sweep_pays_for_testing_everything():
    """Correcting for every pattern tried leaves no power in a short window: it finds little or nothing."""
    quiet = [g for g in hyp.moments(EVENTS, FOUND) if g["goal"].id == "d73"][0]["goal"]
    assert hyp.sweep(EVENTS, quiet) == []


def test_every_goal_gets_a_moment():
    ids = [m["goal"].id for m in hyp.moments(EVENTS, FOUND)]
    assert ids == ["d73", "d134", "d162"]