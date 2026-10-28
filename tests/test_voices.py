"""Audience voices: each voice gets a different side of the story, with the same guards."""
import json
import os

from app import audience
from app import narrator
from app import voices as vo
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)
narrator.register_players(event.player for event in EVENTS)


class FakeModel:
    def __init__(self, reply):
        self.reply, self.calls, self.payloads = reply, 0, {}

    def __call__(self, model, messages, label, max_tokens=0):
        self.calls += 1
        self.payloads[label] = json.loads(messages[-1]["content"])
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


def test_every_voice_is_given_a_different_brief():
    out, fake = run("A match.", lang="en")
    assert [v["voice"] for v in out["voices"]] == ["fan", "announcer", "analyst"]
    payloads = fake.payloads
    assert set(payloads) == {"voices fan", "voices announcer", "voices analyst"}
    assert "story" in payloads["voices fan"] and "factors" not in payloads["voices fan"]
    assert "factors" in payloads["voices analyst"] and "story" not in payloads["voices analyst"]
    assert "cues" in payloads["voices announcer"] and "team_stats" not in payloads["voices announcer"]
    assert len({tuple(sorted(payload)) for payload in payloads.values()}) == 3
    assert len({tuple(v["inputs"]) for v in out["voices"]}) == 3


def test_a_chosen_player_adds_a_player_voice_focused_on_them():
    profile = audience.parse_profile(mode="player", player="Rafael Winter")
    out, fake = run("A match.", profile=profile)
    assert [v["voice"] for v in out["voices"]] == ["fan", "announcer", "analyst", "player"]
    assert out["primary"] == "player"
    player_voice = next(v for v in out["voices"] if v["voice"] == "player")
    assert player_voice["brief"]["player"]["name"] == "Rafael Winter"
    assert "voices player" in fake.payloads


def test_without_a_model_each_voice_falls_back_to_its_own_brief():
    out, fake = run(RuntimeError("down"), lang="en")
    assert fake.calls == 3                            # one call per voice, all of them failing
    texts = {voice["voice"]: voice["text"] for voice in out["voices"]}
    assert len(set(texts.values())) == 3              # three sides of the story, not one join
    assert "expected goals" in texts["analyst"]
    assert "expected goals" not in texts["fan"]
    assert texts["announcer"].startswith("Reds 2-1 Blues")


def test_a_number_from_the_analysts_brief_is_kept_but_rejected_for_the_fan():
    out, _ = run("Reds created 0.94 expected goals.", lang="en")
    texts = {voice["voice"]: voice["text"] for voice in out["voices"]}
    assert "0.94" in texts["analyst"]                 # the analyst was given that number
    assert "0.94" not in texts["fan"]                 # the fan never was
    assert "0.94" not in texts["announcer"]


def test_a_voice_that_invents_a_number_is_replaced_by_its_plain_brief():
    out, fake = run("Reds won 417 goals.", lang="en")
    assert fake.calls == 3
    assert all("417" not in voice["text"] for voice in out["voices"])


def test_a_voice_that_cites_an_unknown_id_is_replaced():
    out, fake = run("A match. [e999]", lang="en")
    assert fake.calls == 3
    assert all("e999" not in voice["text"] for voice in out["voices"])


def test_a_voice_may_not_name_a_player_outside_its_brief():
    out, fake = run("Basil Foster was superb.", lang="en")
    assert fake.calls == 3
    assert all("Basil" not in voice["text"] for voice in out["voices"])
