"""shot_pressure detector, stream duplicate rule, and the /health model status."""
import os
from unittest.mock import patch

os.environ["DB_PATH"] = ":memory:"

from app import db, main, narrator  # noqa: E402
from app.detectors import detect_all, detect_shot_pressure  # noqa: E402
from app.events import MatchEvent, load_events  # noqa: E402
from app.narrator import model_status, narrate_all, template_narration  # noqa: E402


def ev(id, minute, team, type, x=85):
    return MatchEvent(id=id, minute=minute, team=team, type=type, x=x, y=50)


SPELL = [ev("s1", 60.0, "Blues", "shot"), ev("s2", 61.5, "Blues", "shot"), ev("s3", 63.9, "Blues", "goal")]


def fresh():
    db._connection = None
    db.init_db()
    narrator._failures, narrator._pause_until = 0, 0.0
    narrator._last_error = narrator._last_error_at = None
    narrator._calls_ok = narrator._calls_failed = 0


# ---- shot_pressure -------------------------------------------------------------------------

def test_three_shots_in_five_minutes_is_pressure():
    found = detect_shot_pressure(SPELL)
    assert len(found) == 1
    assert found[0].evidence == ["s1", "s2", "s3"]
    assert found[0].facts == {"shots": 3, "goals": 1, "span_min": 4}


def test_two_shots_or_a_slow_spell_is_not():
    assert detect_shot_pressure(SPELL[:2]) == []
    slow = [ev("a", 60, "Blues", "shot"), ev("b", 63, "Blues", "shot"), ev("c", 66, "Blues", "shot")]
    assert detect_shot_pressure(slow) == []


def test_each_team_is_counted_separately():
    mixed = [ev("a", 60, "Reds", "shot"), ev("b", 61, "Blues", "shot"), ev("c", 61.5, "Reds", "shot"),
             ev("d", 62, "Blues", "shot"), ev("e", 62.5, "Reds", "shot"), ev("f", 63, "Blues", "shot")]
    assert {(i.team, tuple(i.evidence)) for i in detect_shot_pressure(mixed)} == {
        ("Reds", ("a", "c", "e")), ("Blues", ("b", "d", "f"))}


def test_two_separate_spells_are_two_insights():
    events = [ev(f"p{k}", 60 + k, "Reds", "shot") for k in range(3)] + \
             [ev(f"q{k}", 80 + k, "Reds", "shot") for k in range(3)]
    assert [i.evidence for i in detect_shot_pressure(events)] == [["p0", "p1", "p2"], ["q0", "q1", "q2"]]


def test_sample_match_is_unchanged():
    assert len(detect_all(load_events("data/sample_match.json"))) == 5


def test_template_sentence_cites_evidence():
    text = template_narration(detect_shot_pressure(SPELL)[0])
    assert "3 shots in 4 minutes" in text and text.endswith("[s1, s2, s3]")


def test_model_is_only_shown_numbers_from_the_facts():
    assert {"shots", "goals", "span_min"} <= set(narrator.MODEL_FACT_KEYS)


# ---- the stream reports a growing spell once ------------------------------------------------

def stream_messages(events):
    """Run the real stream over these events and return the insight messages it sent."""
    import asyncio
    original = main.load_events
    main.load_events = lambda path: events      # stand-in for the replay file
    main.store.clear()

    async def run():
        return [c async for c in main._event_source(0, 0) if c.startswith("data:")]

    try:
        return asyncio.run(run())
    finally:
        main.load_events = original


def test_a_spell_that_grows_is_reported_once():
    fresh()
    spell = [ev(f"g{k}", 60 + k * 0.8, "Blues", "shot") for k in range(6)]   # six shots, one by one
    sent = [m for m in stream_messages(spell) if '"shot_pressure"' in m]
    assert len(sent) == 1


# ---- /health ---------------------------------------------------------------------------------

def test_health_keeps_the_old_keys_and_adds_status():
    fresh()
    with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}), patch.object(main, "MODEL", None):
        body = main.health()
    assert {"status", "llm_configured", "languages"} <= body.keys()
    assert body["status"] == "ok" and body["llm_configured"] is False
    assert body["narration"] == "templates only"
    assert body["model_status"]["paused"] is False and body["model_status"]["last_error"] is None
    assert "NVIDIA_API_KEY" not in str(body)


def test_health_shows_a_pause_and_the_last_error():
    fresh()
    os.environ["NVIDIA_API_KEY"] = "test-key"
    original = narrator.narrate
    try:
        def boom(*a, **k):
            raise TimeoutError("read timed out after 15 s")
        narrator.narrate = boom
        narrate_all(None, "some/model", detect_shot_pressure(SPELL)[0], ["en"])
        other = [ev(f"z{k}", 70 + k, "Reds", "shot") for k in range(3)]
        narrate_all(None, "some/model", detect_shot_pressure(other)[0], ["en"])
        status = model_status()
        assert status["paused"] is True and 0 < status["paused_for_s"] <= 60
        assert status["calls_failed"] == 2 and "timed out" in status["last_error"]
        assert status["last_error_s_ago"] is not None
    finally:
        narrator.narrate = original
        os.environ.pop("NVIDIA_API_KEY", None)
        fresh()


def test_a_missing_key_is_not_counted_as_a_model_failure():
    fresh()
    with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}):
        narrate_all(None, "some/model", detect_shot_pressure(SPELL)[0], ["en"])
    status = model_status()
    assert status["calls_failed"] == 0 and status["paused"] is False and status["last_error"] is None
