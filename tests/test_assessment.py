import os
from unittest.mock import patch

from app import narrator
from app.assessment import ADVICE, assess_team, assessment_insight
from app.events import EventType, MatchEvent, load_events
from app.narrator import narrate_all, template_narration

T = EventType


def ev(i, minute, team, kind, x, player="P"):
    return MatchEvent(id=f"s{i}", minute=minute, team=team, player=player, type=kind, x=x, y=50)


def careless_reds():
    """Reds lose the ball in their own third three times and Blues shoot each time; Reds foul twice."""
    out, n = [], 0
    for minute in (5.0, 15.0, 25.0):
        out += [ev(n, minute, "Reds", T.PASS, 15), ev(n + 1, minute + 0.05, "Blues", T.INTERCEPTION, 60),
                ev(n + 2, minute + 0.10, "Blues", T.SHOT, 85)]
        n += 3
    out += [ev(n, 30.0, "Reds", T.FOUL, 20), ev(n + 1, 30.1, "Blues", T.SHOT, 88),
            ev(n + 2, 31.0, "Reds", T.FOUL, 25)]
    n += 3
    for k in range(20):                                  # enough play for a fair verdict
        out += [ev(n + 2 * k, 40 + k, "Reds", T.PASS, 40), ev(n + 2 * k + 1, 40.5 + k, "Blues", T.PASS, 40)]
    return sorted(out, key=lambda e: e.minute)


def test_costly_turnovers_and_fouls_are_found_with_evidence():
    events = careless_reds()
    report = assess_team(events, "Reds")
    codes = {i["code"] for i in report["issues"]}
    assert {"careless_build_up", "risky_fouls"} <= codes
    ids = {e.id for e in events}
    for issue in report["issues"]:
        assert issue["evidence"] and set(issue["evidence"]) <= ids
        assert issue["advice"] == ADVICE[issue["code"]]       # advice only ever comes from the table
    assert report["verdict"] != "playing well"


def test_the_detail_states_real_counts():
    issue = next(i for i in assess_team(careless_reds(), "Reds")["issues"] if i["code"] == "careless_build_up")
    assert "3 of 3" in issue["detail"]


def test_too_little_play_gets_no_verdict():
    report = assess_team(load_events("data/sample_match.json"), "Reds")
    assert report["verdict"] == "too little play to judge"
    story = assessment_insight(load_events("data/sample_match.json"), "Reds").facts["story"]
    assert "too little play" in story[0]


def test_unknown_team_is_none():
    assert assess_team(careless_reds(), "Greens") is None


def test_the_template_fallback_gives_verdict_and_advice():
    insight = assessment_insight(careless_reds(), "Reds")
    text = template_narration(insight)
    assert ADVICE["careless_build_up"] in text and text.endswith(f"[{', '.join(insight.evidence)}]")


def test_the_model_only_gets_the_story_and_cannot_add_numbers_or_ids():
    from app import db

    def reset():
        db._connection = None                 # a good reply is cached, so start clean each time
        db.init_db()

    reset()
    insight = assessment_insight(careless_reds(), "Reds")
    sent = {}

    def fake(model, messages, label, **kw):
        sent["m"] = messages
        return sent["reply"]

    os.environ["NVIDIA_API_KEY"] = "k"
    try:
        with patch.object(narrator, "_chat", side_effect=fake), patch("time.sleep"):
            sent["reply"] = f"Reds struggled: 3 of 3 turnovers were punished. [{insight.evidence[0]}]"
            assert narrate_all(None, "m", insight, ["en"])["en"].startswith("Reds struggled")
            assert "team assessment" in sent["m"][0]["content"] and "story" in sent["m"][-1]["content"]
            reset()
            sent["reply"] = f"Reds conceded 9 shots. [{insight.evidence[0]}]"      # invented number
            assert narrate_all(None, "m", insight, ["en"])["en"].startswith("Reds are")
            reset()
            sent["reply"] = "Reds struggled. [s9999]"                              # invented id
            assert narrate_all(None, "m", insight, ["en"])["en"].startswith("Reds are")
    finally:
        os.environ.pop("NVIDIA_API_KEY", None)


def test_the_endpoint_returns_the_report_and_404s_unknown_teams():
    from fastapi import HTTPException
    from app.main import team_assessment
    body = team_assessment("reds")
    assert body["team"] == "Reds" and body["text"] and "issues" in body and body["evidence"]
    try:
        team_assessment("Greens")
        assert False
    except HTTPException as exc:
        assert exc.status_code == 404