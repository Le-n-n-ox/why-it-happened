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
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.assessment import assess_team, assessment_insight
from app.ask import answer as ask_answer
from app.causes import (attach_why, causal_chains, chain_for, explain_event, foul_explanations,
                        turning_points, why_they_won)
from app.db import get_insights, init_db
from app.detectors import detect_all
from app.events import EventType, MatchEvent, from_official, load_events
from app.hypotheses import hypotheses as goal_hypotheses
from app.matchinfo import match_info
from app.players import involvement, player_actions, player_stats, player_table, rating, review_insight
from app.positions import positions as player_positions
from app.narrator import (make_client, model_available, model_status, narrate_all, register_players,
                          write_recap)
from app.simulate import replay
from app.tactics import (factors_summary, match_factors, pass_quality, tactical_report,
                         tactics_insight, win_probability, win_timeline)
from app.store import OmniPitchStore

load_dotenv()

EVENTS_FILE = os.getenv("EVENTS_FILE", "data/sample_match.json")
REPLAY_DELAY = float(os.getenv("REPLAY_DELAY", "0.5"))
LANGS = [c.strip() for c in os.getenv("NARRATION_LANGS", "en").split(",") if c.strip()]
MODEL = os.getenv("NVIDIA_MODEL")

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


@app.get("/team/{team}/assessment")
def team_assessment(team: str, lang: str = "en"):
    """How well a team played, the evidence for it, and what it should change."""
    events, _ = _match_data()
    name = next((e.team for e in events if e.team.casefold() == team.casefold()), None)
    report = assess_team(events, name) if name else None
    if report is None:
        raise HTTPException(status_code=404, detail="Unknown team")
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
    insight = tactics_insight(events, name)
    narration = narrate_all(client, MODEL, insight, [lang])
    used = lang if lang in narration else "en"
    return {
        **report,
        "lang": used,
        "text": narration.get(used) or next(iter(narration.values())),
        "evidence": insight.evidence,
    }


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
    reports = goal_hypotheses(events, found, model=MODEL, mode=mode, goal_id=goal_id)
    return reports[0] if reports else {
        "goal_id": goal_id, "team": goal.team, "minute": goal.minute,
        "summary": "No cause summary is available for this goal.", "source": "sweep",
        "alpha": None, "hypotheses": [],
    }


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
def ask(q: str = Query(..., max_length=300), lang: str = "en", mode: str = "auto"):
    """Answer a free-form question from the match facts. mode=rules skips the model (for side-by-side)."""
    events, found = _match_data()
    return ask_answer(events, found, q, lang=lang, mode=mode, model=MODEL)


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
def insights():
    return store.list_insights()


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

        for insight in detect_all(recent_events):
            # Report each stretch of play once per kind and team. A later pass over the same events
            # (the 5-minute window trims the start, or a spell grows by one shot) shares evidence.
            used = claimed.setdefault((insight.kind, insight.team), set())
            if used & set(insight.evidence):
                continue
            used.update(insight.evidence)

            attach_why(buffer, insight)      # the cause the narration must explain

            # The LLM call blocks, so run it off the event loop thread
            insight.narration = await asyncio.to_thread(
                narrate_all, client, MODEL, insight, LANGS
            )

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
