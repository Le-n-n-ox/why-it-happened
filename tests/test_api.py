"""API tests. Skipped automatically if FastAPI or httpx is not installed."""
import json

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_events():
    r = client.get("/events")
    assert r.status_code == 200
    assert len(r.json()) == 15


def test_players():
    r = client.get("/players")
    assert r.status_code == 200
    assert r.json() == []


def test_stream_emits_insights_then_done():
    with client.stream("GET", "/stream?delay=0") as r:
        body = "".join(r.iter_text())
    insight_blocks = [block for block in body.split("\n\n")
                      if block.startswith("data: ") and "event: tick" not in block]
    insights = [json.loads(block[6:]) for block in insight_blocks if block != "data: {}"]
    assert len(insights) == 5
    assert {i["kind"] for i in insights} >= {"counter_attack", "turnover_shot", "first_goal"}
    assert "event: done" in body
    assert all(i["narration"]["en"] for i in insights)
    # and they were stored
    assert len(client.get("/insights").json()) == 5
