# Backend API reference

This file is the frontend-facing contract for the FastAPI backend. Update it whenever a route, parameter, event, or response shape changes in `app/main.py` or its response-building modules.

## Base URL and docs

- Local API: `http://localhost:8000`
- Interactive Swagger docs: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- The frontend API helper is in `web/src/lib/api.ts`. It uses same-origin requests by default; set `VITE_API_URL` only when the frontend and API are served from different origins.

Encode path parameters such as team names and player IDs with `encodeURIComponent`.

## Match and event data

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /health` | — | API/model status, configured languages, model name, narration state, and a `source` label. |
| `GET /match` | — | `{home, away, duration_min, events, score, source}`. |
| `GET /events` | — | Event array. Each event has `id`, `minute`, `team`, `player`, `type`, `x`, `y`, and `outcome`. Coordinates use the app's 0–100 pitch scale. |
| `GET /events/{event_id}/why` | Path: `event_id` | Explanation with `action`, `why`, and `evidence`; pass events can also include `quality`. Unknown IDs return 404. |
| `GET /goals/{goal_id}/hypotheses` | Path: `goal_id`; `mode=auto\|sweep` | Goal summary and hypotheses tested against match events. `auto` asks the model for claims when configured, then verifies them with rules; `sweep` uses the rules-only baseline. |
| `GET /stream` | `source=file\|live`, `delay`, `speed` | Server-sent events. Messages include event ticks, prediction updates, insights, and a final `done`. |
| `GET /live/status` | — | `{live, events, ended}` for the ingest stream. |
| `POST /events` | JSON `MatchEvent`; optional `X-Ingest-Token` header | Add an app-format live event. Duplicate IDs are ignored; events must arrive in clock order. |
| `POST /events/official` | JSON official-format event; optional `X-Ingest-Token` | Convert and add an official-feed event. |
| `POST /live/end` | Optional `X-Ingest-Token` | Mark the live feed ended so `/stream?source=live` sends `done`. |
| `POST /live/reset` | Optional `X-Ingest-Token` | Clear ingested events and return to the configured match file. |

`MatchEvent.type` is one of `pass`, `carry`, `shot`, `goal`, `tackle`, `interception`, or `foul`. `minute`, `x`, and `y` are numbers; `player` and `outcome` may be null.

## Analysis

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /why` | `lang` (default `en`) | Match result with `score`, `winner`, goal `reasons`, `summary`, `factors`, `turning_points`, and `chains`. |
| `GET /recap` | `lang` (default `en`) | `{lang, text, insight_ids}` for the match recap. |
| `GET /fouls` | — | Array of foul explanations, with event context and evidence. |
| `GET /team/{team}/assessment` | Path: `team`; `lang` (default `en`) | Team verdict, score, metrics, strengths, issues, narration text, and evidence. Unknown teams return 404. |
| `GET /team/{team}/tactics` | Path: `team`; `lang` (default `en`) | Tactical report, second-half comparison, formation estimate, narration text, and evidence. Unknown teams return 404. |
| `GET /positions` | `minute` (optional number) | `{minute, source, exact, ball, players, note}`. Each player includes last-seen coordinates, event, time since seen, freshness, trail, average position, action count, and on-ball status. These are event locations, not live player tracking. |
| `GET /predict` | `minute` (optional number) | Win-probability fields plus `timeline`. If fewer than two teams are present, returns `available: false` and a reason. |
| `GET /validation` | — | Latest persisted real-match validation report, or `{available: false, reason}` until one has been written by the validation script. |
| `GET /ask` | Required `q` (max 300 chars); optional `lang` (default `en`), `mode` (default `auto`; `rules` skips the model) | `{question, mode, router, analyses, facts, evidence, answerable, answer}`. |

## Players

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /players` | — | Player summary array, sorted by rating. Each item includes an `id`; use it in the routes below. |
| `GET /players/{player_id}` | Path: `player_id` | Player stats, rating and breakdown, match moments, and action context. Unknown IDs return 404. |
| `GET /players/{player_id}/review` | Path: `player_id`; `lang` (default `en`) | `{player_id, name, team, lang, text, rating, rating_breakdown, evidence}`. |

## Insights and history

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /insights` | — | Insights collected during the current stream. |
| `GET /insights/history` | Optional `team`; `limit` (default 20) | Saved insight records, including `id`, `kind`, `team`, `minute`, `evidence`, `facts`, and `narration`. |

## Frontend notes

- The configured match is selected with `EVENTS_FILE` (default `data/sample_match.json`). Restart the API after changing it.
- `GET /match` and `GET /health` identify StatsBomb files as `StatsBomb Open Data`; set `DATA_SOURCE` to label other configured files. Live ingested events use `LIVE_DATA_SOURCE` or `Live event feed`.
- `scripts/validate_on_statsbomb.py` writes `data/validation_report.json` by default; `GET /validation` reads that file. The Docker image copies it with `data/` when present at build time.
- With `INGEST_TOKEN` configured, include its value as `X-Ingest-Token` on all event-ingest and live-control POSTs.
- `/stream` sends `tick` and `prediction` as named SSE events, insight payloads as default messages, then the named `done` event.

## Route maintenance

Keep route response descriptions in sync with `app/main.py` and the functions that build each response. The retired placeholder route implementations have been removed; check for duplicate decorators before adding a route so `/docs` and runtime behavior stay aligned.
