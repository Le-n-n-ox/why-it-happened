"""FastAPI service for Why It Happened.

  GET  /health            liveness + whether an LLM is configured
  GET  /events            the match events we replay
  POST /events            ingest one live match event
  GET  /insights          insights stored so far (current stream)
  GET  /insights/history  saved insights from the database (?team=&limit=)
  GET  /recap             full-time recap text (?lang=)
  GET  /why               match-level explanation for WhyPanel (?lang=)
  GET  /fouls             stub for frontend compatibility
  GET  /team/{id}/assessment stub for frontend compatibility
  GET  /team/{id}/tactics stub for frontend compatibility
  GET  /predict           stub for frontend compatibility
  GET  /players           player summaries derived from match events
  GET  /players/{id}      one player's details
  GET  /players/{id}/review written review placeholder (?lang=)
  GET  /stream            Server-Sent Events: replays the match and pushes insights live
"""
import asyncio
import hashlib
import json
import os
import re
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock, Thread

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.assessment import assess_team, assessment_insight
from app.ask import answer as ask_answer
from app.audience import (brief_payload, overlay_payload, parse_profile, rank_insights, resolve)
from app.causes import (attach_why, causal_chains, chain_for, explain_event, foul_explanations,
                        turning_points, why_they_won)
from app.db import get_existing_narration, get_insights, init_db
from app.detectors import detect_all
from app.events import EventType, MatchEvent, from_official, load_events
from app.hypotheses import hypotheses as goal_hypotheses
from app.hypotheses import style_claims
from app.matchinfo import match_info
from app.momentum import momentum as momentum_swings
from app.players import involvement, player_actions, player_stats, player_table, rating, review_insight
from app.positions import positions as player_positions
from app.narrator import (make_client, model_available, model_status, narrate_all, register_players,
                          write_recap)
from app.simulate import replay
from app.tactics import (factors_summary, first_half_brief, halftime_insight, match_factors, pass_quality,
                          tactical_report, tactics_insight, win_probability, win_timeline)
from app.voices import voices
from app.store import OmniPitchStore

load_dotenv()

EVENTS_FILE = os.getenv("EVENTS_FILE", "data/sample_match.json")
REPLAY_DELAY = float(os.getenv("REPLAY_DELAY", "0.5"))
LANGS = [c.strip() for c in os.getenv("NARRATION_LANGS", "en").split(",") if c.strip()]
MODEL = os.getenv("NVIDIA_MODEL")
MAX_PARALLEL_NARRATIONS = 3    # captions in flight at once; the model handled 4 in the probe

# ---- answer cache ---------------------------------------------------------------------------
# /why, /voices, /momentum and /goals/{id}/hypotheses are pure functions of the match events, so
# the same question about the same match must not call the model twice. The key carries a
# fingerprint of the event ids, so a new live event retires every entry automatically.
CACHE_SIZE = 64
_CACHE: "OrderedDict[tuple, dict]" = OrderedDict()
_CACHE_LOCK = Lock()


def _match_version(events) -> str:
    """A cheap fingerprint of the event set, so cached answers cannot outlive the match."""
    digest = hashlib.blake2b(digest_size=8)
    for event in events:
        digest.update(event.id.encode())
    return digest.hexdigest()


def _cached(key: tuple, build):
    """Memoise a pure function of the match state; the key must include _match_version(events)."""
    with _CACHE_LOCK:
        if key in _CACHE:
            _CACHE.move_to_end(key)
            return _CACHE[key]
    value = build()
    with _CACHE_LOCK:
        _CACHE[key] = value
        _CACHE.move_to_end(key)
        while len(_CACHE) > CACHE_SIZE:
            _CACHE.popitem(last=False)
    return value

# Allowed origins for CORS (Vite dev server on localhost/127.0.0.1, or ALLOWED_ORIGINS override)
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
ENV_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOW_ORIGINS = ENV_ORIGINS if ENV_ORIGINS else DEFAULT_ORIGINS

app = FastAPI(title="Why It Happened")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OmniPitchStore holds both insights and raw events
store = OmniPitchStore(os.getenv("DB_PATH", ":memory:"))
client = make_client()  # always None: narrator calls the NVIDIA REST API directly
live_match_events: list[MatchEvent] = []      # events pushed in by a video parser or feed (POST /events)
_live_ids: set[str] = set()
_live_state = {"ended": False}
INGEST_TOKEN = os.getenv("INGEST_TOKEN")        # when set, every ingest route needs the X-Ingest-Token header


init_db()        # at import, so it also runs under TestClient
store.clear()    # start clean once per server start (not on every /stream)


def _current_events() -> list[MatchEvent]:
    """The live match if a feed has pushed events in, otherwise the match file."""
    return list(live_match_events) if live_match_events else load_events(EVENTS_FILE)


def _data_source() -> str:
    """A displayable provenance label without exposing local file paths or credentials."""
    if live_match_events:
        return os.getenv("LIVE_DATA_SOURCE", "Live event feed")
    configured = os.getenv("DATA_SOURCE")
    if configured:
        return configured
    filename = Path(EVENTS_FILE).name.casefold()
    if filename.startswith("sb_"):
        return "StatsBomb Open Data"
    if filename == "demo_match.json":
        return "Built-in demo match"
    if filename == "sample_match.json":
        return "Built-in sample match"
    return "Configured match file"


def _match_data():
    """Load the full match, independent of the live stream's rolling window."""
    events = _current_events()
    register_players(e.player for e in events)
    return events, detect_all(events)


@app.get("/players")
def players():
    """Named players and their event-based stats, best rated first."""
    events, found = _match_data()
    return player_table(events, found)


@app.get("/players/{player_id}")
def player_detail(player_id: str):
    """Stats, rating breakdown, match involvement, and action context for one player."""
    events, found = _match_data()
    stats = player_stats(events, found).get(player_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Unknown player")
    score = rating(stats)
    return {
        **stats,
        "rating": score["value"],
        "rating_breakdown": score["breakdown"],
        "moments": involvement(events, found).get(player_id, []),
        "actions": player_actions(events, player_id, found),
    }


@app.get("/players/{player_id}/review")
def player_review(player_id: str, lang: str = "en"):
    """Return a grounded end-of-match player review and its supporting evidence."""
    events, found = _match_data()
    insight = review_insight(events, player_id, found)
    if insight is None:
        raise HTTPException(status_code=404, detail="Unknown player")
    narration = narrate_all(client, MODEL, insight, [lang])
    used = lang if lang in narration else "en"
    score = rating(player_stats(events, found)[player_id])
    return {
        "player_id": player_id,
        "name": insight.facts["name"],
        "team": insight.team,
        "lang": used,
        "text": narration.get(used) or next(iter(narration.values())),
        "rating": score["value"],
        "rating_breakdown": score["breakdown"],
        "evidence": insight.evidence,
    }


def _compute_team_metrics(events, team_name: str) -> dict:
    """Computes whole-match team metrics directly from the event feed."""
    total_actions = len([e for e in events if getattr(e, "team", None)])
    team_events = [e for e in events if getattr(e, "team", None) == team_name]
    
    # 1. Possession: share of recorded actions (whole %)
    possession = int(round((len(team_events) / max(total_actions, 1)) * 100)) if total_actions > 0 else 0
    
    # 2. Passes & Accuracy
    passes = [e for e in team_events if getattr(e, "type", getattr(e, "kind", None)) == "pass"]
    successful_passes = [
        e for e in passes 
        if not getattr(e, "outcome", None) or getattr(e, "outcome", "") in ("complete", "successful")
    ]
    pass_accuracy = int(round((len(successful_passes) / max(len(passes), 1)) * 100)) if passes else 0
    
    # 3. Shots on target: goals and saved shots
    shots_on_target = len([
        e for e in team_events
        if getattr(e, "type", getattr(e, "kind", None)) == "goal"
        or (getattr(e, "type", getattr(e, "kind", None)) == "shot" and getattr(e, "outcome", None) in ("saved", "on_target"))
    ])
    
    # 4. Fouls committed
    fouls = len([e for e in team_events if getattr(e, "type", getattr(e, "kind", None)) == "foul"])
    
    return {
        "possession": possession,
        "passes": len(passes),
        "pass_accuracy": pass_accuracy,
        "shots_on_target": shots_on_target,
        "fouls": fouls,
    }


def _compute_formation_players(events, team_name: str) -> list[dict]:
    """Computes average position (x, y) per player in own-goal-line frame."""
    coords = {}
    for e in events:
        if getattr(e, "team", None) == team_name and getattr(e, "player", None):
            p_id = e.player
            x = getattr(e, "x", None)
            y = getattr(e, "y", None)
            if x is not None and y is not None:
                if p_id not in coords:
                    coords[p_id] = {
                        "x_sum": 0.0,
                        "y_sum": 0.0,
                        "count": 0,
                        "name": getattr(e, "player_name", p_id)
                    }
                coords[p_id]["x_sum"] += x
                coords[p_id]["y_sum"] += y
                coords[p_id]["count"] += 1
                
    return [
        {
            "id": p_id,
            "name": data["name"],
            "x": round(data["x_sum"] / data["count"], 1),
            "y": round(data["y_sum"] / data["count"], 1)
        }
        for p_id, data in coords.items()
        if data["count"] > 0
    ]


@app.get("/team/{team}/assessment")
def team_assessment(team: str, lang: str = "en"):
    """How well a team played, the evidence for it, and what it should change."""
    events, _ = _match_data()
    name = next((e.team for e in events if e.team.casefold() == team.casefold()), None)
    report = assess_team(events, name) if name else None
    if report is None:
        raise HTTPException(status_code=404, detail="Unknown team")
    
    # Merge event-derived metrics with existing report metrics
    computed_metrics = _compute_team_metrics(events, name)
    existing_metrics = report.get("metrics") or {}
    report["metrics"] = {**existing_metrics, **computed_metrics}

    insight = assessment_insight(events, name)
    narration = narrate_all(client, MODEL, insight, [lang])
    used = lang if lang in narration else "en"
    return {
        **report,
        "lang": used,
        "text": narration.get(used) or next(iter(narration.values())),
        "evidence": insight.evidence,
    }


@app.get("/team/{team}/tactics")
def team_tactics(team: str, lang: str = "en"):
    """The tactics a team used, whether they worked, how they changed after half-time."""
    events, _ = _match_data()
    name = next((e.team for e in events if e.team.casefold() == team.casefold()), None)
    report = tactical_report(events, name) if name else None
    if report is None:
        raise HTTPException(status_code=404, detail="Unknown team")

    # Enrich formation structure with shape and calculated average player positions
    formation = report.get("formation") or {"available": False}
    if formation.get("available"):
        formation["shape"] = formation.get("shape") or "4-2-3-1"
        formation["players"] = _compute_formation_players(events, name)
        report["formation"] = formation

    insight = tactics_insight(events, name)
    narration = narrate_all(client, MODEL, insight, [lang])
    used = lang if lang in narration else "en"
    return {
        **report,
        "lang": used,
        "text": narration.get(used) or next(iter(narration.values())),
        "evidence": insight.evidence,
    }


@app.get("/team/{team}/claims")
def team_claims(team: str, mode: str = "auto"):
    """Claims about how a team played across the whole match, tested by the same rules as the goals."""
    events, _ = _match_data()
    name = next((e.team for e in events if e.team.casefold() == team.casefold()), None)
    if name is None:
        raise HTTPException(status_code=404, detail="Unknown team")
    return style_claims(events, model=MODEL, mode=mode, team=name)


@app.get("/voices")
def match_voices(lang: str = "en", mode: str = "fan",
                 club: list[str] = Query(default=[]), player: list[str] = Query(default=[]),
                 metric: str | None = None):
    """The same match, written for the side of the story each audience came for.

    Every voice gets a different brief: the fan the story and their club, the announcer the timed
    cues, the analyst the measured factors, the player that player's match. `club`, `player` and
    `metric` personalise it; repeat or comma-separate them for more than one.
    """
    events, found = _match_data()
    profile = parse_profile(mode, club, player, metric, lang)
    return _cached(("voices", lang, profile, _match_version(events)),
                   lambda: voices(events, found, model=MODEL, lang=lang, profile=profile))


@app.get("/brief")
def audience_brief(lang: str = "en", mode: str = "fan",
                   club: list[str] = Query(default=[]), player: list[str] = Query(default=[]),
                   metric: str | None = None):
    """The rules-only side of the story for one viewer profile. No model call, safe for overlays."""
    events, found = _match_data()
    profile = parse_profile(mode, club, player, metric, lang)

    def build():
        resolved = resolve(profile, events, found)
        return brief_payload(events, found, resolved)

    return _cached(("brief", profile, _match_version(events)), build)


@app.get("/overlay")
def audience_overlay(lang: str = "en", mode: str = "fan",
                     club: list[str] = Query(default=[]), player: list[str] = Query(default=[]),
                     metric: str | None = None):
    """Timed, machine-readable cards for a renderer: `at` is the match clock, `hold_s` the dwell."""
    events, found = _match_data()
    profile = parse_profile(mode, club, player, metric, lang)

    def build():
        resolved = resolve(profile, events, found)
        return overlay_payload(events, found, resolved, lang)

    return _cached(("overlay", lang, profile, _match_version(events)), build)


@app.get("/halftime")
def halftime_brief(lang: str = "en"):
    """What the first half showed for each team: what worked, what didn't, and what to watch."""
    events, _ = _match_data()

    def build():
        prepared = []
        for team in dict.fromkeys(e.team for e in events):
            brief = first_half_brief(events, team)
            insight = halftime_insight(events, team, brief) if brief.get("available") else None
            prepared.append((team, brief, insight))

        # The two teams' briefs are independent, so word them together instead of in turn.
        pending = [insight for _, _, insight in prepared if insight is not None]
        with ThreadPoolExecutor(max_workers=max(1, len(pending))) as pool:
            narrations = list(pool.map(lambda i: narrate_all(client, MODEL, i, [lang]), pending))
        captions = {insight.id: narration for insight, narration in zip(pending, narrations)}

        briefs = []
        for team, brief, insight in prepared:
            if insight is None:
                briefs.append({"team": team, "available": False, "reason": brief["reason"]})
                continue
            narration = captions[insight.id]
            used = lang if lang in narration else "en"
            briefs.append({**brief, "lang": used,
                           "text": narration.get(used) or next(iter(narration.values())),
                           "evidence": insight.evidence})
        return {"briefs": briefs,
                "note": "The rules pick the facts and rank them: every line is a count over the first half's "
                        "events. The model only words them, and never says what the coach intended."}

    return _cached(("halftime", lang, _match_version(events)), build)


@app.get("/positions")
def positions(minute: float | None = None):
    """Where each player was last seen (and the ball), up to `minute`. Not live tracking: see `note`."""
    events, _ = _match_data()
    return player_positions(events, minute)


@app.get("/predict")
def predict(minute: float | None = None):
    """Who is likely to win, from the score and the quality of each team's chances."""
    events, _ = _match_data()
    return {**win_probability(events, minute), "timeline": win_timeline(events)}


@app.get("/fouls")
def fouls():
    """Every foul with the situation around it and what followed."""
    events, found = _match_data()
    return foul_explanations(events, found)


@app.get("/why")
def match_why(lang: str = Query("en")):
    events, found = _match_data()

    def build():
        result = why_they_won(events, found)
        info = match_info(events)
        factors = match_factors(events)
        goals_text = " ".join(reason["text"] for reason in result["reasons"])
        summary = " ".join(part for part in (factors_summary(factors, result["winner"]), goals_text) if part)
        if not summary:
            if info["home"] and info["away"]:
                home_score, away_score = info["score"].get(info["home"], 0), info["score"].get(info["away"], 0)
                summary = (f"The match finished level at {info['home']} {home_score}-{away_score} {info['away']}."
                           if home_score == away_score else "No goal causes were recorded.")
            else:
                summary = "No match result is available."
        title = f"Why {result['winner']} won" if result["winner"] else "Why the match finished level"
        return {
            "result": result,
            **result,
            "lang": lang,
            "title": title,
            "summary": summary,
            "factors": factors,
            "turning_points": turning_points(events, found),
            "chains": causal_chains(events, found),
        }

    return _cached(("why", lang, _match_version(events)), build)


@app.get("/events/{event_id}/why")
def event_why(event_id: str):
    """Explain an event from nearby actions and any detector evidence that includes it."""
    events, found = _match_data()
    result = explain_event(events, event_id, found)
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown event")
    if result["action"] == "pass":
        index = next(i for i, e in enumerate(events) if e.id == event_id)
        result["quality"] = pass_quality(events, index)
    return result


@app.get("/goals/{goal_id}/hypotheses")
def goal_hypothesis_report(goal_id: str, mode: str = "auto"):
    """Test possible explanations for one goal; mode=sweep uses only the rules baseline."""
    events, found = _match_data()
    goal = next((e for e in events if e.id == goal_id and e.type == EventType.GOAL), None)
    if goal is None:
        raise HTTPException(status_code=404, detail="Unknown goal")

    def build():
        reports = goal_hypotheses(events, found, model=MODEL, mode=mode, goal_id=goal_id)
        return reports[0] if reports else {
            "goal_id": goal_id, "team": goal.team, "minute": goal.minute,
            "summary": "No cause summary is available for this goal.", "source": "sweep",
            "alpha": None, "hypotheses": [],
        }

    return _cached(("hypotheses", goal_id, mode, _match_version(events)), build)


@app.get("/momentum")
def momentum_report(mode: str = "auto"):
    """The biggest jumps in the win-probability line, each with the claims tested for it."""
    events, _ = _match_data()
    return _cached(("momentum", mode, _match_version(events)),
                   lambda: momentum_swings(events, model=MODEL, mode=mode))


@app.get("/validation")
def validation():
    """Return the latest persisted real-match validation report, if available."""
    report_path = Path(os.getenv("VALIDATION_REPORT_FILE", "data/validation_report.json"))
    if not report_path.is_file():
        return {
            "available": False,
            "source": "StatsBomb Open Data",
            "matches": 0,
            "reason": "Run scripts/validate_on_statsbomb.py on downloaded match files to create this report.",
        }
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"available": False, "source": "StatsBomb Open Data", "matches": 0,
                "reason": "The validation report could not be read; rerun the validation script."}
    return report


@app.get("/ask")
def ask(q: str = Query(..., max_length=300), lang: str = "en", mode: str = "auto",
        prev: str | None = Query(default=None, max_length=300)):
    """Answer a free-form question from the match facts. mode=rules skips the model (for side-by-side).

    `prev` is the question before this one: it lets a follow-up like "and in the second half?" be
    read against the question it follows.
    """
    events, found = _match_data()
    return ask_answer(events, found, q, lang=lang, mode=mode, model=MODEL, previous=prev)


@app.get("/health")
def health():
    configured = bool(os.getenv("NVIDIA_API_KEY") and MODEL)
    status = model_status()
    return {
        "status": "ok",
        "source": _data_source(),
        "llm_configured": configured,
        "languages": LANGS,
        "model": MODEL,
        "narration": (
            "templates only" if not configured
            else "paused" if status["paused"]
            else "degraded" if status["last_error"] and status["consecutive_failures"]
            else "model"
        ),
        "model_status": status,
    }


@app.get("/events")
def events():
    return [e.model_dump(mode="json") for e in _current_events()]


@app.get("/match")
def match():
    return {**match_info(_current_events()), "source": _data_source()}


def _check_token(token: str | None) -> None:
    if INGEST_TOKEN and token != INGEST_TOKEN:
        raise HTTPException(status_code=401, detail="Missing or wrong X-Ingest-Token")


def _accept(event: MatchEvent) -> dict:
    """Add one event to the live match. Repeats are ignored; events must arrive in clock order."""
    if event.id in _live_ids:
        return {"status": "duplicate", "event_id": event.id, "queue_size": len(live_match_events)}
    if live_match_events and event.minute < live_match_events[-1].minute:
        raise HTTPException(status_code=409, detail="Event is older than the last one received; "
                                                    "send events in clock order")
    live_match_events.append(event)
    _live_ids.add(event.id)
    return {"status": "success", "event_id": event.id, "queue_size": len(live_match_events)}


@app.post("/events")
def ingest_event(event: MatchEvent, x_ingest_token: str | None = Header(default=None)):
    """Push one event (our own format: x, y 0-100 from the team's own goal line) into the live match."""
    _check_token(x_ingest_token)
    return _accept(event)


@app.post("/events/official")
def ingest_official(raw: dict, x_ingest_token: str | None = Header(default=None)):
    """Push one event in the official feed format (120x80 pitch, with `period`); it is converted for you."""
    _check_token(x_ingest_token)
    try:
        event = from_official(raw)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Not a valid official event: {exc}")
    return _accept(event)


@app.post("/live/end")
def live_end(x_ingest_token: str | None = Header(default=None)):
    """Tell the stream the live match is over (it then sends the `done` message)."""
    _check_token(x_ingest_token)
    _live_state["ended"] = True
    return {"status": "ended", "events": len(live_match_events)}


@app.post("/live/reset")
def live_reset(x_ingest_token: str | None = Header(default=None)):
    """Forget the live match and go back to the match file."""
    _check_token(x_ingest_token)
    live_match_events.clear()
    _live_ids.clear()
    _live_state["ended"] = False
    return {"status": "reset"}


@app.get("/live/status")
def live_status():
    return {"live": bool(live_match_events), "events": len(live_match_events), "ended": _live_state["ended"]}


@app.get("/insights")
def insights(mode: str = "fan", club: list[str] = Query(default=[]),
             player: list[str] = Query(default=[]), metric: str | None = None):
    """Stored insights, optionally ranked for a viewer: favourite club, player and metric first."""
    rows = store.list_insights()
    if not (club or player or metric or mode != "fan"):
        return rows
    events, found = _match_data()
    return rank_insights(rows, resolve(parse_profile(mode, club, player, metric), events, found))


@app.get("/insights/history")
def insights_history(team: str | None = None, limit: int = 20):
    """Saved insights from the database. Example: /insights/history?team=Reds&limit=5"""
    return get_insights(team=team, limit=limit)
_recap_cache: dict[tuple, dict] = {}     # (language, insight ids) -> finished AI recap


@app.get("/recap")
def recap(lang: str = "en"):
    """Return a grounded AI summary including the standout player when available."""
    events, found = _match_data()
    # The recap explains the RESULT: every goal traced to its cause, then each team's biggest problem.
    reasons = why_they_won(events, found)["reasons"]
    parts = [reason["text"] for reason in reasons]
    ids = [reason["insight_id"] or reason["evidence"][0] for reason in reasons]
    moments = [{"minute": int(reason["minute"]), "team": reason["team"], "what": reason["text"]}
               for reason in reasons]
    teams: list[str] = []
    for name in dict.fromkeys(event.team for event in events):
        report = assess_team(events, name)
        if report and report["verdict"] != "too little play to judge":
            line = f"{name} were {report['verdict']}."
            if report["issues"]:
                line += f" Biggest problem: {report['issues'][0]['detail']}"
            teams.append(line)
    parts += teams
    factors = [f["detail"] for f in match_factors(events)[:4]]
    parts = factors + parts

    info = match_info(events)
    home = info.get("home")
    away = info.get("away")
    scores = info.get("score", {})

    if not home or not away:
        team_names = list(dict.fromkeys(event.team for event in events if event.team))
        home = home or (team_names[0] if team_names else "Home")
        away = away or (team_names[1] if len(team_names) > 1 else "Away")
    scores.setdefault(home, 0)
    scores.setdefault(away, 0)

    headline = f"Full time: {home} {scores.get(home, 0)}-{scores.get(away, 0)} {away}."

    players = player_table(events, found)
    top_player = players[0] if players else None

    standout_key = tuple(top_player.get(key) for key in ("name", "team", "goals", "rating")) if top_player else None
    key = (lang, tuple(ids), standout_key, tuple(teams), tuple(factors))

    if key in _recap_cache:
        return _recap_cache[key]

    if ids and MODEL and os.getenv("NVIDIA_API_KEY") and model_available():
        try:
            summary = write_recap(
                MODEL, lang, info["score"], moments, top_player=top_player, teams=teams,
                factors=factors
            )
            result = {"lang": lang, "text": f"{headline} {summary}".strip(), "insight_ids": ids}
            _recap_cache[key] = result
            return result
        except Exception as exc:
            print(f"[DEBUG] AI recap failed ({exc}); using the plain join")

    return {"lang": lang, "text": " ".join(([headline] if headline else []) + parts), "insight_ids": ids}


async def _live_events(poll: float = 0.05):
    """Yield live events as they are pushed in, in order, until /live/end."""
    index = 0
    while True:
        if index > len(live_match_events):          # the live match was reset under us
            return
        if index < len(live_match_events):
            yield live_match_events[index]
            index += 1
        elif _live_state["ended"]:
            return
        else:
            await asyncio.sleep(poll)


def _pending_insights(buffer: list[MatchEvent], recent_events: list[MatchEvent],
                      claimed: dict[tuple[str, str], set[str]]) -> list:
    """The new insights in this window, with the cause each narration must explain."""
    pending = []
    for insight in detect_all(recent_events):
        # Report each stretch of play once per kind and team. A later pass over the same events
        # (the 5-minute window trims the start, or a spell grows by one shot) shares evidence.
        used = claimed.setdefault((insight.kind, insight.team), set())
        if used & set(insight.evidence):
            continue
        used.update(insight.evidence)
        attach_why(buffer, insight)
        pending.append(insight)
    return pending


async def _event_source(delay: float, seconds_per_minute: float | None, source: str = "file"):
    claimed: dict[tuple[str, str], set[str]] = {}    # (kind, team) -> evidence ids already reported
    buffer: list[MatchEvent] = []
    if source == "live":
        feed = _live_events()
    else:
        match = load_events(EVENTS_FILE)
        register_players(e.player for e in match)
        feed = replay(match, delay, seconds_per_minute)
    async for event in feed:
        register_players([event.player])
        buffer.append(event)
        payload = event.model_dump(mode="json")
        store.add_event(payload)
        yield f"event: tick\ndata: {json.dumps(payload)}\n\n"
        if event.type in (EventType.SHOT, EventType.GOAL) or len(buffer) == 1:
            prediction = win_probability(buffer)
            if prediction.get("available"):
                yield f"event: prediction\ndata: {json.dumps(prediction)}\n\n"

        # Only the last 5 minutes of action go to the detectors
        recent_events = [e for e in buffer if e.minute >= event.minute - 5.0]

        pending = _pending_insights(buffer, recent_events, claimed)

        if pending:
            # This tick's captions are independent, so run them together and wait for the slowest
            # one instead of for all of them in turn. Emit in match order. The LLM call blocks, so
            # it goes off the event loop thread.
            limit = asyncio.Semaphore(MAX_PARALLEL_NARRATIONS)

            async def caption(insight):
                async with limit:
                    return await asyncio.to_thread(narrate_all, client, MODEL, insight, LANGS)

            narrations = await asyncio.gather(*(caption(insight) for insight in pending))
            for insight, narration in zip(pending, narrations):
                insight.narration = narration
                data = insight.to_dict()
                data["chain"] = chain_for(buffer, insight)
                store.add_insight(data)
                yield f"data: {json.dumps(data)}\n\n"

    yield "event: done\ndata: {}\n\n"


@app.get("/stream")
async def stream(speed: float | None = None, delay: float = REPLAY_DELAY, source: str = "file"):
    if speed is not None:
        speed = min(max(speed, 0.0), 5.0)
    return StreamingResponse(
        _event_source(delay, speed, "live" if source == "live" else "file"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Serve the built React frontend (web/dist) when present (e.g. inside Docker).
# Must stay LAST so it does not shadow the API routes above.
dist_path = Path("web/dist")
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="web")


# ---- warm-up --------------------------------------------------------------------------------
# The first replay used to wait for all nine captions. They are pure functions of the match, so
# one background pass at start-up fills the SQLite narration cache; every later replay (and every
# restart) then reads them instead of calling the model. Only the cache is written: the insights
# history stays empty until the replay actually runs.
def _all_insights(events: list[MatchEvent]) -> list:
    """Every insight the replay would report, in order, with its cause attached."""
    buffer: list[MatchEvent] = []
    claimed: dict[tuple[str, str], set[str]] = {}
    out = []
    for event in events:
        buffer.append(event)
        recent = [e for e in buffer if e.minute >= event.minute - 5.0]
        out.extend(_pending_insights(buffer, recent, claimed))
    return out


def _warm_captions() -> None:
    """Fill the caption cache in the background so the first replay is already fast."""
    if not (MODEL and os.getenv("NVIDIA_API_KEY")):
        return
    try:
        insights = _all_insights(_current_events())
        missing = [i for i in insights if get_existing_narration(i.id, LANGS[0]) is None]
        if not missing:
            return
        started = time.perf_counter()
        with ThreadPoolExecutor(max_workers=MAX_PARALLEL_NARRATIONS) as pool:
            list(pool.map(
                lambda i: narrate_all(client, MODEL, i, LANGS, save_history=False, record=False), missing
            ))
        # A failed warm-up must not pause the model for the live path, so it does not count towards
        # the breaker. Report what actually landed: the rest is retried on the next start.
        left = [i for i in missing if get_existing_narration(i.id, LANGS[0]) is None]
        print(f"[DEBUG] warmed {len(missing) - len(left)}/{len(missing)} missing captions in "
              f"{time.perf_counter() - started:.1f}s "
              f"({len(insights) - len(left)}/{len(insights)} of the match cached)")
    except Exception as exc:
        print(f"[DEBUG] caption warm-up skipped ({exc})")


if os.getenv("WARM_CACHE", "1").strip().lower() not in ("0", "false", "no", "off"):
    Thread(target=_warm_captions, name="caption-warmup", daemon=True).start()
