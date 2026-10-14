"""FastAPI service.

  GET /health     liveness + whether an LLM is configured
  GET /events     the match events we replay
  GET /insights   insights stored so far
  GET /stream     Server-Sent Events: replays the match and pushes insights live
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
from .db import init_db, get_insights
from .events import MatchEvent

from app.detectors import detect_all
from app.events import load_events
from app.narrator import make_client, narrate_all
from app.simulate import replay
from app.store import OmniPitchStore

load_dotenv()

EVENTS_FILE = os.getenv("EVENTS_FILE", "data/sample_match.json")
REPLAY_DELAY = float(os.getenv("REPLAY_DELAY", "0.5"))
LANGS = [c.strip() for c in os.getenv("NARRATION_LANGS", "en").split(",") if c.strip()]
MODEL = os.getenv("NVIDIA_MODEL")

app = FastAPI(title="Why It Happened")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                    "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Swap InsightStore for OmniPitchStore to handle both insights and raw events
store = OmniPitchStore(os.getenv("DB_PATH", ":memory:"))
client = make_client()
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
    # Use the renamed list_insights() method
    return store.list_insights()


async def _event_source(delay: float):
    seen: set[str] = set()
    async for event in replay(load_events(EVENTS_FILE), delay):
        # 2. Save the incoming raw event to SQLite immediately
        store.add_event(event.model_dump(mode="json"))
        
        # 3. Query the store for the last 5 minutes of match action
        recent_dicts = store.get_recent_events(event.minute, window_minutes=5.0)
        recent_events = [MatchEvent(**r) for r in recent_dicts]
        
        # 4. Pass only the recent events to the detectors instead of an endlessly growing in-memory buffer
        for insight in detect_all(recent_events):
            if insight.id in seen:
                continue
            seen.add(insight.id)
            
            insight.narration = await asyncio.to_thread(narrate_all, client, MODEL, insight, LANGS)
            data = insight.to_dict()
            
            # 5. Save the generated AI narrative to SQLite
            store.add_insight(data)
            yield f"data: {json.dumps(data)}\n\n"
            
    yield "event: done\ndata: {}\n\n"


@app.get("/stream")
async def stream(delay: float = REPLAY_DELAY):
    store.clear()
    return StreamingResponse(
        _event_source(delay),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if Path("web/dist").exists():
    app.mount("/", StaticFiles(directory="web/dist", html=True), name="web")

@app.get("/insights")
def fetch_historical_insights(team: str = None, limit: int = 20):
    """
    REST endpoint for querying past insights.
    Example: /insights?team=Arsenal&limit=5
    """
    try:
        data = get_insights(team=team, limit=limit)
        return {"status": "success", "count": len(data), "data": data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
