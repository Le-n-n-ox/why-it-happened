"""Follow-up questions: the model resolves what 'it' means, the rules keep the rest of the guards."""
import json
import os

from app import ask
from app import narrator
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)
TEAMS = ["Reds", "Blues"]


class FakeModel:
    def __init__(self, router_reply, followup_reply=None):
        self.router_reply, self.followup_reply = router_reply, followup_reply
        self.calls = []

    def __call__(self, model, messages, label, max_tokens=0):
        self.calls.append(label)
        if label == "ask follow-up":
            if isinstance(self.followup_reply, Exception):
                raise self.followup_reply
            return self.followup_reply
        if isinstance(self.router_reply, Exception):
            raise self.router_reply
        return self.router_reply


def run(fake, question, mode="auto", previous=None):
    old_chat, old_key = ask._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    ask._chat = fake
    try:
        return ask.answer(EVENTS, FOUND, question, mode=mode, model="test-model", previous=previous)
    finally:
        ask._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def test_a_question_with_no_previous_one_is_not_a_follow_up():
    assert ask.looks_like_followup("Why did Reds win?", None) is False
    assert ask.looks_like_followup("Who is likely to win?", "Why did Reds win?") is False


def test_a_follow_up_is_recognised():
    assert ask.looks_like_followup("and in the second half?", "How did Blues play?") is True
    assert ask.looks_like_followup("What about Hazard?", "How did Blues play?") is True
    assert ask.looks_like_followup("Why did they lose it?", "How did Blues play?") is True


def test_the_rules_keep_the_team_the_earlier_question_was_about():
    assert ask.focus_team("and in the second half?", "How did Blues play?", EVENTS) == "Blues"
    assert ask.focus_team("and in the second half?", "How did Reds play?", EVENTS) == "Reds"
    assert ask.focus_team("How did Reds play?", "How did Blues play?", EVENTS) is None
    assert ask.focus_team("and in the second half?", None, EVENTS) is None


def test_a_follow_up_carries_the_team_over_without_the_model():
    fake = FakeModel("unused")
    out = run(fake, "and in the second half?", mode="rules", previous="How did Blues play?")
    assert out["follow_up"] is True
    assert out["answerable"], "the follow-up must still reach an analysis"
    assert "second_half_change" in [step["name"] for step in out["analyses"]]
    assert all(step.get("team") == "Blues" for step in out["analyses"] if step["name"] == "second_half_change")
    assert fake.calls == []                        # the rules mode never calls the model


def test_the_model_resolves_the_reference_and_the_router_uses_it():
    resolved = json.dumps({"question": "How did Blues play in the second half?"})
    router = json.dumps({"answerable": True, "analyses": [{"name": "second_half_change", "team": "Blues"}]})
    fake = FakeModel(router, resolved)
    out = run(fake, "and in the second half?", previous="How did Blues play?")
    assert out["follow_up"] is True
    assert out["resolved"] == "How did Blues play in the second half?"
    assert "ask follow-up" in fake.calls
    assert out["analyses"] == [{"name": "second_half_change", "team": "Blues"}]


def test_a_broken_resolution_keeps_the_question_as_it_stands():
    router = json.dumps({"answerable": True, "analyses": [{"name": "second_half_change", "team": "Blues"}]})
    fake = FakeModel(router, RuntimeError("down"))
    out = run(fake, "and in the second half?", previous="How did Blues play?")
    assert out["resolved"] == "and in the second half?"
    assert out["answerable"]


def test_the_answer_still_cites_real_events():
    out = run(FakeModel("unused"), "and in the second half?", mode="rules", previous="How did Blues play?")
    assert set(out["evidence"]) <= {e.id for e in EVENTS}
    assert out["answer"].rstrip().endswith("]")
