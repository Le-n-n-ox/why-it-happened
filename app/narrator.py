import os
import json
import re
import requests
import time
import threading
from concurrent.futures import ThreadPoolExecutor

from app.detectors import Insight
from app.players import join_names, player_review_text
from .db import get_existing_narration, save_insight

SYSTEM = (
    "You are an expert Premier League tactical analyst and broadcaster. "
    "Given a JSON payload of a match event, write a sharp, professional studio commentary "
    "in {language}. Use only the facts in the JSON payload. "
    "Explain WHY it happened, not just what happened. The payload's 'why' holds the cause, how the move "
    "developed, its payoff and why it mattered: build one flowing sentence from those parts, in that order, "
    "linking them with words like 'after', 'which led to' or 'because'. Never claim what a player "
    "intended or felt. "
    "Stay strictly on what the JSON says: say nothing about defenders, goalkeepers or how the opposition reacted. "
    "When the facts name players (starter, finisher, players), use those names exactly as written "
    "and never add any other name. "
    "Never write coordinates or distances. Write natural, simple {language}, not a word-for-word translation. "
    "End with the evidence ids in square brackets, e.g. [e1, e2]. "
    "An earlier exchange shows the style only: describe the new insight, never copy its numbers or ids."
)

PLAYER_SYSTEM = (
    "You are a Premier League analyst writing a short end-of-match player review in {language}. "
    "Use ONLY the facts in the JSON payload. Write at most three short sentences about what changed "
    "because of this player: the moves they started or finished and what those led to, using 'story'. "
    "Do not list touch counts unless 'story' is empty. "
    "Do not invent numbers, events, positions, injuries, feelings or reasons for what the player did, "
    "and do not mention a rating. End with the evidence ids in square brackets, e.g. [e1, e2]."
)

TEAM_SYSTEM = (
    "You are a Premier League analyst writing a short end-of-match team assessment in {language}. "
    "Use ONLY the facts in the JSON payload. In at most four short sentences say how well the team "
    "played, using the verdict, name the strongest point and the biggest problem from 'story', and "
    "give the advice that 'story' contains. Do not invent tactics, numbers, players or reasons, and "
    "do not give advice that is not in 'story'. End with the evidence ids in square brackets, e.g. [e1, e2]."
)

TACTICS_SYSTEM = (
    "You are a Premier League tactical analyst writing a short end-of-match tactics review of one team in "
    "{language}. Use ONLY the facts in the JSON payload. In at most four short sentences say which tactics "
    "the team used and whether each worked, using the verdicts in 'story', and say whether and how they "
    "changed in the second half and whether that helped. Never claim what the coach intended or said: "
    "describe only what the team visibly did. Do not invent tactics, formations, numbers or players. "
    "End with the evidence ids in square brackets, e.g. [e1, e2]."
)

HALFTIME_SYSTEM = (
    "You are a Premier League analyst writing a short half-time brief for one team in {language}. "
    "Use ONLY the facts in the JSON payload. In at most four short sentences say what the first half "
    "showed: what worked, what did not, and what to watch in the second half, using the 'story' lines in "
    "that order. Never claim what the coach intended, said or believed: describe only what the data "
    "shows. Do not invent tactics, numbers, players or reasons, and do not give advice that is not in "
    "'story'. End with the evidence ids in square brackets, e.g. [e1, e2]."
)

LANGUAGE_NAMES = {
    "en": "English", "sw": "Swahili", "fr": "French", "es": "Spanish",
    "pt": "Portuguese", "de": "German", "ar": "Arabic",
}

# Raw positions are deliberately withheld so models cannot turn coordinates into distances.
MODEL_FACT_KEYS = (
    "duration_s", "passes", "ended_in", "shots", "goals", "span_min",
    "players", "starter", "finisher", "name", "touches", "carries", "tackles",
    "interceptions", "fouls", "progressive", "key_moments", "goal_minutes", "highlight",
    "prev_share_pct", "curr_share_pct",
    "chains_started", "chains_finished", "chains_involved", "goals_created",
)
DETECTOR_KINDS = (
    "counter_attack", "turnover_shot", "high_press_turnover", "goal_buildup",
    "shot_pressure", "foul_turning_point", "player_standout", "momentum_swing",
)

KIND_MEANING = {
    "counter_attack": "won the ball in their own half and reached a shot or goal within seconds",
    "turnover_shot": "won the ball back and worked it into a shot, a little more slowly",
    "high_press_turnover": "won the ball high up the pitch by pressing, then reached a shot or goal quickly",
    "goal_buildup": "kept the ball through a patient passing move and scored",
    "shot_pressure": "kept attacking and had several shots within a few minutes",
    "foul_turning_point": "won a foul and punished the opposition by scoring from the resulting play",
    "player_standout": "was heavily involved and ran the game for their team over a short spell",
    "momentum_swing": "turned the game around, taking control of possession after being dominated",
    "player_review": "a short end-of-match review of one player's game",
    "team_assessment": "an end-of-match assessment of how well one team played and what it should change",
    "tactics_report": "an end-of-match review of the tactics one team visibly used, whether they worked, and any change after half-time",
    "halftime_brief": "what the first half showed for one team: what worked, what did not, and what to watch in the second half",
}

# One worked example per language, shown to the model as an earlier exchange. It teaches tone and
# length only: the numbers and ids are made up and must differ from the real insight's.
EXAMPLE_PAYLOAD = {
    "kind": "counter_attack",
    "team": "Reds",
    "minute": 33.0,
    "meaning": KIND_MEANING["counter_attack"],
    "facts": {"duration_s": 14, "passes": 3, "ended_in": "shot",
              "players": ["Okoro", "Lindqvist", "Varga"], "starter": "Okoro", "finisher": "Varga"},
    "why": {"cause": "Okoro intercepted the ball in Reds' own third",
            "how": "4 touches in 14 seconds moved it from the own third to the final third",
            "payoff": "Varga took a shot", "why_it_mattered": "It was Reds' shot number 2 of the match."},
    "evidence": ["e901", "e902", "e903", "e904"],
}

FEW_SHOT_BY_LANGUAGE = {
    "English": "33' Reds create this chance because Okoro intercepts in their own third, and 4 touches in "
               "14 seconds carry it forward for Varga to shoot, Reds' second shot of the match. [e901, e902, e903, e904]",
    "French": "33e minute : Okoro récupère le ballon pour les Reds dans leur moitié de terrain, "
              "et Varga tire 14 secondes plus tard, après seulement 3 passes. [e901, e902, e903, e904]",
    "Spanish": "Minuto 33: Okoro recupera el balón para los Reds en su propio campo y Varga remata "
               "14 segundos después, tras solo 3 pases. [e901, e902, e903, e904]",
    "Swahili": "Dakika ya 33: Okoro anaupata mpira kwa Reds katika nusu yao ya uwanja, na Varga "
               "anapiga shuti sekunde 14 baadaye, baada ya pasi 3 tu. [e901, e902, e903, e904]",
}

def make_client():
    """Returns a dummy client placeholder since we are using direct REST requests."""
    return None


def ensure_citations(text: str, insight: Insight) -> str:
    """Add real evidence ids when absent and reject citations outside the evidence."""
    groups = re.findall(r"\[([^\]]+)\]", text)
    if not groups:
        return f"{text} [{', '.join(insight.evidence)}]"
    cited = {c.strip() for g in groups for c in g.split(",")}
    unknown = cited - set(insight.evidence)
    if unknown:
        raise ValueError(f"model cited ids that are not evidence: {sorted(unknown)}")
    return text


_NOT_FACT_KEYS = {"evidence", "id", "_ids", "_entry_evidence"}
_POSITIONAL_FACT = re.compile(r"(^|_)(x|y)$|distance|gain", re.IGNORECASE)


def _fact_values(value, key: str = ""):
    """Walk the facts the model was shown, skipping evidence ids and raw positions.

    Positional fields are deliberately withheld (see MODEL_FACT_KEYS): a model may not turn
    coordinates into distances, so they are not facts it is allowed to quote either.
    """
    if key in _NOT_FACT_KEYS or _POSITIONAL_FACT.search(key):
        return
    if isinstance(value, dict):
        for child_key, child in value.items():
            yield from _fact_values(child, str(child_key))
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from _fact_values(child, key)
    elif value is not None:
        yield value


_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


def _number_set(text: str) -> set[float]:
    """Numbers as written, decimals included: 0.9 must match a fact of 0.9, not just 0 and 9."""
    return {round(float(token.replace(",", ".")), 2) for token in _NUMBER.findall(text)}


def numbers_are_grounded(text: str, insight: Insight) -> bool:
    """Every number in the text must be the minute or one of the facts shown to the model."""
    allowed = {round(float(insight.minute), 2)}
    for value in _fact_values(insight.facts or {}):
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            allowed.add(round(float(value), 2))
        elif isinstance(value, str):
            allowed |= _number_set(value)
    body = re.sub(r"\[[^\]]*\]", "", text)
    # The minute is written as 5.7' or 10'. Its digits are the clock, not a fact, so drop the
    # whole token: otherwise a fractional minute (5.7) reads as two numbers (5 and 7) and the
    # caption is rejected even though every real number in it came from the facts.
    body = re.sub(r"\b\d+(?:[.,]\d+)?\s*['\u2019\u2032]", "", body)
    return _number_set(body) <= allowed


KNOWN_PLAYERS: set[str] = set()      # every player name in the match; filled by register_players()


def register_players(names) -> None:
    KNOWN_PLAYERS.update(name for name in names if name)


def _mentions(text: str, name: str) -> bool:
    parts = {name, name.split()[-1]}
    return any(re.search(rf"\b{re.escape(part)}\b", text) for part in parts)


def names_are_grounded(text: str, allowed_text: str) -> bool:
    """A real player in the match may only be named if the facts name them too."""
    body = re.sub(r"\[[^\]]*\]", "", text)
    return all(not _mentions(body, name) or _mentions(allowed_text, name) for name in KNOWN_PLAYERS)


def _facts_text(insight: Insight) -> str:
    """Every name and sentence the model was shown for this insight."""
    return " ".join(str(value) for value in _fact_values(insight.facts or {}))


def template_narration(insight: Insight) -> str:
    facts = insight.facts or {}
    cites = ", ".join(insight.evidence)
    if insight.kind == "player_review" and "name" in facts:
        return f"{player_review_text(facts, insight.team)} [{cites}]"
    if insight.kind in ("team_assessment", "tactics_report", "halftime_brief") and facts.get("story"):
        return f"{' '.join(facts['story'])} [{cites}]"
    why = facts.get("why")
    if why and insight.kind != "player_review":
        return (f"{int(insight.minute)}' {why['cause']}; {why['how']}; {why['payoff']}. "
                f"{why['why_it_mattered']} [{cites}]")
    named = _named_sentence(insight)
    if named:
        return f"{int(insight.minute)}' {named} [{cites}]"
    if insight.kind == "counter_attack" and {"duration_s", "passes", "ended_in"} <= facts.keys():
        ended = str(facts["ended_in"]).replace("_", " ")
        n = facts["passes"]
        body = (f"{insight.team} win the ball and reach a {ended} in "
                f"{facts['duration_s']} seconds after {n} {'pass' if n == 1 else 'passes'}.")
    elif insight.kind == "turnover_shot" and {"duration_s", "ended_in"} <= facts.keys():
        body = (f"{insight.team} win the ball back and work it into a "
                f"{str(facts['ended_in']).replace('_', ' ')} in {facts['duration_s']} seconds.")
    elif insight.kind == "high_press_turnover" and {"duration_s", "ended_in"} <= facts.keys():
        body = (f"{insight.team} win the ball high up the pitch and reach a "
                f"{str(facts['ended_in']).replace('_', ' ')} in {facts['duration_s']} seconds.")
    elif insight.kind == "shot_pressure" and {"shots", "span_min"} <= facts.keys():
        minutes = facts["span_min"]
        body = (
            f"{insight.team} keep the pressure on with {facts['shots']} shots in "
            f"{minutes} {'minute' if minutes == 1 else 'minutes'}."
        )
    elif insight.kind == "goal_buildup" and {"duration_s", "passes"} <= facts.keys():
        body = (
            f"{insight.team} string together {facts['passes']} passes over "
            f"{facts['duration_s']} seconds and score."
        )
    elif insight.kind == "foul_turning_point" and "duration_s" in facts:
        body = f"{insight.team} win a foul and punish the opposition by scoring {facts['duration_s']} seconds later."
    elif insight.kind == "player_standout" and {"name", "touches", "span_min"} <= facts.keys():
        body = f"{facts['name']} runs the show for {insight.team} with {facts['touches']} touches in {facts['span_min']} minutes."
    elif insight.kind == "momentum_swing" and {"prev_share_pct", "curr_share_pct"} <= facts.keys():
        body = (f"{insight.team} flip the momentum, jumping from {facts['prev_share_pct']}% possession "
                f"to {facts['curr_share_pct']}% over the last {facts.get('span_min', 5)} minutes.")
    else:
        body = f"{insight.team}: {insight.kind.replace('_', ' ')} detected."
    return f"{int(insight.minute)}' {body} [{cites}]"


def _named_sentence(insight: Insight) -> str | None:
    """Build a detector sentence using player names carried by its evidence."""
    f = insight.facts or {}
    team, starter, finisher = insight.team, f.get("starter"), f.get("finisher")
    seconds = f.get("duration_s")
    verb = "scores" if f.get("ended_in") == "goal" else "shoots"
    second = verb if starter == finisher else f"{finisher} {verb}"
    if insight.kind == "counter_attack" and starter and finisher and seconds is not None:
        n = f.get("passes", 0)
        return (f"{starter} wins the ball for {team} and {second} {seconds} seconds later, "
                f"after {n} {'pass' if n == 1 else 'passes'}.")
    if insight.kind == "turnover_shot" and starter and finisher and seconds is not None:
        return f"{starter} wins the ball back for {team}, and {second} {seconds} seconds later."
    if insight.kind == "high_press_turnover" and starter and finisher and seconds is not None:
        return f"{starter} wins the ball high up the pitch for {team} and {second} {seconds} seconds later."
    if insight.kind == "goal_buildup" and starter and finisher and seconds is not None and "passes" in f:
        return (f"{team} string together {f['passes']} passes over {seconds} seconds, "
                f"from {starter} to {finisher}, who scores.")
    if insight.kind == "shot_pressure" and f.get("players") and {"shots", "span_min"} <= f.keys():
        m = f["span_min"]
        return (f"{team} keep the pressure on with {f['shots']} shots in "
                f"{m} {'minute' if m == 1 else 'minutes'}, from {join_names(f['players'])}.")
    if insight.kind == "foul_turning_point" and finisher and seconds is not None:
        return f"{team} win a foul and {finisher} punishes the opposition with a goal {seconds} seconds later."
    if insight.kind == "player_standout" and f.get("name") and {"touches", "span_min"} <= f.keys():
        m = f["span_min"]
        return f"{f['name']} is running the show for {team} with {f['touches']} touches in {m} minutes."
    if insight.kind == "momentum_swing" and {"prev_share_pct", "curr_share_pct"} <= f.keys():
        return (f"{team} turn the game around, moving from {f['prev_share_pct']}% to "
                f"{f['curr_share_pct']}% possession over {f.get('span_min', 5)} minutes.")
    return None


_failures = 0
_pause_until = 0.0
_last_error: str | None = None      # shown by /health, so problems are visible without reading logs
_last_error_at: float | None = None
_calls_ok = 0
_calls_failed = 0


_state_lock = threading.Lock()


def _record_model_result(ok: bool, error: Exception | str | None = None) -> None:
    """Two failures in a row pause the model for 60 s, so a slow NVIDIA cannot stall the demo."""
    with _state_lock:
        _record_locked(ok, error)


def _record_locked(ok: bool, error: Exception | str | None) -> None:
    global _failures, _pause_until, _last_error, _last_error_at, _calls_ok, _calls_failed
    if ok:
        _failures = 0
        _calls_ok += 1
        return
    _calls_failed += 1
    _last_error = (str(error) or type(error).__name__)[:200] if error is not None else "unknown error"
    _last_error_at = time.time()
    _failures += 1
    if _failures >= 2:
        _pause_until = time.time() + 60
        _failures = 0


_session = requests.Session()


def _post(url: str, headers: dict, body: dict, timeout_seconds: float):
    """Reuse the HTTP connection and retry only transient server responses."""
    def send():
        return _session.post(url, headers=headers, json=body, timeout=(10, timeout_seconds))

    response = send()
    if response.status_code in (429, 500, 502, 503, 504):
        try:
            wait = min(float(response.headers.get("Retry-After", 2)), 5.0)
        except (TypeError, ValueError):
            wait = 2.0
        time.sleep(wait)
        response = send()
    if (response.status_code in (400, 422) and "reasoning_effort" in body
            and "reasoning_effort" in response.text):
        body.pop("reasoning_effort")
        response = send()
    return response

def _chat(model: str, messages: list[dict], label: str, max_tokens: int = 1024) -> str:
    """One chat request to NVIDIA over REST. Returns clean text; raises on any problem."""
    api_key = os.getenv("NVIDIA_API_KEY")
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": max_tokens,
        "reasoning_effort": "low",
        "stream": False
    }

    # Nemotron 3.5 thinks by default. Its reasoning and final answer share
    # max_tokens, so a long reasoning trace can leave message.content empty.
    if model == "nvidia/nemotron-3.5-lightning-30b-a3b":
        body.pop("reasoning_effort", None)
        body["chat_template_kwargs"] = {"enable_thinking": False}

    print(f"\n[DEBUG] Requesting model '{model}' ({label}) via direct REST API...")
    base_timeout = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "20"))
    # Longer answers take longer: a 700-token proposal needs more room than a two-sentence caption,
    # and an 8 s cap on it turned a slow reply into an empty hypothesis list.
    timeout_seconds = base_timeout * max(1.0, max_tokens / 300)
    response = _post(invoke_url, headers, body, timeout_seconds)

    if response.status_code != 200:
        raise RuntimeError(f"NVIDIA API Error {response.status_code}: {response.text}")

    res_json = response.json()
    choices = res_json.get("choices", [])
    if not choices:
        raise ValueError("The NVIDIA API returned an empty response choices list.")

    content = choices[0].get("message", {}).get("content")
    if not content:
        choice = choices[0]
        usage = res_json.get("usage", {}).get("completion_tokens_details", {})
        raise ValueError(
            "The NVIDIA API returned no visible text "
            f"(finish_reason={choice.get('finish_reason')}, "
            f"reasoning_tokens={usage.get('reasoning_tokens')})."
        )

    text = _clean(content)
    if not text:
        raise ValueError("The NVIDIA API returned only reasoning text.")
    return text


def _clean(content: str) -> str:
    return content.strip()


def narrate(client, model: str, insight: Insight, language: str = "English") -> str:
    """One insight in one language."""
    payload_data = {
        "kind": insight.kind,
        "team": insight.team,
        "minute": insight.minute,
        "meaning": KIND_MEANING.get(insight.kind, ""),
        "facts": {k: v for k, v in insight.facts.items() if k in MODEL_FACT_KEYS},
        "evidence": insight.evidence,
    }
    if insight.facts.get("why"):
        payload_data["why"] = insight.facts["why"]
    if insight.facts.get("story"):
        payload_data["story"] = insight.facts["story"]
    system = (PLAYER_SYSTEM if insight.kind == "player_review" else
              TEAM_SYSTEM if insight.kind == "team_assessment" else
              TACTICS_SYSTEM if insight.kind == "tactics_report" else
              HALFTIME_SYSTEM if insight.kind == "halftime_brief" else SYSTEM)
    messages = [{"role": "system", "content": system.format(language=language)}]
    if insight.kind in DETECTOR_KINDS and language in FEW_SHOT_BY_LANGUAGE:
        messages += [
            {"role": "user", "content": json.dumps(EXAMPLE_PAYLOAD)},
            {"role": "assistant", "content": FEW_SHOT_BY_LANGUAGE[language]},
        ]
    messages.append({"role": "user", "content": json.dumps(payload_data)})
    return _chat(model, messages, language, max_tokens=300)

def _save(insight: Insight, text: str, code: str, cache_result: bool, history: bool) -> None:
    """Persist a caption, but never let a database hiccup take down the narration."""
    try:
        save_insight(insight, text, language=code, cache_result=cache_result, history=history)
    except Exception as exc:
        print(f"[DEBUG] could not save the caption for '{insight.id}' ({exc})")


def _narrate_language(client, model: str | None, insight: Insight, code: str,
                      save_history: bool = True, record: bool = True) -> tuple[str | None, str]:
    """Narrate one language; return text and whether it came from cache, model, or fallback."""
    cached = get_existing_narration(insight.id, code)
    if cached:
        print(f"[DEBUG] Served insight '{insight.id}' ({code}) from DB cache.")
        return cached, "cached"

    paused = time.time() < _pause_until
    try:
        if not model or not os.getenv("NVIDIA_API_KEY"):
            raise RuntimeError("NVIDIA model or API key is not configured")
        if paused:
            raise RuntimeError("model paused for 60 s after repeated failures")
        text = ensure_citations(narrate(client, model, insight, LANGUAGE_NAMES.get(code, code)), insight)
        if not numbers_are_grounded(text, insight):
            raise ValueError("model used a number that is not in the facts")
        if not names_are_grounded(text, _facts_text(insight)):
            raise ValueError("model named a player who is not in the facts")
        if record:
            _record_model_result(True)
    except Exception as exc:
        if record and not paused and model and os.getenv("NVIDIA_API_KEY"):
            _record_model_result(False, exc)
        print(f"[DEBUG] LLM call failed for '{code}' ({exc}); using template fallback")
        if code != "en":
            return None, "skipped"
        text = template_narration(insight)
        _save(insight, text, code, cache_result=False, history=save_history)
        return text, "template"

    _save(insight, text, code, cache_result=True, history=save_history)
    return text, "model"


def narrate_all(client, model: str | None, insight: Insight, languages: list[str] | None = None,
                save_history: bool = True, record: bool = True) -> dict[str, str]:
    """Narrate requested languages concurrently and persist each result."""
    requested = languages or ["en"]
    with ThreadPoolExecutor(max_workers=len(requested)) as pool:
        outcomes = list(pool.map(
            lambda code: _narrate_language(client, model, insight, code, save_history, record), requested
        ))
    results = {code: text for code, (text, _) in zip(requested, outcomes) if text}
    if not results:
        text = template_narration(insight)
        _save(insight, text, "en", cache_result=False, history=save_history)
        results["en"] = text
    return results


RECAP_SYSTEM = (
    "You are a Premier League studio analyst writing a full-time summary in {language}. "
    "Write at most three short sentences. Use ONLY the facts in the JSON. "
    "Explain WHY the result happened: start with the football reasons in 'factors' (chance quality, finishing, "
    "pressure, turnovers), then say what caused each goal from 'moments', and name the biggest problem of the "
    "weaker team from 'teams'. "
    "Mention the standout player and their key contribution (such as goals scored) if provided. "
    "Never say what a player intended. "
    "Do not invent players, goals, scores or stats, and never write coordinates or distances. "
    "Do not use square brackets."
)


def model_available() -> bool:
    """False while the model is paused after repeated failures."""
    return time.time() >= _pause_until


def model_status() -> dict:
    """What /health reports about the model. Reads state only; never calls NVIDIA."""
    now = time.time()
    paused = now < _pause_until
    return {
        "paused": paused,
        "paused_for_s": max(0, round(_pause_until - now)) if paused else 0,
        "consecutive_failures": _failures,
        "calls_ok": _calls_ok,
        "calls_failed": _calls_failed,
        "last_error": _last_error,
        "last_error_s_ago": round(now - _last_error_at) if _last_error_at else None,
    }


def write_recap(
    model: str,
    language_code: str,
    score: dict,
    moments: list[dict],
    top_player: dict | None = None,
    teams: list[str] | None = None,
    factors: list[str] | None = None,
) -> str:
    """AI full-time summary featuring score, moments, and standout player; ground all numbers."""
    allowed = set(score.values()) | {len(moments)}
    for m in moments:
        allowed.add(int(m["minute"]))
        allowed.update(int(n) for n in re.findall(r"\d+", m["what"]))
    payload = {"score": score, "moments": moments}
    if teams:
        payload["teams"] = teams
        for line in teams:
            allowed.update(int(n) for n in re.findall(r"\d+", line))
    if factors:
        payload["factors"] = factors
        for line in factors:
            allowed.update(int(n) for n in re.findall(r"\d+", line))
    if top_player:
        payload["standout_player"] = {
            "name": top_player.get("name"),
            "team": top_player.get("team"),
            "goals": top_player.get("goals", 0),
            "rating": top_player.get("rating", 0),
        }
        allowed.add(int(top_player.get("goals", 0)))
        allowed.add(int(top_player.get("rating", 0)))
    language = LANGUAGE_NAMES.get(language_code, language_code)
    messages = [
        {"role": "system", "content": RECAP_SYSTEM.format(language=language)},
        {"role": "user", "content": json.dumps(payload)},
    ]
    try:
        text = _chat(model, messages, f"recap {language_code}", max_tokens=400)
        text = re.sub(r"\s*\[[^\]]*\]", "", text)
        if not {int(n) for n in re.findall(r"\d+", text)} <= allowed:
            raise ValueError("recap used a number that is not in the facts")
        shown = " ".join([moment["what"] for moment in moments] + list(teams or []) + list(factors or [])
                          + [str((top_player or {}).get("name", ""))])
        if not names_are_grounded(text, shown):
            raise ValueError("recap named a player who is not in the facts")
    except Exception as exc:
        _record_model_result(False, exc)
        raise
    _record_model_result(True)
    return text
