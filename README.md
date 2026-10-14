# Why It Happened

An AI match-insights engine for the *Inside the Game: Developer Hackathon* (Microsoft x Premier League).
It reads a stream of synthetic football events, detects tactical moments with deterministic rules
(starting with counter-attacks), and explains each one in plain language, in several languages,
**with the exact events cited as evidence**.

- Rules find, the LLM explains. The model only writes words; it never decides what happened.
- Every narration ends with evidence ids. If the model cites an id that does not exist, we fall back to a template.
- Works with no API key (template narration), so development and demos never block on the model.

## Stack

Python 3.11+ / FastAPI / SQLite, NVIDIA-hosted LLM (OpenAI-compatible API), React + TypeScript (Vite), Azure Container Apps for hosting.

## Quick start (backend)

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # Windows: copy .env.example .env   (then fill in NVIDIA_API_KEY / NVIDIA_MODEL)
pytest -q
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs, then http://localhost:8000/stream to watch insights arrive.
Check the model works with `python scripts/smoke_nvidia.py`.

## Frontend

```bash
npm create vite@latest web -- --template react-ts
cp frontend-starter/types.ts frontend-starter/useInsightStream.ts frontend-starter/App.tsx web/src/
cd web && npm install && npm run dev      # http://localhost:5173
```

## Layout

```
app/            FastAPI service: events, detectors, narrator, store, simulate, main
data/           sample match events (replace with the official synthetic data)
tests/          pytest
scripts/        smoke_nvidia.py
frontend-starter/  starter files to copy into web/src
web/            Vite + React + TypeScript app (created by you, see above)
```

## Endpoints

| Path | What |
|------|------|
| `GET /health` | status, whether an LLM is configured |
| `GET /events` | the events being replayed |
| `GET /insights` | insights stored so far |
| `GET /stream` | Server-Sent Events: replays the match, pushes insights live |

## Status

Backbone only. Next: official data adapter (`app/events.py: from_official`), second detector, dashboard, deploy.
