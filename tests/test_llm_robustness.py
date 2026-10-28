"""How the app talks to the model: languages at the same time, small retries, one reused connection."""
import os
import threading
import time
from unittest.mock import patch

import requests

os.environ["DB_PATH"] = ":memory:"

from app import db, narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402
from app.narrator import narrate_all, template_narration  # noqa: E402

INSIGHT = detect_all(load_events("data/sample_match.json"))[0]
GOOD_TEXT = template_narration(INSIGHT)          # cites the evidence and uses only the facts


def fresh():
    db._connection = None
    db.init_db()
    narrator._failures, narrator._pause_until = 0, 0.0
    narrator._last_error = narrator._last_error_at = None
    narrator._calls_ok = narrator._calls_failed = 0


def wait(seconds):
    threading.Event().wait(seconds)             # a pause that patching time.sleep cannot remove


class Fake:
    def __init__(self, status=200, headers=None, text=""):
        self.status_code, self.headers, self.text = status, headers or {}, text

    def json(self):
        return {"choices": [{"message": {"content": "OK"}}]}


def run_all(fake_narrate, languages):
    fresh()
    os.environ["NVIDIA_API_KEY"] = "test-key"
    try:
        with patch.object(narrator, "narrate", fake_narrate), patch.object(narrator.time, "sleep"):
            started = time.time()
            out = narrate_all(None, "some/model", INSIGHT, languages)
            return out, time.time() - started
    finally:
        os.environ.pop("NVIDIA_API_KEY", None)


# ---- languages at the same time -----------------------------------------------------------

def test_four_languages_cost_one_round_trip_not_four():
    def slow(client, model, insight, language):
        wait(0.4)
        return GOOD_TEXT
    out, seconds = run_all(slow, ["en", "es", "fr", "sw"])
    assert list(out) == ["en", "es", "fr", "sw"]            # the order that was asked for
    assert seconds < 1.0                                   # four in a row would take 1.6 s


def test_one_failing_language_is_left_out_and_the_rest_survive():
    def fake(client, model, insight, language):
        if language == "Swahili":
            raise TimeoutError("read timed out")
        return GOOD_TEXT
    out, _ = run_all(fake, ["en", "sw", "fr"])
    assert list(out) == ["en", "fr"]


def test_a_dead_model_costs_one_round_trip_and_pauses_it():
    def dead(client, model, insight, language):
        wait(0.3)
        raise TimeoutError("read timed out after 15 s")
    out, seconds = run_all(dead, ["en", "es", "fr", "sw"])
    assert out == {"en": GOOD_TEXT}                        # English falls back to the template
    assert seconds < 0.9                                   # not 4 x 15 s
    assert narrator._calls_failed == 4                     # the breaker counted every thread exactly once
    assert narrator.model_status()["paused"] is True


# ---- retries and the shared connection ----------------------------------------------------

def post(responses):
    seen = []

    def fake_post(url, headers=None, json=None, timeout=None):
        seen.append(dict(json))                            # the body is edited between tries: keep a copy
        reply = responses[len(seen) - 1]
        if isinstance(reply, Exception):
            raise reply
        return reply
    return seen, fake_post


def test_a_rate_limit_is_retried_once():
    seen, fake_post = post([Fake(429, {"Retry-After": "0"}), Fake(200)])
    with patch.object(narrator._session, "post", fake_post), patch.object(narrator.time, "sleep"):
        response = narrator._post("u", {}, {"model": "m"}, 5)
    assert response.status_code == 200 and len(seen) == 2


def test_a_model_that_rejects_reasoning_effort_is_retried_without_it():
    seen, fake_post = post([Fake(400, text='{"error": "unknown field reasoning_effort"}'), Fake(200)])
    with patch.object(narrator._session, "post", fake_post):
        response = narrator._post("u", {}, {"model": "m", "reasoning_effort": "low"}, 5)
    assert response.status_code == 200
    assert "reasoning_effort" in seen[0] and "reasoning_effort" not in seen[1]


def test_a_read_timeout_is_not_retried():
    seen, fake_post = post([requests.exceptions.ReadTimeout("slow")])
    with patch.object(narrator._session, "post", fake_post):
        try:
            narrator._post("u", {}, {"model": "m"}, 5)
            raise AssertionError("should have raised")
        except requests.exceptions.ReadTimeout:
            pass
    assert len(seen) == 1


def test_a_caption_asks_for_a_short_answer_over_the_shared_connection():
    seen, fake_post = post([Fake(200)])
    with patch.object(narrator._session, "post", fake_post), patch.dict(os.environ, {"NVIDIA_API_KEY": "x"}):
        narrator.narrate(None, "some/model", INSIGHT, "English")
    assert seen[0]["max_tokens"] == 300


def test_a_database_error_does_not_lose_the_caption():
    """A locked or full database must not take down the stream: the text still comes back."""
    fresh()
    os.environ["NVIDIA_API_KEY"] = "test-key"
    try:
        with patch.object(narrator, "narrate", return_value=GOOD_TEXT), \
             patch.object(narrator, "save_insight", side_effect=RuntimeError("database is locked")):
            out = narrate_all(None, "m", INSIGHT, ["en"])
    finally:
        os.environ["NVIDIA_API_KEY"] = ""
    assert out["en"] == GOOD_TEXT


def test_a_speculative_warm_up_does_not_pause_the_model():
    """A background warm-up that times out must not switch the live path to templates."""
    fresh()
    os.environ["NVIDIA_API_KEY"] = "test-key"
    try:
        with patch.object(narrator, "narrate", side_effect=TimeoutError("slow")), \
             patch.object(narrator.time, "sleep"):
            out = narrate_all(None, "m", INSIGHT, ["en"], save_history=False, record=False)
    finally:
        os.environ["NVIDIA_API_KEY"] = ""
    assert out["en"] == template_narration(INSIGHT)
    assert narrator.model_status()["paused"] is False
    assert narrator._calls_failed == 0


def test_a_long_answer_gets_more_time_than_a_short_one():
    seen = []

    def fake_post(url, headers, body, timeout):
        seen.append(timeout)
        return Fake(200)

    with patch.object(narrator, "_post", fake_post):
        narrator._chat("some/model", [], "caption", max_tokens=300)
        narrator._chat("some/model", [], "proposal", max_tokens=700)
    assert seen[1] > seen[0]