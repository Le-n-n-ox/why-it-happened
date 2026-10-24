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

On start-up the backend warms the caption cache in the background: nine short model calls the first
time a match is seen, none afterwards (the cache lives in SQLite). That way the first replay is
already as fast as the second. Set `WARM_CACHE=0` to turn it off.

## Frontend

```bash
cd web && npm install && npm run dev      # http://localhost:5173
```

The Vite dev server proxies the API to `http://127.0.0.1:8001` (see `web/vite.config.ts`);
set `VITE_API_URL` when the frontend and the API are on different origins.

### Pages

| Route | What it shows |
| ----- | ------------- |
| `#/` | Live: the pitch, the ball, and insights as they are detected |
| `#/result` | Why the result happened, with the tested claims behind each goal and a different brief for each audience |
| `#/recap` | Every insight by minute, plus the full-time recap |
| `#/momentum` | The biggest swings in the win-probability line, and the claims tested for each |
| `#/halftime` | What the first half showed for each team, and what to watch |
| `#/ask` | Ask the match a question; compares the model answer with the rules answer, and follows up on the last question |
| `#/positions` | Where each player was last seen, with a minute scrubber |
| `#/teams`, `#/team/{name}` | Team report, tactics, formation estimate, second-half story, whole-match claims |
| `#/players`, `#/player/{id}` | Ratings, breakdowns, reviews, heatmaps, side-by-side comparison |
| `#/fouls` | Every foul, its situation and what followed |
| `#/analytics` | Team metrics, where each team attacks from, player ranking |
| `#/announcers` | The on-air line, your personal cue sheet and overlay timeline, a live cue sheet, and the proof to fact-check |
| `#/fans` | Follow a team, cheer a moment, and see your match: mode, player, one metric and a timed overlay |
| `#/history` | Insights saved in the database |
| `#/about` | How it works, for judges |

`API_REFERENCE.md` maps every backend endpoint to the page that uses it.

## Layout

```
app/            FastAPI service: events, detectors, narrator, store, simulate, main
data/           sample match events (replace with the official synthetic data)
tests/          pytest
scripts/        smoke_nvidia.py
frontend-starter/  starter files to copy into web/src
web/            Vite + React + TypeScript app
```

## Endpoints

| Path              | What                                                        |
| ----------------- | ----------------------------------------------------------- |
| `GET /health`   | status, whether an LLM is configured                        |
| `GET /events`   | the events being replayed                                   |
| `GET /insights` | insights stored so far; ranked for a profile when given `club`, `player`, `mode` or `metric` |
| `GET /insights/history` | the insights saved in the database                    |
| `GET /stream`   | Server-Sent Events: replays the match, pushes insights live |
| `GET /why`      | why the result happened, with the football reasons          |
| `GET /voices`   | one match, a different brief per audience (`mode`, `club`, `player`, `metric`, `lang`) |
| `GET /brief`    | the rules-only side of the story for one profile; no model call |
| `GET /overlay`  | timed, machine-readable cards for a live graphical overlay  |
| `GET /ask`      | a question answered from the match facts                    |
| `GET /positions` | where each player was last seen                            |
| `GET /goals/{id}/hypotheses` | the claims tested for one goal                  |

`API_REFERENCE.md` has the full contract and maps every endpoint to the page that uses it.

## Status

Backbone only. Next: official data adapter (`app/events.py: from_official`), second detector, dashboard, deploy.
