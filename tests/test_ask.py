"""Ask the match: the model routes and words, the rules supply every fact."""
import json
import os

from app import ask, narrator
from app.detectors import detect_all
from app.events import load_events

EVENTS = load_events("data/demo_match.json")
FOUND = detect_all(EVENTS)
narrator.register_players(e.player for e in EVENTS)


class FakeModel:
    """Stands in for NVIDIA: router_reply for the router call, writer for the answer call."""

    def __init__(self, router_reply, writer=None):
        self.router_reply, self.writer, self.calls = router_reply, writer, []

    def __call__(self, model, messages, label, max_tokens=0):
        self.calls.append(label)
        if label == "ask router":
            if isinstance(self.router_reply, Exception):
                raise self.router_reply
            return self.router_reply
        payload = json.loads(messages[1]["content"])
        return self.writer(payload) if self.writer else f"As the facts show. [{payload['evidence'][0]}]"


def run(fake, question, mode="auto"):
    old_chat, old_key = ask._chat, os.environ.get("NVIDIA_API_KEY")
    narrator._pause_until, narrator._failures = 0.0, 0
    os.environ["NVIDIA_API_KEY"] = "test"
    ask._chat = fake
    try:
        return ask.answer(EVENTS, FOUND, question, mode=mode, model="test-model")
    finally:
        ask._chat = old_chat
        narrator._pause_until, narrator._failures = 0.0, 0
        if old_key is None:
            os.environ.pop("NVIDIA_API_KEY", None)
        else:
            os.environ["NVIDIA_API_KEY"] = old_key


def real_ids():
    return {e.id for e in EVENTS}


def test_rules_mode_answers_a_fixed_phrase_from_real_facts():
    fake = FakeModel("unused")
    out = run(fake, "Why did Reds win?", mode="rules")
    assert out["mode"] == "rules" and out["router"] == "keywords" and out["answerable"]
    assert fake.calls == []                               # rules mode never calls the model
    assert out["facts"] and set(out["evidence"]) <= real_ids()
    assert out["answer"].rstrip().endswith("]")


def test_the_rules_router_understands_the_questions_the_frontend_offers():
    """The keyword router must reach the same analyses the model would pick for the stock questions."""
    for question, analysis in [
        ("Why did the match end as it did?", "match_summary"),
        ("How did the teams play in the second half?", "second_half_change"),
        ("How well did each team play?", "team_assessment"),
        ("Which passes created the most?", "best_passes"),
        ("Which fouls mattered?", "fouls"),
        ("Who is likely to win?", "win_probability"),
    ]:
        out = run(FakeModel("unused"), question, mode="rules")
        assert out["answerable"], question
        assert analysis in [step["name"] for step in out["analyses"]], question
        assert set(out["evidence"]) <= real_ids(), question


def test_rules_cannot_understand_an_open_question_but_the_model_can():
    question = "How did Blues manage to get back into it?"
    assert run(FakeModel("unused"), question, mode="rules")["answerable"] is False
    reply = json.dumps({"answerable": True, "analyses": [{"name": "second_half_change", "team": "Blues"}]})
    fake = FakeModel(reply)
    out = run(fake, question)
    assert out["answerable"] and out["router"] == "model" and out["mode"] == "model"
    assert fake.calls == ["ask router", "ask answer"]
    assert out["analyses"] == [{"name": "second_half_change", "team": "Blues"}]
    assert set(out["evidence"]) <= real_ids()


def test_the_model_can_say_the_data_cannot_answer():
    fake = FakeModel(json.dumps({"answerable": False, "analyses": []}))
    out = run(fake, "Why did the coach substitute the striker?")
    assert out["answerable"] is False and "cannot answer" in out["answer"]
    assert fake.calls == ["ask router"]                   # no answer is written, so nothing can be invented


def test_a_made_up_number_falls_back_to_the_joined_facts():
    reply = json.dumps({"answerable": True, "analyses": [{"name": "match_summary"}]})
    fake = FakeModel(reply, writer=lambda p: f"Reds won by 417 goals. [{p['evidence'][0]}]")
    out = run(fake, "Why did Reds win?")
    assert out["mode"] == "rules" and out["router"] == "model"
    assert "417 goals" not in out["answer"] and out["facts"]


def test_a_made_up_citation_falls_back_too():
    reply = json.dumps({"answerable": True, "analyses": [{"name": "match_summary"}]})
    fake = FakeModel(reply, writer=lambda p: "Reds were better. [e999]")
    assert run(fake, "Why did Reds win?")["mode"] == "rules"


def test_a_broken_router_reply_uses_the_keyword_router():
    out = run(FakeModel("sorry, I cannot do JSON"), "Why did Reds win?")
    assert out["router"] == "keywords" and out["answerable"]


def test_router_output_is_checked_against_the_catalogue_teams_and_players():
    plan = ask._clean_plan([{"name": "launch_missiles"},
                            {"name": "team_tactics", "team": "Nobody FC"},
                            {"name": "player", "player": "Lionel Nobody"},
                            {"name": "player", "player": "Felix Ashdown"},
                            {"name": "win_probability", "minute": 9999}], EVENTS, narrator.KNOWN_PLAYERS)
    names = [p["name"] for p in plan]
    assert "launch_missiles" not in names
    assert names.count("team_tactics") == 2               # an unknown team becomes both real teams
    assert {"name": "player", "player": "Felix Ashdown"} in plan
    assert {"name": "win_probability"} in plan            # an impossible minute is dropped


def test_every_analysis_in_the_catalogue_returns_cited_facts():
    for name in ask.CATALOGUE:
        args = {"name": name, "team": "Reds", "player": "Felix Ashdown"}
        facts = ask._run(name, args, EVENTS, FOUND)
        assert facts, name
        for fact in facts:
            assert fact["text"] and set(fact["evidence"]) <= real_ids(), (name, fact)


def test_empty_question_and_empty_match():
    assert ask.answer([], [], "why?")["answerable"] is False
    assert ask.answer(EVENTS, FOUND, "   ")["answerable"] is False