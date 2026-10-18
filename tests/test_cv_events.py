import random

from cv.events_from_tracks import Config, convert

LENGTH, WIDTH, FPS = 105.0, 68.0, 25


def lerp(points, t):
    """points: [(t, x, y)] sorted by t -> position at t (held at the ends)."""
    if t <= points[0][0]:
        return points[0][1:]
    for (t0, x0, y0), (t1, x1, y1) in zip(points, points[1:]):
        if t0 <= t <= t1:
            w = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return x0 + (x1 - x0) * w, y0 + (y1 - y0) * w
    return points[-1][1:]


def scene(players, ball, seconds, noise=0.0, drop=0.0, seed=1, attack_right=None):
    """players: {id: (team, [(t, x, y)])}; ball: [(t, x, y)] -> tracks dict like a video tracker gives."""
    rng = random.Random(seed)
    frames = []
    for k in range(int(seconds * FPS)):
        t = k / FPS
        bx, by = lerp(ball, t)
        frame = {"t": t, "players": [], "ball": None}
        for pid, (team, path) in players.items():
            x, y = lerp(path, t)
            frame["players"].append({"id": pid, "team": team, "x": x + rng.gauss(0, noise), "y": y + rng.gauss(0, noise)})
        if rng.random() >= drop:
            frame["ball"] = {"x": bx + rng.gauss(0, noise), "y": by + rng.gauss(0, noise)}
        frames.append(frame)
    return {"fps": FPS, "pitch": {"length": LENGTH, "width": WIDTH},
            "attack_right": attack_right or {"Reds": True, "Blues": False}, "frames": frames}


def still(team, x, y):
    return (team, [(0, x, y)])


def kinds(events):
    return [(e.type.value, e.team, e.player) for e in events]


def test_a_pass_is_credited_to_the_passer():
    data = scene({"1": still("Reds", 30, 34), "2": still("Reds", 50, 34)},
                 [(0, 30, 34), (1.0, 30, 34), (2.0, 50, 34), (3.2, 50, 34)], 3.5)
    assert kinds(convert(data)) == [("pass", "Reds", "Reds #1")]


def test_a_ball_won_in_open_play_is_an_interception_by_the_winner():
    data = scene({"1": still("Reds", 30, 34), "3": still("Blues", 60, 34)},
                 [(0, 30, 34), (1.0, 30, 34), (2.0, 60, 34), (3.2, 60, 34)], 3.5)
    assert kinds(convert(data)) == [("interception", "Blues", "Blues #3")]


def test_a_close_challenge_is_a_tackle():
    players = {"1": ("Reds", [(0, 30, 34), (1.0, 30, 34)]), "3": ("Blues", [(0, 33.5, 34), (1.0, 31.5, 34), (1.6, 31.5, 34)])}
    ball = [(0, 30.3, 34), (1.0, 30.3, 34), (1.1, 31.5, 34), (2.2, 31.5, 34)]
    data = scene(players, ball, 2.4)
    assert [k[0] for k in kinds(convert(data))] == ["tackle"]
    assert kinds(convert(data))[0][1] == "Blues"


def test_a_fast_ball_at_goal_is_a_shot_and_a_goal_when_it_crosses_the_line():
    holder = {"9": still("Reds", 85, 34)}
    goal = scene(holder, [(0, 85, 34), (1.0, 85, 34), (1.1, 87.5, 34), (1.8, 105.5, 34)], 3.0)
    wide = scene(holder, [(0, 85, 34), (1.0, 85, 34), (1.1, 87.5, 35.0), (1.8, 105.5, 42.0)], 3.0)
    assert [k[0] for k in kinds(convert(goal))] == ["goal"]
    assert [k[0] for k in kinds(convert(wide))] == ["shot"]


def test_a_slow_ball_in_the_box_is_not_a_shot():
    data = scene({"9": still("Reds", 90, 34), "8": still("Reds", 95, 34)},
                 [(0, 90, 34), (1.0, 90, 34), (2.0, 95, 34), (3.2, 95, 34)], 3.5)
    assert [k[0] for k in kinds(convert(data))] == ["pass"]


def test_jitter_and_missing_ball_frames_do_not_create_phantom_events():
    for seed in range(5):
        data = scene({"1": still("Reds", 30, 34), "2": still("Reds", 50, 34)},
                     [(0, 30, 34), (1.0, 30, 34), (2.0, 50, 34), (3.2, 50, 34)], 3.5, noise=0.4, drop=0.25, seed=seed)
        assert kinds(convert(data)) == [("pass", "Reds", "Reds #1")], seed


def test_a_ball_nobody_is_near_gives_no_events():
    data = scene({"1": still("Reds", 10, 10), "2": still("Blues", 90, 60)}, [(0, 50, 34), (4, 55, 30)], 4.0)
    assert convert(data) == []


def test_positions_become_each_teams_own_goal_line_coordinates():
    # Blues attack left, so a Blues touch at pitch x=90 is deep in their own third.
    data = scene({"1": still("Reds", 60, 34), "3": still("Blues", 90, 34)},
                 [(0, 60, 34), (1.0, 60, 34), (2.0, 90, 34), (3.2, 90, 34)], 3.5)
    event = convert(data)[0]
    assert event.team == "Blues" and event.x == round((LENGTH - 90) / LENGTH * 100, 1) and event.y == 50.0
    flipped = scene({"1": still("Reds", 60, 34), "3": still("Blues", 90, 34)},
                    [(0, 60, 34), (1.0, 60, 34), (2.0, 90, 34), (3.2, 90, 34)], 3.5,
                    attack_right={"Reds": False, "Blues": True})
    assert convert(flipped)[0].x == round(90 / LENGTH * 100, 1)


def test_low_confidence_events_are_dropped():
    data = scene({"1": still("Reds", 30, 34), "2": still("Reds", 50, 34)},
                 [(0, 30, 34), (0.6, 30, 34), (2.4, 50, 34), (3.2, 50, 34)], 3.4)
    assert len(convert(data, Config(min_confidence=0.0))) >= 1
    assert convert(data, Config(min_confidence=0.99)) == []


def test_hand_added_events_such_as_fouls_are_merged_in_clock_order():
    data = scene({"1": still("Reds", 30, 34), "2": still("Reds", 50, 34)},
                 [(0, 30, 34), (1.0, 30, 34), (2.0, 50, 34), (3.2, 50, 34)], 3.5)
    out = convert(data, extra_events=[{"t": 0.5, "type": "foul", "team": "Blues", "player_id": "4", "x": 20, "y": 30}])
    assert [e.type.value for e in out] == ["foul", "pass"] and out[0].id == "v1" and out[0].minute < out[1].minute


def test_a_won_ball_then_a_shot_is_a_counter_attack_for_the_existing_detectors():
    from app.detectors import detect_all
    players = {"1": still("Blues", 25, 34), "3": still("Reds", 40, 34), "5": still("Reds", 60, 34),
               "9": still("Reds", 85, 34)}
    ball = [(0, 25, 34), (1.0, 25, 34), (2.0, 40, 34), (3.2, 40, 34), (4.2, 60, 34), (5.4, 60, 34),
            (6.4, 85, 34), (7.4, 85, 34), (7.5, 87.5, 35), (8.2, 105.5, 36)]
    events = convert(scene(players, ball, 9.0))
    assert [e.type.value for e in events] == ["interception", "pass", "pass", "goal"]
    assert [e.team for e in events] == ["Reds"] * 4
    found = detect_all(events)                       # the converted events drive the real detectors
    assert [i.kind for i in found] == ["counter_attack"] and found[0].facts["ended_in"] == "goal"