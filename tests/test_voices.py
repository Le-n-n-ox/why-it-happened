"""Audience voices: the same facts, written three ways, with the same guards."""
import json
import os

from app import narrator
from app import voices as vo
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
    old_chat, old_key = vo._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    fake = FakeModel(reply)
    vo._chat = fake
    try:
        return vo.voices(EVENTS, FOUND, model="m", **kw), fake
    finally:
        vo._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def test_all_three_voices_get_the_same_facts_and_evidence():
    out, _ = run("not json", lang="en")
    assert [v["voice"] for v in out["voices"]] == ["fan", "announcer", "analyst"]
    evidence = {tuple(v["evidence"]) for v in out["voices"]}
    assert len(evidence) == 1                       # the same events behind every voice
    for voice in out["voices"]:
        assert voice["text"] and voice["label"]


def test_without_a_working_model_the_facts_are_joined_for_every_voice():
    out, fake = run(RuntimeError("down"), lang="en")
    assert fake.calls == 3                            # one call per voice, all of them failing
    texts = {v["text"] for v in out["voices"]}
    assert len(texts) == 1                            # one plain join, not three inventions


def test_a_voice_that_invents_a_number_is_replaced_by_the_plain_join():
    out, fake = run("Reds won 417 goals. [e1]", lang="en")
    assert fake.calls == 3
    assert all("417" not in v["text"] for v in out["voices"])


def test_a_voice_that_cites_an_unknown_id_is_replaced():
    out, fake = run("A match. [e999]", lang="en")
    assert fake.calls == 3
    assert all("e999" not in v["text"] for v in out["voices"])


def test_the_story_is_the_same_for_every_voice():
    lines, evidence = vo._story(EVENTS, FOUND)
    assert lines and evidence
    assert set(evidence) <= {e.id for e in EVENTS}
    assert any("final score" in line for line in lines)
