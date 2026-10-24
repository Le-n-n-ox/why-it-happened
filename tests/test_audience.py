"""Audience profiles: one match, different sides of the story, all counted from the events."""
import json
import re

from app import audience
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)


def resolved(**kw):
    return audience.resolve(audience.parse_profile(**kw), EVENTS, FOUND)


def test_unknown_modes_and_metrics_fall_back_instead_of_failing():
    profile = audience.parse_profile("pundit", metric="nonsense")
    assert profile.mode == "fan"
    assert profile.metric is None


def test_favourites_are_matched_case_insensitively_and_can_be_comma_separated():
    r = resolved(club="reds, BLUES", player="ashdown")
    assert r.clubs == ["Reds", "Blues"]
    assert r.players == ["Felix Ashdown"]
    assert r.unknown == []


def test_unknown_favourites_are_reported_not_invented():
    r = resolved(club="Arsenal", player="Nobody At All")
    assert r.clubs == [] and r.players == []
    assert set(r.unknown) == {"Arsenal", "Nobody At All"}
    assert any("not in this match" in note for note in r.notes)


def test_player_mode_defaults_to_the_best_rated_player():
    r = resolved(mode="player")
    assert r.players == ["Felix Ashdown"]
    assert any("follows Felix Ashdown" in note for note in r.notes)


def test_the_fan_brief_is_the_story_without_the_analyst_numbers():
    r = resolved(club="Reds", player="Felix Ashdown")
    brief = audience.build_brief(EVENTS, FOUND, r, "fan")
    assert brief["mode"] == "fan"
    assert brief["your_club"] == "Reds"
    assert brief["mood"] == "delight"
    assert "factors" not in brief and "team_stats" not in brief and "cues" not in brief
    assert brief["player_spotlight"]["name"] == "Felix Ashdown"
    # The fan's lines carry no measured numbers: those belong to the analyst's side.
    assert not any(re.search(r"\d", line) for line in brief["story"])
    assert "expected goals" not in json.dumps(brief)


def test_the_analyst_brief_has_the_numbers_the_fan_never_sees():
    r = resolved(club="Reds", metric="xg")
    brief = audience.build_brief(EVENTS, FOUND, r, "analyst")
    assert brief["mode"] == "analyst"
    assert brief["factors"] and all("detail" in factor for factor in brief["factors"])
    assert brief["team_stats"]["Reds"]["xg"] > 0
    assert brief["metric"]["key"] == "xg"
    assert "expected goals" in json.dumps(brief)


def test_the_announcer_brief_is_a_timed_cue_sheet():
    r = resolved(club="Reds")
    brief = audience.build_brief(EVENTS, FOUND, r, "announcer")
    assert brief["mode"] == "announcer"
    assert brief["cues"], "an announcer always gets at least one cue"
    assert [cue["minute"] for cue in brief["cues"]] == sorted(cue["minute"] for cue in brief["cues"])
    assert all(cue["hold_s"] > 0 and cue["say"] for cue in brief["cues"])
    assert "Felix Ashdown" in brief["names"]
    assert brief["score_line"] == "Reds 2-1 Blues"


def test_the_player_brief_follows_the_chosen_player():
    r = resolved(mode="player", player="Rafael Winter")
    brief = audience.build_brief(EVENTS, FOUND, r, "player")
    assert brief["player"]["name"] == "Rafael Winter"
    assert brief["player"]["team"] == "Blues"
    assert brief["player"]["rating"] > 0
    assert any(moment["kind"] == "goal" for moment in brief["moments"])


def test_ranking_puts_the_favourite_club_first():
    reds = audience.rank_insights(FOUND, resolved(club="Reds"))
    blues = audience.rank_insights(FOUND, resolved(club="Blues"))
    assert reds[0].team == "Reds"
    assert blues[0].team == "Blues"


def test_player_mode_keeps_only_the_players_moments():
    ranked = audience.rank_insights(FOUND, resolved(mode="player", player="Felix Ashdown"))
    assert ranked, "Felix is part of the match"
    assert {insight.kind for insight in ranked} <= {"goal_buildup", "shot_pressure"}
    assert all("Felix Ashdown" in (insight.facts.get("players") or []) for insight in ranked)


def test_a_chosen_metric_lifts_the_moments_that_show_it():
    plain = audience.rank_insights(FOUND, resolved())
    pressing = audience.rank_insights(FOUND, resolved(metric="pressing"))
    assert plain[0].kind != pressing[0].kind
    assert pressing[0].kind in audience.METRIC_KINDS["pressing"]


def test_metric_snapshot_counts_the_one_thing_the_viewer_chose():
    r = resolved(metric="xg")
    metric = audience.metric_snapshot(EVENTS, FOUND, r)
    values = {row["team"]: row["value"] for row in metric["values"]}
    assert values["Reds"] > values["Blues"] > 0
    assert metric["label"] == "expected goals"

    share = audience.metric_snapshot(EVENTS, FOUND, resolved(metric="possession"))
    assert sum(row["value"] for row in share["values"]) == 100

    rating = audience.metric_snapshot(EVENTS, FOUND, resolved(metric="rating", player="Felix Ashdown"))
    assert rating["player"]["name"] == "Felix Ashdown"
    assert rating["player"]["value"] > 0


def test_overlay_cards_are_timed_sorted_and_machine_readable():
    payload = audience.overlay_payload(EVENTS, FOUND, resolved(club="Reds"), "en")
    cards = payload["cards"]
    assert cards, "a replay needs at least one card"
    assert [card["at"] for card in cards] == sorted(card["at"] for card in cards)
    for card in cards:
        assert card["id"] and card["kind"] and card["headline"] and card["text"]
        assert 4.0 <= card["hold_s"] <= 10.0
        assert isinstance(card["priority"], int)
        assert isinstance(card["evidence"], list)
    assert cards[-1]["kind"] == "full_time"
    assert payload["timing"]["unit"] == "match_minute"
    json.dumps(payload)  # a renderer must be able to consume it as JSON


def test_overlay_priority_follows_the_favourite_club():
    reds = audience.overlay_payload(EVENTS, FOUND, resolved(club="Reds"), "en")["cards"]
    blues = audience.overlay_payload(EVENTS, FOUND, resolved(club="Blues"), "en")["cards"]
    reds_card = next(card for card in reds if card["team"] == "Reds" and card["kind"] == "counter_attack")
    blues_card = next(card for card in blues if card["team"] == "Reds" and card["kind"] == "counter_attack")
    assert reds_card["priority"] > blues_card["priority"]


def test_the_fan_story_keeps_match_order():
    brief = audience.build_brief(EVENTS, FOUND, resolved(club="Blues"), "fan")
    minutes = [moment["minute"] for moment in brief["moments"]]
    assert minutes == sorted(minutes)


REAL = load_events("data/sb_3754037.json")
REAL_FOUND = detect_all(REAL)


def test_analyst_brief_names_the_side_that_created_better_chances():
    r = audience.resolve(audience.parse_profile(metric="xg"), REAL, REAL_FOUND)
    brief = audience.build_brief(REAL, REAL_FOUND, r, "analyst")
    quality = brief["chance_quality"]
    assert quality["better"] == "AFC Bournemouth"
    assert quality["xg"]["AFC Bournemouth"] > quality["xg"]["Everton"]
    assert "AFC Bournemouth created the better chances" in quality["summary"]
