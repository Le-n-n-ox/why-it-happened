"""The store writes through immediately; a replay must never hold a write transaction open."""
import sqlite3

from app.db import get_existing_narration, get_insights, save_insight
from app.detectors import Insight
from app.store import OmniPitchStore


def test_an_event_is_committed_before_the_next_step(tmp_path):
    path = tmp_path / "store.db"
    store = OmniPitchStore(str(path))
    store.add_event({"id": "one", "minute": 1.0, "team": "Reds", "type": "pass"})
    # Another connection can only see the row if no write transaction is being held open. The
    # replay pauses on model calls between events, and an open transaction would lock the DB.
    other = sqlite3.connect(path)
    try:
        assert other.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 1
    finally:
        other.close()


def test_events_come_back_in_minute_order():
    store = OmniPitchStore(":memory:")
    for i in (2, 0, 1):
        store.add_event({"id": f"e{i}", "minute": float(i), "team": "Reds", "type": "pass"})
    assert [e["id"] for e in store.get_recent_events(10.0, 10.0)] == ["e0", "e1", "e2"]


def test_warm_narration_caches_without_touching_history():
    insight = Insight(kind="shot_pressure", team="Reds", minute=10.0, evidence=["warm1"])
    save_insight(insight, "warm caption", language="en", history=False)
    assert get_existing_narration(insight.id, "en") == "warm caption"
    assert all(row["id"] != insight.id for row in get_insights(limit=100))
