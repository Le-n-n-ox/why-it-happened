"""FastAPI service for Why It Happened.

  GET /health     liveness + whether an LLM is configured
  GET /events     the match events we replay
  GET /insights   insights stored so far
  GET /stream     Server-Sent Events: replays the match and pushes insights live

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
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

from app.detectors import detect_all
from app.events import load_events
from app.narrator import make_client, narrate_all
from app.simulate import replay
from app.store import InsightStore

load_dotenv()

EVENTS_FILE = os.getenv("EVENTS_FILE", "data/sample_match.json")
REPLAY_DELAY = float(os.getenv("REPLAY_DELAY", "0.5"))
LANGS = [c.strip() for c in os.getenv("NARRATION_LANGS", "en").split(",") if c.strip()]
MODEL = os.getenv("NVIDIA_MODEL")

# Allowed origins for CORS (supports Vite dev server on any localhost/127.0.0.1 port or env override)
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

store = InsightStore(os.getenv("DB_PATH", ":memory:"))
client = make_client()  # None when NVIDIA_API_KEY is not set -> template narration


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": client is not None and bool(MODEL),
        "languages": LANGS,
    }


@app.get("/events")
def events():
    return [e.model_dump(mode="json") for e in load_events(EVENTS_FILE)]


@app.get("/insights")
def insights():
    return store.list()


async def _event_source(delay: float):
    seen: set[str] = set()
    buffer = []
    async for event in replay(load_events(EVENTS_FILE), delay):
        buffer.append(event)
        for insight in detect_all(buffer):
            if insight.id in seen:
                continue
            seen.add(insight.id)
            # The LLM call blocks, so run off the main event loop thread
            insight.narration = await asyncio.to_thread(
                narrate_all, insight, client, MODEL, LANGS
            )
            data = insight.to_dict()
            store.add(data)
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


# Serve built React frontend (web/dist) when present (e.g. inside Docker container)[cite: 4]
# Must stay LAST so it does not shadow API routes above
dist_path = Path("web/dist")
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="web")