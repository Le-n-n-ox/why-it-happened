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
| `GET /health` | — | API/model status, `languages` (enabled narration), `supported_languages` (code → name), `features` (`auto_eventing`, `tracking_feed`, `speed_metrics`, `distance_metrics`, `pass_difficulty`, `milestones`, `synthetic_generator`), model name, narration state, and a `source` label. |
| `GET /match` | — | `{home, away, duration_min, events, score, source, metadata}`. Metadata comes from the configured file or the live feed and may include competition, season, venue, kickoff, weather and pitch dimensions. |
| `GET /events` | — | Enriched event array. Each event has `id`, `minute`, `team`, `player`, `type`, `x`, `y`, `outcome`, plus optional physical fields (below). Coordinates use the app's 0–100 pitch scale. |
| `GET /events/{event_id}/why` | Path: `event_id` | Explanation with `action`, `why`, and `evidence`; pass events can also include `quality`. Unknown IDs return 404. |
| `GET /goals/{goal_id}/hypotheses` | Path: `goal_id`; `mode=auto\|sweep` | Goal summary and hypotheses tested against match events. `auto` asks the model for claims when configured, then verifies them with rules; `sweep` uses the rules-only baseline. Each claim carries its `verdict` (`supported`, `not supported`, `too little data`), the `p_value`, the counts behind the test, the evidence ids, the `candidates` the rules offered, and `text`: the finding written by the rules from the test's own numbers. The goal id is the last id of the cause chain. |
| `GET /stream` | `source=file\|live`, `delay`, `speed` | Server-sent events. Messages include event ticks, prediction updates, insights, and a final `done`. |
| `GET /live/status` | — | `{live, events, ended}` for the ingest stream. |
| `POST /events` | JSON `MatchEvent`; optional `X-Ingest-Token` header | Add an app-format live event. Duplicate IDs are ignored; events must arrive in clock order. |
| `POST /events/official` | JSON official-format event; optional `X-Ingest-Token` | Convert and add an official-feed event. |
| `POST /match/metadata` | JSON object; optional `X-Ingest-Token` | Set match-level facts for the live feed. Once live events arrive, `/match`, briefs and overlays use this metadata. |
| `POST /tracking` | JSON `TrackingBatch`; optional `?ingest=true`; optional `X-Ingest-Token` | Auto-event a tracking/video feed. Frames contain `timestamp_s`, `ball` (`x`, `y`), `players` (`id`, `name`, `team`, `x`, `y`, optional `speed_kph`) and optional `event_hint`. Returns `{summary, events}` with measured pass/carry/shot/pressure events. With `ingest=true` the events are also appended to the live match. |
| `POST /live/end` | Optional `X-Ingest-Token` | Mark the live feed ended so `/stream?source=live` sends `done`. |
| `POST /live/reset` | Optional `X-Ingest-Token` | Clear ingested events and return to the configured match file. |

`MatchEvent.type` is one of `pass`, `carry`, `shot`, `goal`, `tackle`, `interception`, `foul`,
`possession`, or `pressure`. `minute`, `x`, and `y` are numbers; `player` and `outcome` may be null.

Optional physical fields appear when the feed or tracking adapter measures them:
`end_x`, `end_y`, `pass_distance_m`, `pass_accuracy` (1/0), `pass_difficulty` (0–1),
`ball_speed_kph`, `shot_speed_kph`, `player_speed_kph`, `distance_m`, `pressure` (0–1), `period`,
and `metadata`. `/events`, `/stream` ticks and `/players` expose the derived values; the raw ingest
payload may omit them.

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
| `GET /ask` | Required `q` (max 300 chars); optional `lang` (default `en`), `mode` (default `auto`; `rules` skips the model), `prev` (max 300 chars) | `{question, mode, router, analyses, facts, evidence, answerable, answer}`, plus `follow_up` and `resolved` when the question leaned on the one before it. |
| `GET /momentum` | `mode=auto\|sweep` | The biggest jumps in the win-probability line, each with the event that turned the match and the claims tested for it. Same grammar, same tests as the goals. |
| `GET /team/{team}/claims` | Path: `team`; `mode=auto\|sweep` | Claims about how a team played across the whole match, not one spell. The window is long, so the same tests have more data behind them. Unknown teams return 404. |
| `GET /halftime` | `lang` (default `en`) | What the first half showed for each team: what worked, what did not, and what to watch in the second half. The rules pick and rank the facts; the model only words them. |
| `GET /voices` | `mode=fan\|analyst\|announcer\|player` (default `fan`); repeatable or comma-separated `club` and `player`; `metric` (`xg`, `shots`, `possession`, `pressing`, `tempo`, `final_third`, `goals_created`, `rating`, `distance`, `sprint`, `pass_accuracy`); `lang` (default `en`) | One match, a different brief per audience. Every voice gets only its own side: the fan the score, mood, goals and player; the announcer a timed cue sheet; the analyst the measured factors and team numbers; the player one player's match. Each voice carries its `brief` and the `inputs` keys it was given, and cites evidence from that brief. |
| `GET /brief` | Same profile parameters as `/voices` | The rules-only payload for one viewer: `profile`, `match`, `brief`, `metric`, the top `ranked` insights, and a `note`. The brief is the mode-specific side of the story; an analyst brief includes `chance_quality` (which side created the better chances), while a fan brief deliberately contains no measured numbers. No model call, so it is safe to poll for an overlay. |
| `GET /overlay` | Same profile parameters as `/voices` | Timed cards for a renderer: `cards` sorted by match clock, each with `at`, `hold_s`, `kind`, `team`, `headline`, `text`, `evidence` and `priority`; plus `timing` (`unit`, `lead_s`, `default_hold_s`), the chosen `metric` and match `metadata`. Output is capped at 40 cards; goals and the full-time card are always kept. |

## Players

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /players` | — | Player summary array, sorted by rating. Each item includes an `id`; use it in the routes below. When the feed measures them, summaries also include `possessions`, `pressures`, `pass_distance_m`, `pass_accuracy`, `avg_pass_difficulty`, `distance_m`, `top_speed_kph` and `sprints`. |
| `GET /players/{player_id}` | Path: `player_id` | Player stats, rating and breakdown, match moments, and action context. Unknown IDs return 404. |
| `GET /players/{player_id}/review` | Path: `player_id`; `lang` (default `en`) | `{player_id, name, team, lang, text, rating, rating_breakdown, evidence}`. |

## Insights and history

| Method and path | Parameters | Response and use |
|---|---|---|
| `GET /insights` | Optional `mode`, repeatable `club`/`player`, `metric` | Insights collected during the current stream. With a profile, favourite clubs and players are ranked first and `player` mode keeps only that player's moments. |
| `GET /insights/history` | Optional `team`; `limit` (default 20) | Saved insight records, including `id`, `kind`, `team`, `minute`, `evidence`, `facts`, and `narration`. |

## Frontend notes

- The configured match is selected with `EVENTS_FILE` (default `data/sample_match.json`). Restart the API after changing it. `data/synthetic_match.json` is the full-vocabulary demo match generated by `python scripts/generate_match.py --out data/synthetic_match.json --seed 7`.
- `GET /match` and `GET /health` identify StatsBomb files as `StatsBomb Open Data` and generated files as `Synthetic generated match`; set `DATA_SOURCE` to label other configured files. Live ingested events use `LIVE_DATA_SOURCE` or `Live event feed`.
- Match files may be either a bare event array or `{metadata, events}`. Metadata is passed through `/match`, briefs and overlays.
- `scripts/validate_on_statsbomb.py` writes `data/validation_report.json` by default; `GET /validation` reads that file. The Docker image copies it with `data/` when present at build time.
- With `INGEST_TOKEN` configured, include its value as `X-Ingest-Token` on all event-ingest, metadata, tracking and live-control POSTs.
- `/stream` sends `tick` and `prediction` as named SSE events, insight payloads as default messages, then the named `done` event. Ticks carry enriched events.
- New physical/milestone insights (`sprint`, `ball_speed`, `shot_speed`, `distance_threshold`, `first_goal`, `brace`, `hat_trick`, `comeback`) use template narration so measured numbers stay exact; the model is not asked to invent reasons around them.

## Frontend surface

Every endpoint above is called from `web/src/lib/api.ts`. This is where each one is used, so a
new endpoint with no home is visible here.

| Endpoint | Called by | Shown on |
|---|---|---|
| `GET /ask` | `getAsk` | Ask the match (`#/ask`), with an Auto / Rules-only comparison and follow-up questions |
| `GET /goals/{id}/hypotheses` | `getGoalHypotheses` | Why the result (`#/result`), under each goal |
| `GET /momentum` | `getMomentum` | Momentum (`#/momentum`), the biggest swings in the win-probability line |
| `GET /team/{team}/claims` | `getTeamClaims` | Team detail (`#/team/{name}`), the claims about how they played |
| `GET /halftime` | `getHalftime` | Half-time (`#/halftime`), what the first half showed |
| `GET /voices` | `getVoices` | Why the result (`#/result`), one match with a different brief per audience |
| `GET /brief` | `getBrief` | Fans (`#/fans`) and Announcers (`#/announcers`), the rules-only view for the chosen mode, club, player and metric |
| `GET /overlay` | `getOverlay` | Fans (`#/fans`) and Announcers (`#/announcers`), the timed overlay timeline |
| `GET /positions` | `getPositions` | Positions (`#/positions`), with a minute scrubber |
| `GET /insights` | `getInsights` | Seeds the insight list so a shared `#/insight/{id}` link resolves at once |
| `GET /insights/history` | `getInsightHistory` | History (`#/history`) and the fallback for an old shared link |
| `GET /why` | `getWhy` | Why the result, Timeline, Fans |
| `GET /recap` | `getRecap` | Timeline, Why the result |
| `GET /events` | `getEvents` | Live (the whole match, for the pitch) |
| `GET /stream` | `useMatchStream` | Live |
| `GET /health` | `getHealth` | Header (model state, languages) |
| `GET /match` | `getMatch` | Header (teams, source) |
| `GET /events/{id}/why` | `getEventWhy` | Live, Timeline, Insight detail |
| `GET /fouls` | `getFouls` | Fouls |
| `GET /players`, `GET /players/{id}` | `getPlayers`, `getPlayer` | Players, Player detail |
| `GET /players/{id}/review` | `getPlayerReview` | Player detail |
| `GET /team/{team}/assessment` | `getAssessment` | Teams, Team detail, Analytics |
| `GET /team/{team}/tactics` | `getTactics` | Team detail |
| `GET /predict` | `getPredict` | Live, Why the result |
| `GET /validation` | `getValidation` | Team detail |

Not yet used by the frontend: `POST /events`, `POST /events/official`, `POST /match/metadata`,
`POST /tracking`, `POST /live/end`, `POST /live/reset`, `GET /live/status`. They are the ingest side
of the service, for a feed or a tracking adapter to push into, not for the dashboard to call.

The Analytics page is the one place that counts in the browser: its tallies, its charts and its
player ranking come from the event list in `GET /events`, and the page says so under each panel.
Every number that is a football fact about a team, a player or the result comes from the server.

## Route maintenance

Keep route response descriptions in sync with `app/main.py` and the functions that build each response. The retired placeholder route implementations have been removed; check for duplicate decorators before adding a route so `/docs` and runtime behavior stay aligned.
