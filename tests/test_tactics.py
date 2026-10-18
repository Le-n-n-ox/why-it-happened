"""Tactics layer: pass quality, half-time shifts, tactic verdicts, factors, win probability."""
from app.events import EventType, MatchEvent
from app.tactics import (danger, factors_summary, formation_estimate, half_shifts, match_factors,
                         pass_quality, tactic_verdicts, tactics_insight, win_probability, win_timeline)


def ev(id, minute, team, type, x, y=50, player=None):
    return MatchEvent(id=id, minute=minute, team=team, player=player, type=EventType(type), x=x, y=y)


def test_danger_is_higher_close_and_central():
    assert danger(94, 50) > danger(88, 50) > danger(75, 50) > danger(50, 50)
    assert danger(95, 5) < danger(95, 50)          # a tight angle is worth less
    assert 0 <= danger(99, 50) <= 0.95


def test_pass_into_the_box_that_leads_to_a_shot_is_excellent():
    events = [ev("a", 10.0, "Reds", "pass", 70, 50, "Pryce"),
              ev("b", 10.1, "Reds", "pass", 88, 50, "Quill"),
              ev("c", 10.15, "Reds", "shot", 90, 48, "Quill")]
    q = pass_quality(events, 0)
    codes = [r["code"] for r in q["reasons"]]
    assert q["rating"] == "excellent"
    assert {"box_entry", "danger_up", "led_to_shot"} <= set(codes)
    assert all(r["principle"] for r in q["reasons"])
    assert set(q["evidence"]) <= {"a", "b", "c"} and "c" in q["evidence"]


def test_lost_pass_in_own_third_is_poor_and_punished_when_a_shot_follows():
    events = [ev("a", 5.0, "Reds", "pass", 20, 50, "Hale"),
              ev("b", 5.05, "Blues", "tackle", 80, 50, "Dray"),
              ev("c", 5.1, "Blues", "shot", 85, 50, "Dray")]
    q = pass_quality(events, 0)
    assert q["rating"] == "poor"
    assert any("shot" in r["text"] for r in q["reasons"])
    assert q["evidence"] == ["a", "b", "c"]


def test_sideways_routine_pass_has_no_claims():
    events = [ev("a", 5.0, "Reds", "pass", 50, 50, "X"), ev("b", 5.05, "Reds", "pass", 52, 52, "Y")]
    q = pass_quality(events, 0)
    assert q["rating"] == "routine" and q["reasons"] == []


def test_non_pass_returns_none():
    assert pass_quality([ev("a", 1, "Reds", "shot", 90)], 0) is None


def _two_halves():
    """Reds sit deep and are 1-0 down in half 1, then press high and score in half 2."""
    events = []
    n = 0

    def add(minute, team, type, x, y=50):
        nonlocal n
        n += 1
        events.append(ev(f"e{n}", minute, team, type, x, y))

    for k in range(14):                       # first half: Blues dominate, Reds win the ball deep
        add(2 + k * 3, "Blues", "pass", 60)
        add(2.1 + k * 3, "Reds", "tackle" if k % 2 else "interception", 15)
    add(30, "Blues", "goal", 92)
    for k in range(14):                       # second half: Reds press high and shoot
        add(46 + k * 3, "Reds", "interception", 72)
        add(46.05 + k * 3, "Reds", "shot", 88, 48)
        add(46.1 + k * 3, "Blues", "pass", 40)
    add(89, "Reds", "goal", 92)
    return sorted(events, key=lambda e: e.minute)


def test_half_shift_detects_a_higher_press_and_says_it_worked():
    events = _two_halves()
    shifts = half_shifts(events, "Reds")
    assert shifts["available"]
    titles = [c["title"] for c in shifts["changes"]]
    assert "Winning the ball higher up" in titles
    assert shifts["effect"] == "worked"
    ids = {e.id for e in events}
    assert all(set(c["evidence"]) <= ids for c in shifts["changes"])


def test_half_shift_not_available_early():
    events = [e for e in _two_halves() if e.minute < 60]
    assert half_shifts(events, "Reds")["available"] is False


def test_high_press_verdict_counts_ball_wins_that_became_shots():
    events = _two_halves()
    verdicts = {t["code"]: t for t in tactic_verdicts(events, "Reds")}
    assert verdicts["high_press"]["verdict"] == "worked"
    assert "led to a shot" in verdicts["high_press"]["detail"]


def test_formation_refuses_to_guess_with_little_data():
    out = formation_estimate(_two_halves(), "Reds")
    assert out["available"] is False and out["reason"]


def test_factors_cite_real_events_and_summary_names_no_one_new():
    events = _two_halves()
    factors = match_factors(events)
    ids = {e.id for e in events}
    assert factors
    for f in factors:
        assert set(f["evidence"]) <= ids and f["principle"] and f["favours"] in ("Reds", "Blues")
    assert isinstance(factors_summary(factors, "Reds"), str)


def test_possessive_for_teams_ending_in_s():
    events = _two_halves()
    text = " ".join(f["detail"] for f in match_factors(events))
    assert "Reds's" not in text and "Blues's" not in text


def test_win_probability_sums_to_100_and_follows_the_score():
    events = _two_halves()
    start = win_probability(events, 0)
    assert sum(start["probabilities"].values()) == 100
    assert abs(start["probabilities"]["Reds"] - start["probabilities"]["Blues"]) <= 1
    behind = win_probability(events, 31)           # Blues lead 1-0
    assert behind["probabilities"]["Blues"] > behind["probabilities"]["Reds"]
    end = win_probability(events)
    assert end["minutes_left"] == 0 or end["minute"] < 90
    assert win_probability(events, 95)["probabilities"]["draw"] in range(0, 101)


def test_final_whistle_is_settled():
    events = _two_halves() + [ev("z", 90.5, "Reds", "pass", 50)]
    p = win_probability(events)
    assert p["minutes_left"] == 0
    assert "settled" in p["reasons"][-1]


def test_timeline_starts_at_zero_and_ends_at_the_last_event():
    events = _two_halves()
    line = win_timeline(events, 15)
    assert line[0]["minute"] == 0 and line[-1]["minute"] == round(events[-1].minute, 1)


def test_tactics_insight_evidence_is_real_and_story_is_text():
    events = _two_halves()
    insight = tactics_insight(events, "Reds")
    assert insight.kind == "tactics_report"
    assert set(insight.evidence) <= {e.id for e in events}
    assert insight.facts["story"] and all(isinstance(s, str) for s in insight.facts["story"])


# ---- endpoints and wiring -------------------------------------------------------------------

def _use_demo():
    from app import main
    old = main.EVENTS_FILE
    main.EVENTS_FILE = "data/demo_match.json"
    main.live_match_events.clear()
    return main, old


def test_predict_and_tactics_endpoints_on_the_demo_match():
    main, old = _use_demo()
    try:
        p = main.predict()
        assert sum(p["probabilities"].values()) == 100 and p["timeline"][0]["minute"] == 0
        report = main.team_tactics("reds", "en")
        assert report["text"] and report["evidence"] and "second_half" in report
        why = main.match_why("en")
        assert why["factors"] and why["summary"]
        first_pass = next(e for e in main._match_data()[0] if e.type == EventType.PASS)
        assert "quality" in main.event_why(first_pass.id)
    finally:
        main.EVENTS_FILE = old


def test_stream_emits_predictions():
    import asyncio
    import json
    main, old = _use_demo()
    try:
        async def run():
            found = []
            async for chunk in main._event_source(0, None, "file"):
                if chunk.startswith("event: prediction"):
                    found.append(json.loads(chunk.split("data: ", 1)[1]))
            return found

        preds = asyncio.run(run())
        assert len(preds) >= 8 and all(sum(p["probabilities"].values()) == 100 for p in preds)
    finally:
        main.EVENTS_FILE = old