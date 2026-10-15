"""FastAPI service for Why It Happened.

  GET  /health            liveness + whether an LLM is configured
  GET  /events            the match events we replay
  POST /events            ingest one live match event
  GET  /insights          insights stored so far (current stream)
  GET  /insights/history  saved insights from the database (?team=&limit=)
  GET  /recap             full-time recap text (?lang=)
  GET  /stream            Server-Sent Events: replays the match and pushes insights live
"""
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.db import get_insights, init_db
from app.detectors import detect_all
from app.events import MatchEvent, load_events
from app.narrator import make_client, narrate_all
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


@app.on_event("startup")
def on_startup():
    print("[DEBUG] Initializing database...")
    init_db()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": bool(os.getenv("NVIDIA_API_KEY") and MODEL),
        "languages": LANGS,
    }


@app.get("/events")
def events():
    return [e.model_dump(mode="json") for e in load_events(EVENTS_FILE)]


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


@app.get("/recap")
def recap(lang: str = "en"):
    """Plain join of the narrations in match order (not an AI-written recap).

    Falls back to English, then to any language, per insight. The frontend shows
    its own key-moments list when `text` is empty.
    """
    items = sorted(store.list_insights(), key=lambda i: i.get("minute", 0))
    parts: list[str] = []
    ids: list[str] = []
    for i in items:
        narration = i.get("narration") or {}
        if not isinstance(narration, dict):
            continue
        text = narration.get(lang) or narration.get("en") or next(iter(narration.values()), "")
        if text:
            parts.append(text)
            ids.append(i.get("id", ""))
    return {"lang": lang, "text": " ".join(parts), "insight_ids": ids}


async def _event_source(delay: float):
    seen: set[str] = set()
    async for event in replay(load_events(EVENTS_FILE), delay):
        # Save the incoming raw event
        store.add_event(event.model_dump(mode="json"))

        # Only the last 5 minutes of action go to the detectors
        recent_dicts = store.get_recent_events(event.minute, window_minutes=5.0)
        recent_events = [MatchEvent(**r) for r in recent_dicts]

        for insight in detect_all(recent_events):
            if insight.id in seen:
                continue
            seen.add(insight.id)

            # The LLM call blocks, so run it off the event loop thread
            insight.narration = await asyncio.to_thread(
                narrate_all, client, MODEL, insight, LANGS
            )

            data = insight.to_dict()
            store.add_insight(data)
            yield f"data: {json.dumps(data)}\n\n"

    yield "event: done\ndata: {}\n\n"


@app.get("/stream")
async def stream(delay: float = REPLAY_DELAY):
    store.clear()
    return StreamingResponse(
        _event_source(delay),
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