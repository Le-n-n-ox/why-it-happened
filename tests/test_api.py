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


def test_stream_emits_insights_then_done():
    with client.stream("GET", "/stream?delay=0") as r:
        body = "".join(r.iter_text())
    data_lines = [ln[6:] for ln in body.splitlines() if ln.startswith("data: ") and ln != "data: {}"]
    insights = [json.loads(ln) for ln in data_lines]
    assert len(insights) == 3
    assert "event: done" in body
    assert all(i["narration"]["en"] for i in insights)
    # and they were stored
    assert len(client.get("/insights").json()) == 3
