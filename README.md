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
cd web && npm install && npm run dev      # http://localhost:5173
```

The Vite dev server proxies the API to `http://127.0.0.1:8001` (see `web/vite.config.ts`);
set `VITE_API_URL` when the frontend and the API are on different origins.

### Pages

| Route | What it shows |
| ----- | ------------- |
| `#/` | Live: the pitch, the ball, and insights as they are detected |
| `#/result` | Why the result happened, with the tested claims behind each goal |
| `#/recap` | Every insight by minute, plus the full-time recap |
| `#/ask` | Ask the match a question; compares the model answer with the rules answer |
| `#/positions` | Where each player was last seen, with a minute scrubber |
| `#/teams`, `#/team/{name}` | Team report, tactics, formation estimate, second-half story |
| `#/players`, `#/player/{id}` | Ratings, breakdowns, reviews, heatmaps, side-by-side comparison |
| `#/fouls` | Every foul, its situation and what followed |
| `#/analytics` | Team metrics, where each team attacks from, player ranking |
| `#/announcers` | The on-air line, a cue sheet and the proof to fact-check |
| `#/fans` | Follow a team, cheer a moment, share it |
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
| `GET /insights` | insights stored so far                                      |
| `GET /insights/history` | the insights saved in the database                    |
| `GET /stream`   | Server-Sent Events: replays the match, pushes insights live |
| `GET /why`      | why the result happened, with the football reasons          |
| `GET /ask`      | a question answered from the match facts                    |
| `GET /positions` | where each player was last seen                            |
| `GET /goals/{id}/hypotheses` | the claims tested for one goal                  |

`API_REFERENCE.md` has the full contract and maps every endpoint to the page that uses it.

## Status

Backbone only. Next: official data adapter (`app/events.py: from_official`), second detector, dashboard, deploy.

```
why-it-happened
├─ .dockerignore
├─ .venv-1
│  ├─ Include
│  ├─ Lib
│  │  └─ site-packages
│  │     ├─ annotated_doc
│  │     │  └─ py.typed
│  │     ├─ annotated_doc-0.0.5.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ annotated_types
│  │     │  └─ py.typed
│  │     ├─ annotated_types-0.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ anyio
│  │     │  ├─ abc
│  │     │  ├─ py.typed
│  │     │  ├─ streams
│  │     │  ├─ _backends
│  │     │  └─ _core
│  │     ├─ anyio-4.15.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ azure
│  │     │  ├─ core
│  │     │  │  ├─ pipeline
│  │     │  │  │  ├─ policies
│  │     │  │  │  └─ transport
│  │     │  │  ├─ polling
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ rest
│  │     │  │  ├─ tracing
│  │     │  │  │  └─ ext
│  │     │  │  └─ utils
│  │     │  └─ cosmos
│  │     │     ├─ aio
│  │     │     ├─ py.typed
│  │     │     ├─ _change_feed
│  │     │     │  └─ aio
│  │     │     ├─ _execution_context
│  │     │     │  └─ aio
│  │     │     ├─ _query_advisor
│  │     │     │  └─ query_advice_rules.json
│  │     │     └─ _routing
│  │     │        └─ aio
│  │     ├─ azure_core-1.41.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ azure_cosmos-4.17.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ certifi
│  │     │  ├─ cacert.pem
│  │     │  ├─ py.typed
│  │     │  └─ tests
│  │     ├─ certifi-2026.7.22.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ charset_normalizer
│  │     │  ├─ cli
│  │     │  └─ py.typed
│  │     ├─ charset_normalizer-3.5.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ click
│  │     │  └─ py.typed
│  │     ├─ click-8.5.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ colorama
│  │     │  └─ tests
│  │     ├─ colorama-0.4.6.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ dotenv
│  │     │  └─ py.typed
│  │     ├─ fastapi
│  │     │  ├─ .agents
│  │     │  │  └─ skills
│  │     │  │     └─ fastapi
│  │     │  │        ├─ references
│  │     │  │        │  ├─ dependencies.md
│  │     │  │        │  ├─ other-tools.md
│  │     │  │        │  ├─ path-operations.md
│  │     │  │        │  ├─ pydantic.md
│  │     │  │        │  ├─ responses.md
│  │     │  │        │  └─ streaming.md
│  │     │  │        └─ SKILL.md
│  │     │  ├─ dependencies
│  │     │  ├─ middleware
│  │     │  ├─ openapi
│  │     │  ├─ py.typed
│  │     │  ├─ security
│  │     │  ├─ telemetry
│  │     │  └─ _compat
│  │     ├─ fastapi-0.143.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ h11
│  │     │  └─ py.typed
│  │     ├─ h11-0.16.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ httpcore
│  │     │  ├─ py.typed
│  │     │  ├─ _async
│  │     │  ├─ _backends
│  │     │  └─ _sync
│  │     ├─ httpcore-1.0.9.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ httpcore2
│  │     │  ├─ py.typed
│  │     │  ├─ _async
│  │     │  ├─ _backends
│  │     │  └─ _sync
│  │     ├─ httpcore2-2.13.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ httptools
│  │     │  ├─ parser
│  │     │  │  ├─ cparser.pxd
│  │     │  │  ├─ python.pxd
│  │     │  │  └─ url_cparser.pxd
│  │     │  └─ py.typed
│  │     ├─ httptools-0.9.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  └─ vendor
│  │     │  │     ├─ http-parser
│  │     │  │     │  └─ LICENSE-MIT
│  │     │  │     └─ llhttp
│  │     │  │        └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ httpx
│  │     │  ├─ py.typed
│  │     │  └─ _transports
│  │     ├─ httpx-0.28.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ httpx2
│  │     │  ├─ py.typed
│  │     │  ├─ websockets
│  │     │  └─ _transports
│  │     ├─ httpx2-2.13.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ idna
│  │     │  └─ py.typed
│  │     ├─ idna-3.20.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ iniconfig
│  │     │  └─ py.typed
│  │     ├─ iniconfig-2.3.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ jiter
│  │     │  └─ py.typed
│  │     ├─ jiter-0.17.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ jiter-python.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ openai
│  │     │  ├─ auth
│  │     │  ├─ helpers
│  │     │  ├─ lib
│  │     │  │  ├─ .keep
│  │     │  │  ├─ beta
│  │     │  │  │  └─ agents
│  │     │  │  ├─ live
│  │     │  │  │  └─ README.md
│  │     │  │  ├─ responses_websocket
│  │     │  │  │  └─ README.md
│  │     │  │  ├─ streaming
│  │     │  │  │  ├─ agents
│  │     │  │  │  ├─ chat
│  │     │  │  │  └─ responses
│  │     │  │  └─ _parsing
│  │     │  ├─ providers
│  │     │  ├─ py.typed
│  │     │  ├─ resources
│  │     │  │  ├─ admin
│  │     │  │  │  └─ organization
│  │     │  │  │     ├─ groups
│  │     │  │  │     ├─ projects
│  │     │  │  │     │  ├─ groups
│  │     │  │  │     │  ├─ service_accounts
│  │     │  │  │     │  └─ users
│  │     │  │  │     └─ users
│  │     │  │  ├─ audio
│  │     │  │  ├─ beta
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ environments
│  │     │  │  │  │  ├─ sessions
│  │     │  │  │  │  │  ├─ subagents
│  │     │  │  │  │  │  │  └─ turns
│  │     │  │  │  │  │  └─ turns
│  │     │  │  │  │  └─ vaults
│  │     │  │  │  ├─ chatkit
│  │     │  │  │  ├─ realtime
│  │     │  │  │  ├─ responses
│  │     │  │  │  └─ threads
│  │     │  │  │     └─ runs
│  │     │  │  ├─ chat
│  │     │  │  │  └─ completions
│  │     │  │  ├─ containers
│  │     │  │  │  └─ files
│  │     │  │  ├─ conversations
│  │     │  │  │  └─ api.md
│  │     │  │  ├─ evals
│  │     │  │  │  └─ runs
│  │     │  │  ├─ fine_tuning
│  │     │  │  │  ├─ alpha
│  │     │  │  │  ├─ checkpoints
│  │     │  │  │  └─ jobs
│  │     │  │  ├─ live
│  │     │  │  │  └─ api.md
│  │     │  │  ├─ realtime
│  │     │  │  │  ├─ api.md
│  │     │  │  │  └─ translations
│  │     │  │  ├─ responses
│  │     │  │  │  └─ api.md
│  │     │  │  ├─ safety
│  │     │  │  ├─ skills
│  │     │  │  │  └─ versions
│  │     │  │  ├─ uploads
│  │     │  │  ├─ vector_stores
│  │     │  │  └─ webhooks
│  │     │  │     └─ api.md
│  │     │  ├─ types
│  │     │  │  ├─ admin
│  │     │  │  │  └─ organization
│  │     │  │  │     ├─ groups
│  │     │  │  │     ├─ projects
│  │     │  │  │     │  ├─ groups
│  │     │  │  │     │  ├─ service_accounts
│  │     │  │  │     │  └─ users
│  │     │  │  │     └─ users
│  │     │  │  ├─ audio
│  │     │  │  ├─ beta
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ environments
│  │     │  │  │  │  ├─ sessions
│  │     │  │  │  │  │  ├─ subagents
│  │     │  │  │  │  │  │  └─ turns
│  │     │  │  │  │  │  └─ turns
│  │     │  │  │  │  └─ vaults
│  │     │  │  │  ├─ chat
│  │     │  │  │  ├─ chatkit
│  │     │  │  │  ├─ realtime
│  │     │  │  │  ├─ responses
│  │     │  │  │  └─ threads
│  │     │  │  │     └─ runs
│  │     │  │  ├─ chat
│  │     │  │  │  └─ completions
│  │     │  │  ├─ containers
│  │     │  │  │  └─ files
│  │     │  │  ├─ conversations
│  │     │  │  ├─ evals
│  │     │  │  │  └─ runs
│  │     │  │  ├─ fine_tuning
│  │     │  │  │  ├─ alpha
│  │     │  │  │  ├─ checkpoints
│  │     │  │  │  └─ jobs
│  │     │  │  ├─ graders
│  │     │  │  ├─ live
│  │     │  │  ├─ realtime
│  │     │  │  │  └─ translations
│  │     │  │  ├─ responses
│  │     │  │  ├─ safety
│  │     │  │  ├─ shared
│  │     │  │  ├─ shared_params
│  │     │  │  ├─ skills
│  │     │  │  │  └─ versions
│  │     │  │  ├─ uploads
│  │     │  │  ├─ vector_stores
│  │     │  │  └─ webhooks
│  │     │  ├─ _extras
│  │     │  ├─ _utils
│  │     │  └─ _vendor
│  │     │     └─ httpx_aiohttp
│  │     │        ├─ FORK.md
│  │     │        ├─ LICENSE
│  │     │        └─ README.md
│  │     ├─ openai-3.31.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ opentelemetry
│  │     │  ├─ attributes
│  │     │  │  └─ py.typed
│  │     │  ├─ baggage
│  │     │  │  ├─ propagation
│  │     │  │  └─ py.typed
│  │     │  ├─ context
│  │     │  │  └─ py.typed
│  │     │  ├─ environment_variables
│  │     │  │  └─ py.typed
│  │     │  ├─ metrics
│  │     │  │  ├─ py.typed
│  │     │  │  └─ _internal
│  │     │  ├─ propagate
│  │     │  │  └─ py.typed
│  │     │  ├─ propagators
│  │     │  │  └─ py.typed
│  │     │  ├─ py.typed
│  │     │  ├─ trace
│  │     │  │  ├─ propagation
│  │     │  │  └─ py.typed
│  │     │  ├─ util
│  │     │  │  └─ py.typed
│  │     │  ├─ version
│  │     │  │  └─ py.typed
│  │     │  └─ _logs
│  │     │     ├─ py.typed
│  │     │     ├─ severity
│  │     │     └─ _internal
│  │     ├─ opentelemetry_api-1.45.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ packaging
│  │     │  ├─ licenses
│  │     │  └─ py.typed
│  │     ├─ packaging-26.3.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  ├─ LICENSE.APACHE
│  │     │  │  └─ LICENSE.BSD
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ pip
│  │     │  ├─ py.typed
│  │     │  ├─ _internal
│  │     │  │  ├─ cli
│  │     │  │  ├─ commands
│  │     │  │  ├─ distributions
│  │     │  │  ├─ index
│  │     │  │  ├─ locations
│  │     │  │  ├─ metadata
│  │     │  │  │  └─ importlib
│  │     │  │  ├─ models
│  │     │  │  ├─ network
│  │     │  │  ├─ operations
│  │     │  │  │  ├─ build
│  │     │  │  │  └─ install
│  │     │  │  ├─ req
│  │     │  │  ├─ resolution
│  │     │  │  │  ├─ legacy
│  │     │  │  │  └─ resolvelib
│  │     │  │  ├─ utils
│  │     │  │  └─ vcs
│  │     │  └─ _vendor
│  │     │     ├─ cachecontrol
│  │     │     │  ├─ caches
│  │     │     │  ├─ LICENSE.txt
│  │     │     │  └─ py.typed
│  │     │     ├─ certifi
│  │     │     │  ├─ cacert.pem
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ dependency_groups
│  │     │     │  ├─ LICENSE.txt
│  │     │     │  └─ py.typed
│  │     │     ├─ distlib
│  │     │     │  ├─ LICENSE.txt
│  │     │     │  ├─ t32.exe
│  │     │     │  ├─ t64-arm.exe
│  │     │     │  ├─ t64.exe
│  │     │     │  ├─ w32.exe
│  │     │     │  ├─ w64-arm.exe
│  │     │     │  └─ w64.exe
│  │     │     ├─ distro
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ idna
│  │     │     │  ├─ LICENSE.md
│  │     │     │  └─ py.typed
│  │     │     ├─ msgpack
│  │     │     │  └─ COPYING
│  │     │     ├─ packaging
│  │     │     │  ├─ LICENSE
│  │     │     │  ├─ LICENSE.APACHE
│  │     │     │  ├─ LICENSE.BSD
│  │     │     │  ├─ licenses
│  │     │     │  └─ py.typed
│  │     │     ├─ pkg_resources
│  │     │     │  └─ LICENSE
│  │     │     ├─ platformdirs
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ pygments
│  │     │     │  ├─ filters
│  │     │     │  ├─ formatters
│  │     │     │  ├─ lexers
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ styles
│  │     │     ├─ pyproject_hooks
│  │     │     │  ├─ LICENSE
│  │     │     │  ├─ py.typed
│  │     │     │  └─ _in_process
│  │     │     ├─ README.rst
│  │     │     ├─ requests
│  │     │     │  └─ LICENSE
│  │     │     ├─ resolvelib
│  │     │     │  ├─ LICENSE
│  │     │     │  ├─ py.typed
│  │     │     │  └─ resolvers
│  │     │     ├─ rich
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ tomli
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ tomli_w
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ truststore
│  │     │     │  ├─ LICENSE
│  │     │     │  └─ py.typed
│  │     │     ├─ urllib3
│  │     │     │  ├─ contrib
│  │     │     │  │  └─ _securetransport
│  │     │     │  ├─ LICENSE.txt
│  │     │     │  ├─ packages
│  │     │     │  │  └─ backports
│  │     │     │  └─ util
│  │     │     └─ vendor.txt
│  │     ├─ pip-25.3.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ AUTHORS.txt
│  │     │  │  ├─ LICENSE.txt
│  │     │  │  └─ src
│  │     │  │     └─ pip
│  │     │  │        └─ _vendor
│  │     │  │           ├─ cachecontrol
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ certifi
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ dependency_groups
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ distlib
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ distro
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ idna
│  │     │  │           │  └─ LICENSE.md
│  │     │  │           ├─ msgpack
│  │     │  │           │  └─ COPYING
│  │     │  │           ├─ packaging
│  │     │  │           │  ├─ LICENSE
│  │     │  │           │  ├─ LICENSE.APACHE
│  │     │  │           │  └─ LICENSE.BSD
│  │     │  │           ├─ pkg_resources
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ platformdirs
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ pygments
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ pyproject_hooks
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ requests
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ resolvelib
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ rich
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ tomli
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ tomli_w
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ truststore
│  │     │  │           │  └─ LICENSE
│  │     │  │           └─ urllib3
│  │     │  │              └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ pluggy
│  │     │  └─ py.typed
│  │     ├─ pluggy-1.7.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ pydantic
│  │     │  ├─ deprecated
│  │     │  ├─ experimental
│  │     │  ├─ plugin
│  │     │  ├─ py.typed
│  │     │  ├─ v1
│  │     │  │  └─ py.typed
│  │     │  └─ _internal
│  │     ├─ pydantic-2.14.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ pydantic_core
│  │     │  ├─ py.typed
│  │     │  └─ _pydantic_core
│  │     ├─ pydantic_core-2.50.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ pydantic-core.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ pygments
│  │     │  ├─ filters
│  │     │  ├─ formatters
│  │     │  ├─ lexers
│  │     │  └─ styles
│  │     ├─ pygments-2.21.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ AUTHORS
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ pytest
│  │     │  └─ py.typed
│  │     ├─ pytest-9.1.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ python_dotenv-1.2.4.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ pyyaml-6.0.3.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ requests
│  │     │  └─ py.typed
│  │     ├─ requests-2.34.2.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  └─ NOTICE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ sniffio
│  │     │  ├─ py.typed
│  │     │  └─ _tests
│  │     ├─ sniffio-1.3.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ LICENSE
│  │     │  ├─ LICENSE.APACHE2
│  │     │  ├─ LICENSE.MIT
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ starlette
│  │     │  ├─ middleware
│  │     │  └─ py.typed
│  │     ├─ starlette-1.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ truststore
│  │     │  └─ py.typed
│  │     ├─ truststore-0.10.5.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ typing_extensions-4.16.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ typing_inspection
│  │     │  └─ py.typed
│  │     ├─ typing_inspection-0.4.4.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ urllib3
│  │     │  ├─ contrib
│  │     │  │  └─ emscripten
│  │     │  │     └─ emscripten_fetch_worker.js
│  │     │  ├─ http2
│  │     │  ├─ py.typed
│  │     │  └─ util
│  │     ├─ urllib3-2.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ uvicorn
│  │     │  ├─ lifespan
│  │     │  ├─ loops
│  │     │  ├─ middleware
│  │     │  ├─ protocols
│  │     │  │  ├─ http
│  │     │  │  └─ websockets
│  │     │  ├─ py.typed
│  │     │  └─ supervisors
│  │     ├─ uvicorn-0.54.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ watchfiles
│  │     │  └─ py.typed
│  │     ├─ watchfiles-1.3.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ watchfiles_rust_notify.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ websockets
│  │     │  ├─ asyncio
│  │     │  ├─ extensions
│  │     │  ├─ legacy
│  │     │  ├─ py.typed
│  │     │  ├─ speedups.c
│  │     │  ├─ sync
│  │     │  └─ trio
│  │     ├─ websockets-17.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ yaml
│  │     ├─ _pytest
│  │     │  ├─ assertion
│  │     │  ├─ config
│  │     │  ├─ mark
│  │     │  ├─ py.typed
│  │     │  ├─ _code
│  │     │  ├─ _io
│  │     │  └─ _py
│  │     └─ _yaml
│  ├─ pyvenv.cfg
│  └─ Scripts
│     ├─ activate
│     ├─ activate.bat
│     ├─ activate.fish
│     ├─ deactivate.bat
│     ├─ dotenv.exe
│     ├─ fastapi.exe
│     ├─ httpx.exe
│     ├─ httpx2.exe
│     ├─ idna.exe
│     ├─ normalizer.exe
│     ├─ pip.exe
│     ├─ pip3.14.exe
│     ├─ pip3.exe
│     ├─ py.test.exe
│     ├─ pygmentize.exe
│     ├─ pytest.exe
│     ├─ python.exe
│     ├─ pythonw.exe
│     ├─ uvicorn.exe
│     ├─ watchfiles.exe
│     └─ websockets.exe
├─ app
├─ data
│  ├─ demo_match.json
│  └─ sample_match.json
├─ docker-compose.yml
├─ Dockerfile
├─ frontend-starter
│  ├─ App.tsx
│  ├─ types.ts
│  └─ useInsightStream.ts
├─ pytest.ini
├─ README.md
├─ requirements.txt
├─ script.b64
├─ scripts
├─ tests
└─ web
   ├─ .oxlintrc.json
   ├─ components.json
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  ├─ favicon.svg
   │  └─ icons.svg
   ├─ README.md
   ├─ src
   │  ├─ app
   │  │  ├─ App.tsx
   │  │  ├─ MatchProvider.tsx
   │  │  └─ routes.tsx
   │  ├─ components
   │  │  ├─ Actions.tsx
   │  │  ├─ analytics
   │  │  │  ├─ AnalyticsCharts.tsx
   │  │  │  ├─ AnalyticsStats.tsx
   │  │  │  ├─ AttackPanel.tsx
   │  │  │  └─ PlayerRanking.tsx
   │  │  ├─ AnimatedNumber.tsx
   │  │  ├─ charts.tsx
   │  │  ├─ Heatmap.tsx
   │  │  ├─ icons.tsx
   │  │  ├─ InsightCard.tsx
   │  │  ├─ insights
   │  │  │  └─ InsightEvidenceTable.tsx
   │  │  ├─ Loader.tsx
   │  │  ├─ Pitch.tsx
   │  │  ├─ PlayerName.tsx
   │  │  ├─ players
   │  │  │  ├─ PlayerCard.tsx
   │  │  │  └─ PlayerFilters.tsx
   │  │  ├─ PowerSwitch.tsx
   │  │  ├─ Recap.tsx
   │  │  ├─ ReviewPanel.tsx
   │  │  └─ Switch.tsx
   │  ├─ hooks
   │  │  ├─ useApi.ts
   │  │  ├─ useHashRoute.ts
   │  │  ├─ useMatchStream.ts
   │  │  └─ useTheme.ts
   │  ├─ index.css
   │  ├─ layout
   │  │  ├─ Header.tsx
   │  │  └─ Sidebar.tsx
   │  ├─ lib
   │  │  ├─ analytics.ts
   │  │  ├─ api.ts
   │  │  ├─ match.ts
   │  │  ├─ players.ts
   │  │  ├─ share.ts
   │  │  └─ utils.ts
   │  ├─ main.tsx
   │  ├─ pages
   │  │  ├─ AboutPage.tsx
   │  │  ├─ AnalyticsPage.tsx
   │  │  ├─ AnnouncersPage.tsx
   │  │  ├─ FansPage.tsx
   │  │  ├─ InsightPage.tsx
   │  │  ├─ LivePage.tsx
   │  │  ├─ PlayerPage.tsx
   │  │  ├─ PlayersPage.tsx
   │  │  └─ RecapPage.tsx
   │  ├─ styles
   │  │  └─ components.css
   │  ├─ types
   │  │  ├─ matchContext.ts
   │  │  └─ types.ts
   │  └─ vite-env.d.ts
   ├─ tsconfig.app.json
   ├─ tsconfig.json
   ├─ tsconfig.node.json
   └─ vite.config.ts
```
