"""StatsBomb adapter, xT grid and the pieces the validation script relies on."""
import json

from app import xt
from app.events import EventType, MatchEvent
from app.statsbomb import from_statsbomb, load_statsbomb


def sb(index, type_, team="Arsenal", player="A", loc=(60, 40), period=1, minute=1, second=0, **extra):
    return {"id": f"u{index}", "index": index, "period": period, "minute": minute, "second": second,
            "type": {"id": 1, "name": type_}, "team": {"id": 1, "name": team},
            "player": {"id": 1, "name": player}, "location": list(loc), **extra}


RAW = [
    {"id": "x", "index": 1, "period": 1, "minute": 0, "second": 0, "type": {"name": "Starting XI"},
     "team": {"name": "Arsenal"}, "tactics": {"formation": 4231, "lineup": []}},
    sb(2, "Pass", loc=(30, 40), minute=1, **{"pass": {"end_location": [50, 40]}}),
    sb(3, "Ball Receipt*", loc=(50, 40)),
    sb(4, "Pass", loc=(50, 40), minute=1, second=5, **{"pass": {"outcome": {"name": "Incomplete"}}}),
    sb(5, "Interception", team="Chelsea", loc=(70, 40), minute=1, second=7,
       interception={"outcome": {"name": "Won"}}),
    sb(6, "Duel", team="Chelsea", loc=(60, 40), minute=1, second=8,
       duel={"type": {"name": "Tackle"}, "outcome": {"name": "Lost In Play"}}),
    sb(7, "Duel", team="Arsenal", loc=(60, 40), minute=1, second=8,
       duel={"type": {"name": "Aerial Lost"}, "outcome": {"name": "Won"}}),
    sb(8, "Shot", loc=(108, 40), minute=2, shot={"statsbomb_xg": 0.31, "outcome": {"name": "Goal"}}),
    sb(9, "Shot", loc=(100, 20), minute=3, shot={"statsbomb_xg": 0.05, "outcome": {"name": "Saved"}}),
    sb(10, "Foul Committed", team="Chelsea", loc=(40, 40), minute=4),
    sb(11, "Tactical Shift", minute=46, period=2, tactics={"formation": 433}),
    sb(12, "Pass", loc=(20, 40), period=2, minute=45),
    sb(13, "Pass", loc=(20, 40), period=5, minute=120),               # shoot-out: ignored
]


def test_adapter_keeps_our_seven_kinds_and_scales_the_pitch():
    events, ctx = load_statsbomb(RAW)
    kinds = [e.type for e in events]
    assert kinds == [EventType.PASS, EventType.PASS, EventType.INTERCEPTION, EventType.GOAL,
                     EventType.SHOT, EventType.FOUL, EventType.PASS]
    goal = events[3]
    assert round(goal.x) == 90 and round(goal.y) == 50 and goal.id == "s8"
    assert events[1].outcome == "Incomplete" and events[0].outcome == "complete"
    assert all(0 <= e.x <= 100 and 0 <= e.y <= 100 for e in events)


def test_context_has_formations_shifts_xg_and_score():
    events, ctx = load_statsbomb(RAW)
    assert ctx["formations"]["Arsenal"] == "4-2-3-1"
    assert ctx["shifts"] == [{"team": "Arsenal", "minute": 46.0, "formation": "4-3-3"}]
    assert ctx["xg"] == {"s8": 0.31, "s9": 0.05}
    assert ctx["score"] == {"Arsenal": 1, "Chelsea": 0}
    assert ctx["second_half_start"] == 46


def test_minutes_never_go_backwards_after_first_half_stoppage():
    raw = [sb(1, "Pass", minute=45, second=30, period=1), sb(2, "Pass", minute=46, period=1),
           sb(3, "Pass", minute=45, period=2), sb(4, "Pass", minute=47, period=2)]
    events, _ = load_statsbomb(raw)
    minutes = [e.minute for e in events]
    assert minutes == sorted(minutes)


def test_flattened_statsbombpy_shape_gives_the_same_events():
    flat = [{"index": 2, "period": 1, "minute": 1, "second": 0, "type": "Pass", "team": "Arsenal",
             "player": "A", "location": [30, 40], "pass_outcome": None},
            {"index": 3, "period": 1, "minute": 2, "second": 0, "type": "Shot", "team": "Arsenal",
             "player": "A", "location": [108, 40], "shot_outcome": "Goal", "shot_statsbomb_xg": 0.3}]
    events, ctx = load_statsbomb(flat)
    assert [e.type for e in events] == [EventType.PASS, EventType.GOAL]
    assert ctx["xg"] == {"s3": 0.3}


def test_unknown_or_locationless_events_are_ignored():
    assert from_statsbomb({"index": 1, "period": 1, "type": {"name": "Pass"}, "team": {"name": "A"}}) is None
    assert from_statsbomb(sb(1, "Pressure")) is None


# ---- xT ----------------------------------------------------------------------------------

def _attack_matches():
    """Attacks often die early, so the ball is worth more the closer it gets to goal."""
    def ev(i, t, x, y=50, team="R"):
        return MatchEvent(id=f"m{i}", minute=i * 0.1, team=team, player="P", type=EventType(t), x=x, y=y)
    events = []
    for k in range(40):
        route = [20, 50, 80] if k < 10 else [20, 50] if k < 20 else [20]
        for x in route:
            events.append(ev(len(events), "pass", x))
        if k < 10:
            events.append(ev(len(events), "shot", 92))
            events.append(ev(len(events), "goal", 92))
        events.append(ev(len(events), "pass", 30, team="B"))      # the ball is lost
    return [events]


def test_xt_grid_rises_towards_goal(tmp_path):
    grid = xt.fit_xt(_attack_matches())
    assert len(grid) == xt.W and len(grid[0]) == xt.L
    row = xt.zone(0, 50)[1]
    assert grid[row][xt.zone(92, 50)[0]] > grid[row][xt.zone(50, 50)[0]] > grid[row][xt.zone(20, 50)[0]] >= 0
    path = str(tmp_path / "grid.json")
    xt.save_grid(grid, path, "test")
    assert xt.xt_value(92, 50, path) == round(grid[row][xt.zone(92, 50)[0]], 5)


def test_missing_or_broken_grid_means_no_value(tmp_path):
    assert xt.xt_value(50, 50, str(tmp_path / "nope.json")) is None
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"l": 16, "w": 12, "grid": [[1]]}))
    assert xt.xt_value(50, 50, str(bad)) is None


def test_tactics_falls_back_to_danger_without_a_grid():
    from app.tactics import ball_value, danger
    assert ball_value(90, 50) == danger(90, 50) or xt.load_grid() is not None


# ---- validation helpers ------------------------------------------------------------------

def test_validation_helpers():
    from app.validation import brier, collapse_formation, formation_agreement, pearson, probability_check, xg_agreement
    assert collapse_formation("4-2-3-1") == "4-5-1" and collapse_formation("4-4-2") == "4-4-2"
    assert round(pearson([1, 2, 3, 4], [2, 4, 6, 8]), 3) == 1.0 and pearson([1, 1, 1], [1, 2, 3]) is None
    assert brier({"A": 100, "B": 0, "draw": 0}, "A") == 0
    events, ctx = load_statsbomb(RAW)
    agree = xg_agreement(events, ctx)
    assert agree["shots"] == 2 and agree["mean_shot_x"] > 80
    assert formation_agreement(events, ctx)[0]["match"] is None        # far too little data: never a guess
    check = probability_check([(events, ctx), (events, ctx)], minutes=(3,))
    assert set(check[3]) == {"matches", "ours", "base_rate"}