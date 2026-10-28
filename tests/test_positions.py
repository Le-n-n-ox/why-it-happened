from app.events import EventType, MatchEvent, load_events
from app.positions import positions


def ev(i, minute, team, player, x, y, kind=EventType.PASS):
    return MatchEvent(id=i, minute=minute, team=team, player=player, type=kind, x=x, y=y)


EVENTS = [
    ev("a", 1.0, "Reds", "Ann", 30, 40),
    ev("b", 2.0, "Blues", "Bob", 60, 50, EventType.TACKLE),
    ev("c", 3.0, "Reds", "Ann", 45, 42, EventType.CARRY),
    ev("d", 3.5, "Reds", "Cal", 55, 60),
    ev("e", 6.0, "Reds", "Ann", 70, 45, EventType.SHOT),
]


def by_name(out):
    return {p["player"]: p for p in out["players"]}


def test_last_seen_place_age_and_trail():
    out = positions(EVENTS, minute=4.0)
    ann = by_name(out)["Ann"]
    assert (ann["x"], ann["y"], ann["event"]) == (45.0, 42.0, "c")
    assert ann["since"] == 1.0 and ann["fresh"] is True
    assert [t["event"] for t in ann["trail"]] == ["a"]
    assert ann["average"] == {"x": 37.5, "y": 41.0} and ann["actions"] == 2
    assert by_name(out)["Bob"]["since"] == 2.0 and by_name(out)["Bob"]["fresh"] is False


def test_nothing_from_the_future_and_unseen_players_are_absent():
    out = positions(EVENTS, minute=1.5)
    assert list(by_name(out)) == ["Ann"]
    assert out["ball"]["event"] == "a"


def test_ball_holder_is_the_last_player_only_after_a_pass_or_carry():
    assert by_name(positions(EVENTS, minute=3.5))["Cal"]["on_ball"] is True
    assert by_name(positions(EVENTS, minute=3.5))["Ann"]["on_ball"] is False
    assert by_name(positions(EVENTS, minute=6.0))["Ann"]["on_ball"] is False      # last event is a shot


def test_it_never_claims_to_be_exact():
    out = positions(EVENTS)
    assert out["exact"] is False and out["source"] == "events" and "last seen" in out["note"]
    assert out["minute"] == 6.0


def test_empty_and_the_demo_match():
    assert positions([])["players"] == [] and positions([])["ball"] is None
    demo = positions(load_events("data/demo_match.json"))
    assert len(demo["players"]) >= 10
    assert all(0 <= p["x"] <= 100 and 0 <= p["y"] <= 100 for p in demo["players"])