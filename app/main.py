"""FastAPI service for Why It Happened.

  GET  /health            liveness + whether an LLM is configured
  GET  /events            the match events we replay
  POST /events            ingest one live match event
  GET  /insights          insights stored so far (current stream)
  GET  /insights/history  saved insights from the database (?team=&limit=)
  GET  /recap             full-time recap text (?lang=)
  GET  /players            player summaries derived from match events
  GET  /players/{id}       one player's details
  GET  /players/{id}/review written review placeholder (?lang=)
  GET  /stream            Server-Sent Events: replays the match and pushes insights live
"""
import asyncio
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.assessment import assess_team, assessment_insight
from app.causes import (attach_why, causal_chains, chain_for, explain_event, foul_explanations,
                        turning_points, why_they_won)
from app.db import get_insights, init_db
from app.detectors import detect_all
from app.events import MatchEvent, load_events
from app.matchinfo import match_info
from app.players import involvement, player_actions, player_stats, player_table, rating, review_insight
from app.narrator import (make_client, model_available, model_status, narrate_all, register_players,
                          write_recap)
from app.simulate import replay
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
live_match_events: list[MatchEvent] = []


init_db()        # at import, so it also runs under TestClient
store.clear()    # start clean once per server start (not on every /stream)


def _match_data():
    """Load the full match, independent of the live stream's rolling window."""
    events = load_events(EVENTS_FILE)
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


@app.get("/fouls")
def fouls():
    """Every foul with the situation around it and what followed."""
    events, found = _match_data()
    return foul_explanations(events, found)


@app.get("/why")
def match_why():
    events, found = _match_data()
    return {
        "result": why_they_won(events, found),
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
    return result


@app.get("/health")
def health():
    configured = bool(os.getenv("NVIDIA_API_KEY") and MODEL)
    status = model_status()
    return {
        "status": "ok",
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
    return [e.model_dump(mode="json") for e in load_events(EVENTS_FILE)]


@app.get("/match")
def match():
    return match_info(load_events(EVENTS_FILE))


@app.post("/events")
def ingest_event(event: MatchEvent):
    """Webhook to ingest live match data via POST."""
    live_match_events.append(event)
    return {"status": "success", "event_id": event.id, "queue_size": len(live_match_events)}


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

    info = match_info(events)

    headline = ""
    if info["home"] and info["away"]:
        s = info["score"]
        headline = f"Full time: {info['home']} {s[info['home']]}-{s[info['away']]} {info['away']}."


    players = player_table(events, found)
    top_player = players[0] if players else None

    standout_key = tuple(top_player.get(key) for key in ("name", "team", "goals", "rating")) if top_player else None
    key = (lang, tuple(ids), standout_key, tuple(teams))

    if key in _recap_cache:
        return _recap_cache[key]
    if ids and MODEL and os.getenv("NVIDIA_API_KEY") and model_available():
        try:
            summary = write_recap(
                MODEL, lang, info["score"], moments, top_player=top_player, teams=teams
            )
            result = {"lang": lang, "text": f"{headline} {summary}".strip(), "insight_ids": ids}
            _recap_cache[key] = result
            return result
        except Exception as exc:
            print(f"[DEBUG] AI recap failed ({exc}); using the plain join")
    return {"lang": lang, "text": " ".join(([headline] if headline else []) + parts), "insight_ids": ids}


async def _event_source(delay: float, seconds_per_minute: float | None):
    claimed: dict[tuple[str, str], set[str]] = {}    # (kind, team) -> evidence ids already reported
    buffer: list[MatchEvent] = []
    match = load_events(EVENTS_FILE)
    register_players(event.player for event in match)
    async for event in replay(match, delay, seconds_per_minute):
        buffer.append(event)
        payload = event.model_dump(mode="json")
        store.add_event(payload)
        yield f"event: tick\ndata: {json.dumps(payload)}\n\n"

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
async def stream(speed: float | None = None, delay: float = REPLAY_DELAY):
    if speed is not None:
        speed = min(max(speed, 0.0), 5.0)
    return StreamingResponse(
        _event_source(delay, speed),
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
