"""Tracking/video auto-eventing: frames in, measured events and speeds out."""
import os

os.environ["DB_PATH"] = ":memory:"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.tracking import TrackingBatch, TrackingFrame, TrackingPlayer, TrackingPoint, frames_to_events  # noqa: E402

client = TestClient(app)


def frame(t, ball, players, hint=None):
    return TrackingFrame(
        timestamp_s=t,
        ball=TrackingPoint(x=ball[0], y=ball[1]),
        players=[TrackingPlayer(id=pid, name=name, team=team, x=x, y=y, speed_kph=speed)
                 for pid, name, team, x, y, speed in players],
        event_hint=hint,
    )


def test_a_hinted_pass_gets_distance_and_speed():
    batch = TrackingBatch(
        home="Reds", away="Blues",
        frames=[
            frame(1.0, (50, 50), [("p1", "Pryce", "Reds", 50, 50, 18),
                                  ("p2", "Quill", "Reds", 62, 50, 20),
                                  ("d1", "Winter", "Blues", 55, 55, 21)], hint="pass"),
            frame(1.4, (62, 50), [("p1", "Pryce", "Reds", 52, 50, 19),
                                  ("p2", "Quill", "Reds", 62, 50, 20),
                                  ("d1", "Winter", "Blues", 58, 54, 22)]),
        ],
    )
    events, summary = frames_to_events(batch)
    assert summary["source"] == "tracking" and summary["frames"] == 2
    assert events and events[0].type.value == "pass"
    assert events[0].pass_distance_m and events[0].pass_distance_m > 10
    assert events[0].ball_speed_kph and events[0].ball_speed_kph > 0
    assert events[0].pass_accuracy == 1.0
    assert events[0].metadata["auto_event"] is True


def test_a_sprint_near_the_ball_emits_a_pressure_event():
    batch = TrackingBatch(
        home="Reds", away="Blues",
        frames=[
            frame(1.0, (50, 50), [("d1", "Winter", "Blues", 50, 52, 26)]),
            frame(1.4, (50.2, 50.1), [("d1", "Winter", "Blues", 50, 51, 31)]),
        ],
    )
    events, _ = frames_to_events(batch)
    pressure = [event for event in events if event.type.value == "pressure"]
    assert pressure
    assert pressure[0].player_speed_kph == 31
    assert pressure[0].pressure == 1.0
    assert pressure[0].distance_m and pressure[0].distance_m > 0


def test_tracking_endpoint_returns_events_without_ingesting_by_default():
    batch = TrackingBatch(
        home="Reds", away="Blues",
        frames=[
            frame(1.0, (50, 50), [("p1", "Pryce", "Reds", 50, 50, 18)], hint="carry"),
            frame(1.5, (60, 50), [("p1", "Pryce", "Reds", 60, 50, 24)]),
        ],
    )
    before = len(client.get("/events").json())
    response = client.post("/tracking", json=batch.model_dump())
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["events"] >= 1
    assert body["events"][0]["type"] in {"carry", "pass", "shot"}
    assert len(client.get("/events").json()) == before     # ingest is opt-in
