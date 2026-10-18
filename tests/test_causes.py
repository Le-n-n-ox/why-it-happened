from app.causes import causal_chains, explain_event, turning_points, why_they_won
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/sample_match.json")
INSIGHTS = detect_all(EVENTS)


def test_every_chain_has_all_four_parts_and_real_ids():
    ids = {e.id for e in EVENTS}
    chains = causal_chains(EVENTS, INSIGHTS)
    assert chains
    for c in chains:
        assert c["trigger"] and c["development"] and c["payoff"] and c["consequence"]
        assert set(c["evidence"]) <= ids


def test_a_goal_chain_says_what_the_goal_did_to_the_score():
    goal_chain = next(c for c in causal_chains(EVENTS, INSIGHTS) if c["ended_in"] == "goal")
    assert "-" in goal_chain["consequence"]


def test_explain_event_starts_and_finishes_and_flags_routine():
    first = INSIGHTS[0]
    started = explain_event(EVENTS, first.evidence[0], INSIGHTS)
    assert started["role"] == "started" and not started["routine"]
    finished = explain_event(EVENTS, first.evidence[-1], INSIGHTS)
    assert finished["role"] == "finished"
    used = {i for ins in INSIGHTS for i in ins.evidence}
    spare = next(e for e in EVENTS if e.id not in used)
    assert explain_event(EVENTS, spare.id, INSIGHTS)["routine"] is True


def test_why_they_won_traces_each_goal_to_a_cause():
    why = why_they_won(EVENTS, INSIGHTS)
    goals = sum(1 for e in EVENTS if e.type.value == "goal")
    assert len(why["reasons"]) == goals
    assert all(r["evidence"] for r in why["reasons"])


def test_turning_points_put_goals_first():
    top = turning_points(EVENTS, INSIGHTS, top=1)[0]
    assert top["ended_in"] == "goal"


def test_main_endpoints_answer_why():
    from app.main import event_why, match_why
    body = match_why()
    assert body["turning_points"] and body["result"]["reasons"]
    first = INSIGHTS[0].evidence[0]
    assert event_why(first)["role"] == "started"


def test_the_narration_is_built_from_the_cause_and_grounded_in_it():
    import os
    from unittest.mock import patch
    from app import narrator
    from app import db
    db._connection = None                     # no cached captions from other tests
    db.init_db()
    from app.causes import attach_why
    from app.narrator import narrate_all, numbers_are_grounded, template_narration
    insight = next(i for i in INSIGHTS if i.kind == "counter_attack")
    attach_why(EVENTS, insight)
    why = insight.facts["why"]
    assert set(why) == {"cause", "how", "payoff", "why_it_mattered"}
    assert "pitch units" not in " ".join(why.values())
    text = template_narration(insight)                       # the fallback explains too
    assert why["cause"] in text and why["why_it_mattered"] in text
    assert numbers_are_grounded(text, insight)
    liar = text.replace("12", "99")
    assert not numbers_are_grounded(liar, insight) or "12" not in text
    sent = {}
    with patch.object(narrator, "_chat", side_effect=lambda m, msgs, l, **k: sent.update(m=msgs) or text):
        os.environ["NVIDIA_API_KEY"] = "k"
        try:
            narrate_all(None, "m", insight, ["en"])
        finally:
            os.environ.pop("NVIDIA_API_KEY", None)
    assert "why_it_mattered" in sent["m"][-1]["content"]


def test_a_player_who_created_a_goal_is_credited_for_it():
    from app.players import player_table
    demo = load_events("data/demo_match.json")
    rows = player_table(demo, detect_all(demo))
    assert any(r["goals_created"] > 0 for r in rows)


def test_a_model_cannot_credit_another_real_player():
    import os
    from unittest.mock import patch
    from app import db, narrator
    from app.causes import attach_why
    from app.narrator import KNOWN_PLAYERS, narrate_all, register_players
    demo = load_events("data/demo_match.json")
    found = detect_all(demo)
    register_players(e.player for e in demo)
    try:
        insight = next(i for i in found if i.kind == "counter_attack" and i.team == "Blues")
        attach_why(demo, insight)
        right = insight.facts["starter"]
        stranger = next(e.player for e in demo if e.player and e.player not in (right, insight.facts["finisher"]))
        for reply, expect_model in ((f"{right} won it and the move ended in a goal. [{insight.evidence[0]}]", True),
                                    (f"{stranger} won it and the move ended in a goal. [{insight.evidence[0]}]", False)):
            db._connection = None
            db.init_db()
            os.environ["NVIDIA_API_KEY"] = "k"
            try:
                with patch.object(narrator, "_chat", return_value=reply), patch("time.sleep"):
                    text = narrate_all(None, "m", insight, ["en"])["en"]
            finally:
                os.environ.pop("NVIDIA_API_KEY", None)
            assert text.startswith(right if expect_model else f"{int(insight.minute)}'"), text
    finally:
        KNOWN_PLAYERS.clear()


def test_the_recap_is_built_from_the_result_not_a_list_of_events():
    from app import db, main
    db._connection = None
    db.init_db()
    main.EVENTS_FILE = "data/demo_match.json"
    try:
        out = main.recap()
    finally:
        main.EVENTS_FILE = "data/sample_match.json"
    assert out["text"].startswith("Full time: Reds 2-1 Blues.")
    assert "opening goal" in out["text"] and "Biggest problem" in out["text"]
    assert "pitch units" not in out["text"] and len(out["insight_ids"]) == 3