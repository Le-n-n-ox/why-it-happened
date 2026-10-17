"""Players: names on insights, stats, an auditable rating, a grounded "why", and reviews."""
import os
import re
from unittest.mock import patch

os.environ["DB_PATH"] = ":memory:"

import pytest  # noqa: E402

from app import db, main, narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402
from app.narrator import FEW_SHOT_BY_LANGUAGE, EXAMPLE_PAYLOAD, narrate, narrate_all, template_narration  # noqa: E402
from app.players import (  # noqa: E402
    explain_action, player_actions, player_stats, player_table, rating, review_insight, slug,
)

DEMO = load_events("data/demo_match.json")
SAMPLE = load_events("data/sample_match.json")
FOUND = detect_all(DEMO)
ASHDOWN = "reds-felix-ashdown"


def fresh():
    db._connection = None
    db.init_db()
    narrator._failures, narrator._pause_until = 0, 0.0


def use_demo():
    main.EVENTS_FILE = "data/demo_match.json"


# ---- names on insights --------------------------------------------------------------------

def test_every_demo_event_has_a_player():
    assert all(e.player for e in DEMO)


def test_insights_say_who_did_it():
    first = FOUND[0]
    assert first.kind == "counter_attack"
    assert first.facts["starter"] == "Idris Calloway" and first.facts["finisher"] == "Amari Quill"
    text = template_narration(first)
    assert "Idris Calloway wins the ball for Reds and Amari Quill shoots" in text
    pressure = next(i for i in FOUND if i.kind == "shot_pressure" and i.team == "Reds")
    assert pressure.facts["players"] == ["Amari Quill", "Felix Ashdown", "Dario Keane"]
    assert "from Amari Quill, Felix Ashdown and Dario Keane" in template_narration(pressure)


def test_match_data_without_names_behaves_exactly_as_before():
    found = detect_all(SAMPLE)
    assert len(found) == 4
    assert all("starter" not in i.facts and "players" not in i.facts for i in found)
    assert template_narration(found[0]).startswith("10' Reds win the ball and reach a shot in 12 seconds")
    assert player_table(SAMPLE) == []


# ---- stats and rating ---------------------------------------------------------------------

def test_stats_add_up_to_the_match():
    stats = player_stats(DEMO, FOUND)
    assert sum(s["touches"] for s in stats.values()) == len(DEMO)
    assert sum(s["goals"] for s in stats.values()) == 3
    ashdown = stats[ASHDOWN]
    assert (ashdown["goals"], ashdown["shots"], ashdown["key_moments"]) == (2, 3, 2)


def test_the_rating_shows_its_working_and_stays_in_range():
    table = player_table(DEMO, FOUND)
    assert table[0]["id"] == ASHDOWN                                  # two goals: player of the match
    for row in table:
        assert 4.0 <= row["rating"] <= 10.0
    r = rating(player_stats(DEMO, FOUND)[ASHDOWN])
    assert r["breakdown"][0] == {"reason": "Starting point", "points": 6.0}
    assert round(sum(line["points"] for line in r["breakdown"]), 1) == r["value"]


# ---- the "why" ----------------------------------------------------------------------------

INTENT_WORDS = re.compile(r"\b(wanted|decided|tried|hoped|intended|aimed|realised|realized|knew|felt|because)\b", re.I)


def test_every_action_has_a_why_that_cites_real_events_and_never_claims_intent():
    ids = {e.id for e in DEMO}
    roster = {e.player for e in DEMO}
    for e in DEMO:
        w = explain_action(DEMO, e.id, FOUND)
        assert w["why"] and e.id in w["evidence"] and set(w["evidence"]) <= ids
        assert not INTENT_WORDS.search(w["why"]), w["why"]
        named = set(re.findall(r"[A-Z][a-z]+ [A-Z][a-z]+", w["why"])) - {"This was", "The move"}
        assert named <= roster | {"The keeper"}, (named - roster, w["why"])


def test_a_why_links_the_action_to_its_key_moment():
    w = explain_action(DEMO, FOUND[0].evidence[0], FOUND)
    assert w["insight_id"] == FOUND[0].id
    assert "This was part of the 9' counter attack." in w["why"]
    assert "The move ended in a shot for Amari Quill 12 seconds later." in w["why"]


def test_unknown_event_is_none():
    assert explain_action(DEMO, "nope", FOUND) is None


def test_a_players_actions_are_all_theirs():
    actions = player_actions(DEMO, ASHDOWN, FOUND)
    assert len(actions) == 4 and {a["player"] for a in actions} == {"Felix Ashdown"}


# ---- reviews ------------------------------------------------------------------------------

def test_review_facts_cite_real_events():
    review = review_insight(DEMO, ASHDOWN, FOUND)
    assert review.kind == "player_review" and 1 <= len(review.evidence) <= 6
    assert set(review.evidence) <= {e.id for e in DEMO}
    assert review.facts["goal_minutes"] == [34, 64] and int(review.minute) == 34
    text = template_narration(review)
    assert text.startswith("Felix Ashdown (Reds) had 4 touches and scored 2 goals (34' and 64').")
    assert text.endswith(f"[{', '.join(review.evidence)}]")


def test_review_uses_its_own_prompt_and_no_counter_attack_example():
    sent = {}
    review = review_insight(DEMO, ASHDOWN, FOUND)
    with patch.object(narrator, "_chat", side_effect=lambda model, messages, label, **kw: sent.update(m=messages) or "x"):
        narrate(None, "m", review, "English")
    assert [m["role"] for m in sent["m"]] == ["system", "user"]
    assert "player review" in sent["m"][0]["content"] and "Felix Ashdown" in sent["m"][1]["content"]


def run_review(model_text, lang="en"):
    fresh()
    os.environ["NVIDIA_API_KEY"] = "test-key"
    try:
        review = review_insight(DEMO, ASHDOWN, FOUND)
        with patch.object(narrator, "_chat", return_value=model_text), patch("time.sleep"):
            return narrate_all(None, "m", review, [lang])
    finally:
        os.environ.pop("NVIDIA_API_KEY", None)
        fresh()


def test_a_grounded_model_review_is_used():
    out = run_review("Felix Ashdown scored twice, in the 34th and 64th minutes. [d73, d134]")
    assert out["en"].startswith("Felix Ashdown scored twice")


def test_a_review_with_an_invented_number_falls_back_to_the_template():
    out = run_review("Felix Ashdown scored 5 goals and was brilliant. [d73]")
    assert out["en"].startswith("Felix Ashdown (Reds) had 4 touches")


def test_a_review_citing_an_unknown_event_falls_back_to_the_template():
    out = run_review("Felix Ashdown scored twice. [d999]")
    assert out["en"].startswith("Felix Ashdown (Reds) had 4 touches")


# ---- the example the model is shown must not use real players -----------------------------

def test_few_shot_names_are_not_in_any_roster():
    roster = {e.player for e in DEMO}
    names = set(EXAMPLE_PAYLOAD["facts"]["players"])
    assert not names & {n.split()[-1] for n in roster} and not names & roster
    for text in FEW_SHOT_BY_LANGUAGE.values():
        assert "Okoro" in text and "Varga" in text


# ---- the endpoints ------------------------------------------------------------------------

def test_endpoints_on_the_demo_match():
    fresh()
    original = main.EVENTS_FILE
    use_demo()
    try:
        table = main.players()
        assert len(table) == 21 and table[0]["id"] == ASHDOWN
        detail = main.player_detail(ASHDOWN)
        assert detail["rating"] == table[0]["rating"] and len(detail["actions"]) == 4
        assert detail["moments"][0]["kind"] == "goal_buildup" and detail["rating_breakdown"]
        review = main.player_review(ASHDOWN, "sw")                # no model here: English, and it says so
        assert review["lang"] == "en" and review["text"].startswith("Felix Ashdown (Reds)")
        assert review["rating"] == detail["rating"] and review["evidence"]
        assert main.event_why("d17")["insight_id"] == "counter_attack-d17"
        for call, arg in ((main.player_detail, "nobody"), (main.event_why, "nope")):
            with pytest.raises(Exception) as err:
                call(arg)
            assert err.value.status_code == 404
        assert all(row["kind"] != "player_review" for row in db.get_insights(limit=50))   # reviews stay out of history
    finally:
        main.EVENTS_FILE = original


def test_endpoints_on_match_data_without_names():
    original = main.EVENTS_FILE
    main.EVENTS_FILE = "data/sample_match.json"
    try:
        assert main.players() == []
        with pytest.raises(Exception) as err:
            main.player_detail("reds-anyone")
        assert err.value.status_code == 404
    finally:
        main.EVENTS_FILE = original