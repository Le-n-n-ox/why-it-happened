import asyncio
import json

from app import main
from app.events import MatchEvent, load_events

DEMO_PATH = "data/demo_match.json"


def event(i, minute, team="Reds", kind="pass", x=50.0, player="P"):
    return MatchEvent(id=f"L{i}", minute=minute, team=team, player=player, type=kind, x=x, y=50.0)


def clean():
    main.live_match_events.clear()
    main._live_ids.clear()
    main._live_state["ended"] = False
    main.INGEST_TOKEN = None


async def collect(source, **kw):
    ticks, insights, done = 0, [], False
    async for chunk in main._event_source(0, None, source):
        if chunk.startswith("event: tick"):
            ticks += 1
        elif chunk.startswith("event: done"):
            done = True
        elif chunk.startswith("data:"):
            insights.append(json.loads(chunk[5:]))
    return ticks, insights, done


def test_live_ingest_gives_the_same_insights_as_replaying_the_file():
    clean()
    try:
        main.EVENTS_FILE = DEMO_PATH
        replay_ticks, replay_insights, _ = asyncio.run(collect("file"))
        for e in load_events(DEMO_PATH):
            main.ingest_event(e)
        main.live_end()
        live_ticks, live_insights, done = asyncio.run(collect("live"))
    finally:
        main.EVENTS_FILE = "data/sample_match.json"
        clean()
    assert done and live_ticks == replay_ticks == 182
    assert [(i["kind"], i["team"], i["evidence"]) for i in live_insights] == \
           [(i["kind"], i["team"], i["evidence"]) for i in replay_insights]
    assert all(i["chain"] for i in live_insights if len(i["evidence"]) > 1)


def test_the_live_stream_waits_for_events_and_ends_on_live_end():
    async def run():
        task = asyncio.create_task(collect("live"))
        await asyncio.sleep(0.15)                      # nothing yet: the stream must be waiting
        assert not task.done()
        for i in range(3):
            main.ingest_event(event(i, 1.0 + i))
            await asyncio.sleep(0.05)
        main.live_end()
        return await asyncio.wait_for(task, timeout=3)
    clean()
    try:
        ticks, _, done = asyncio.run(run())
    finally:
        clean()
    assert ticks == 3 and done


def test_repeats_are_ignored_and_out_of_order_events_are_refused():
    clean()
    try:
        assert main.ingest_event(event(1, 5.0))["status"] == "success"
        assert main.ingest_event(event(1, 5.0))["status"] == "duplicate"
        assert main.live_status()["events"] == 1
        try:
            main.ingest_event(event(2, 4.0))
            assert False
        except main.HTTPException as exc:
            assert exc.status_code == 409
        assert main.live_status()["events"] == 1
    finally:
        clean()


def test_a_token_is_required_when_one_is_configured():
    clean()
    try:
        main.INGEST_TOKEN = "secret"
        for call in (lambda t: main.ingest_event(event(1, 1.0), t), lambda t: main.live_end(t),
                     lambda t: main.live_reset(t)):
            try:
                call(None)
                assert False
            except main.HTTPException as exc:
                assert exc.status_code == 401
        assert main.ingest_event(event(1, 1.0), "secret")["status"] == "success"
    finally:
        clean()


def test_the_other_endpoints_show_the_live_match_until_it_is_reset():
    clean()
    try:
        before = main.match()["events"]
        main.ingest_event(event(1, 1.0, "Reds", "goal", 90, "Quill"))
        assert main.match()["events"] == 1 and main.match()["score"]["Reds"] == 1
        assert [e["id"] for e in main.events()] == ["L1"]
        main.live_reset()
        assert main.match()["events"] == before
    finally:
        clean()


def test_an_official_feed_event_is_converted_to_our_pitch():
    clean()
    try:
        main.ingest_official({"id": "o1", "minute": 1.0, "team": "Reds", "player": "A", "type": "Pass",
                              "x": 60, "y": 40, "period": 1})
        stored = main.live_match_events[0]
        assert (stored.x, stored.y, stored.type.value) == (50.0, 50.0, "pass")
        try:
            main.ingest_official({"id": "o2", "team": "Reds"})
            assert False
        except main.HTTPException as exc:
            assert exc.status_code == 422
    finally:
        clean()