"""The demo match must show every explanation type, once each, with a believable score."""
import asyncio
import os

os.environ["DB_PATH"] = ":memory:"

from app import main  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402
from app.matchinfo import match_info  # noqa: E402

DEMO = load_events("data/demo_match.json")


def test_demo_match_is_well_formed():
    assert len({e.id for e in DEMO}) == len(DEMO)                       # ids are unique
    assert [e.minute for e in DEMO] == sorted(e.minute for e in DEMO)   # in clock order
    info = match_info(DEMO)
    assert info["home"] == "Reds" and info["away"] == "Blues"
    assert info["score"] == {"Reds": 2, "Blues": 1}
    assert 88 <= info["duration_min"] <= 95


def test_demo_match_shows_every_explanation_type():
    found = detect_all(DEMO)
    assert [(i.kind, i.team, int(i.minute)) for i in found] == [
        ("counter_attack", "Reds", 9),
        ("high_press_turnover", "Blues", 23),
        ("goal_buildup", "Reds", 34),
        ("turnover_shot", "Blues", 52),
        ("shot_pressure", "Reds", 60),
        ("counter_attack", "Blues", 78),
        ("shot_pressure", "Blues", 82),
    ]
    assert {i.kind for i in found} == {"counter_attack", "turnover_shot", "high_press_turnover",
                                       "goal_buildup", "shot_pressure"}


def test_every_cited_event_exists():
    ids = {e.id for e in DEMO}
    for insight in detect_all(DEMO):
        assert insight.evidence and set(insight.evidence) <= ids


def test_the_stream_sends_each_insight_once():
    original = main.EVENTS_FILE
    main.EVENTS_FILE = "data/demo_match.json"
    main.store.clear()

    async def run():
        return [c async for c in main._event_source(0, 0)]

    try:
        chunks = asyncio.run(run())
    finally:
        main.EVENTS_FILE = original
    ticks = [c for c in chunks if c.startswith("event: tick")]
    insights = [c for c in chunks if c.startswith("data:")]
    assert len(ticks) == len(DEMO)
    assert len(insights) == 7
    assert chunks[-1].startswith("event: done")