import re

from app.causes import explain_event, foul_context, foul_explanations, pass_context
from app.detectors import detect_all
from app.events import EventType, MatchEvent, load_events

T = EventType
DEMO = load_events("data/demo_match.json")
FOUND = detect_all(DEMO)


def ev(i, minute, team, kind, x, player):
    return MatchEvent(id=f"f{i}", minute=minute, team=team, player=player, type=kind, x=x, y=50)


def test_a_foul_after_losing_the_ball_trailing_and_punished_is_explained_from_the_events():
    events = [
        ev(0, 1.0, "Blues", T.GOAL, 90, "Winter"),
        ev(1, 5.00, "Reds", T.PASS, 20, "Quill"),
        ev(2, 5.05, "Blues", T.INTERCEPTION, 60, "Dray"),
        ev(3, 5.10, "Reds", T.FOUL, 22, "Banks"),
        ev(4, 5.20, "Blues", T.SHOT, 85, "Winter"),
    ]
    ctx = foul_context(events, 3)
    assert ctx["factors"] == ["lost_ball_just_before", "trailing"]
    assert "Reds had just lost the ball" in ctx["why"] and "Reds were 0-1 down" in ctx["why"]
    assert "Blues had a shot" in ctx["why"] and ctx["led_to_shot"]
    assert set(ctx["evidence"]) <= {e.id for e in events} and "f3" in ctx["evidence"] and "f4" in ctx["evidence"]


def test_a_foul_with_no_trigger_says_so_instead_of_inventing_one():
    events = [ev(0, 5.0, "Reds", T.FOUL, 50, "Banks"), ev(1, 9.0, "Blues", T.PASS, 50, "Dray")]
    why = foul_context(events, 0)["why"]
    assert "no earlier trigger in the data" in why and "No shot followed" in why


def test_repeat_fouls_are_counted():
    events = [ev(0, 5.0, "Reds", T.FOUL, 20, "Banks"), ev(1, 9.0, "Reds", T.FOUL, 20, "Banks")]
    assert "second foul of the match" in foul_context(events, 1)["why"]


def test_a_pass_that_sets_up_a_goal_names_the_receiver_and_the_result():
    events = [
        ev(0, 10.00, "Reds", T.PASS, 40, "Quill"),
        ev(1, 10.05, "Reds", T.PASS, 70, "Vaughn"),
        ev(2, 10.10, "Reds", T.GOAL, 90, "Ashdown"),
    ]
    ctx = pass_context(events, 0)
    assert ctx["significant"] and ctx["led_to"] == "goal"
    assert "Vaughn" in ctx["why"] and "into the final third" in ctx["why"]
    assert "Ashdown's goal" in ctx["why"] and set(ctx["evidence"]) == {"f0", "f1", "f2"}


def test_an_intercepted_pass_says_who_cut_it_out_and_what_followed():
    events = [
        ev(0, 10.00, "Reds", T.PASS, 30, "Quill"),
        ev(1, 10.05, "Blues", T.INTERCEPTION, 70, "Dray"),
        ev(2, 10.10, "Blues", T.SHOT, 85, "Winter"),
    ]
    ctx = pass_context(events, 0)
    assert ctx["lost"] and ctx["significant"]
    assert "intercepted by Dray" in ctx["why"] and "Blues shot" in ctx["why"]


def test_a_sideways_pass_is_routine_and_says_what_it_did():
    events = [ev(0, 10.0, "Reds", T.PASS, 40, "Quill"), ev(1, 10.05, "Reds", T.PASS, 42, "Vaughn")]
    result = explain_event(events, "f0", [])
    assert result["routine"] is True and "keeping possession" in result["why"]


def test_a_foul_is_never_routine_and_a_chain_pass_keeps_its_detail():
    foul = DEMO and next(e for e in DEMO if e.type == T.FOUL)
    assert explain_event(DEMO, foul.id, FOUND)["routine"] is False
    insight = next(i for i in FOUND if i.kind == "counter_attack")
    middle = next(i for i in insight.evidence[1:-1] if next(e for e in DEMO if e.id == i).type == T.PASS)
    out = explain_event(DEMO, middle, FOUND)
    assert out["role"] == "carried on" and "detail" in out


def test_no_explanation_in_the_whole_match_claims_intent():
    banned = re.compile(r"\b(wanted|decided|tried|intended|frustrat\w*|angry|deliberately|chose|hoped)\b", re.I)
    for event in DEMO:
        out = explain_event(DEMO, event.id, FOUND)
        assert out["why"] and not banned.search(out["why"]), out["why"]
        assert set(out["evidence"]) <= {e.id for e in DEMO}


def test_the_fouls_endpoint_lists_every_foul():
    from app import main
    main.EVENTS_FILE = "data/demo_match.json"
    try:
        rows = main.fouls()
    finally:
        main.EVENTS_FILE = "data/sample_match.json"
    assert len(rows) == sum(e.type == T.FOUL for e in DEMO) == len(foul_explanations(DEMO, FOUND))
    assert all(r["role"] == "foul" for r in rows)
