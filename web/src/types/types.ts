// web/src/types/types.ts - mirrors the backend Frontend Contract (17 Oct 2026). Field names are exact.
export type EventType = "pass" | "carry" | "shot" | "goal" | "tackle" | "interception" | "foul";

export interface MatchEvent {
  id: string; // "d67" - what insights and explanations cite as evidence
  minute: number; // decimal clock: 34.5 = 34m30s
  team: string;
  player: string | null;
  type: EventType;
  x: number; // 0-100 from the team's OWN goal line; both teams attack toward x = 100
  y: number; // 0-100
  outcome: string | null;
}

/** The "why" in four steps. forward_gain is for drawing only: never display it. */
export interface CauseChain {
  insight_id: string;
  kind: string;
  team: string;
  minute: number;
  evidence: string[];
  trigger?: string | null;
  development?: string | null;
  payoff?: string | null;
  consequence?: string | null;
  summary?: string | null;
  ended_in?: string | null;
  started_by?: string | null;
  finished_by?: string | null;
  duration_s?: number;
  forward_gain?: number;
}

export interface Insight {
  id: string;
  kind: string;
  team: string;
  minute: number;
  evidence: string[];
  narration: Record<string, string>; // narration.en is never empty
  // duration_s, passes, ended_in, starter, finisher, players. start_x / end_x are for drawing only.
  facts: Record<string, unknown>;
  chain?: CauseChain | null;
}

export interface Health {
  status: string;
  source?: string;
  llm_configured: boolean;
  languages: string[];
  model?: string | null;
  narration?: string; // "templates only" | "model" | "paused" | "degraded"
  model_status?: string | null;
}

export interface MatchInfo {
  source?: string;
  home: string | null;
  away: string | null;
  duration_min: number;
  events: number;
  score: Record<string, number>;
}

export interface Recap {
  lang: string;
  text: string;
  insight_ids: string[];
}

/** One action: /events/{id}/why, /players/{id} actions, /fouls. */
export interface Action {
  event_id: string;
  player: string | null;
  team: string;
  minute: number;
  action: string;
  routine: boolean; // a label, not an error: no shot or goal followed
  role: string | null; // started | carried on | finished | foul | pass | null
  why: string;
  insight_id?: string | null;
  evidence: string[];
  detail?: string | null;
  factors?: string[];
  quality?: PassQuality | null; // passes only // fouls: lost_ball_just_before, after_opponent_shot, stopping_an_attack, trailing, repeat_offender
}
export type PlayerAction = Action;

export interface WhyReason {
  minute: number;
  team: string;
  evidence: string[];
  text: string;
  caused_by: string | null;
  insight_id: string | null;
}

export interface MatchWhy {
  result: { score: Record<string, number>; winner: string | null; reasons: WhyReason[] };
  turning_points: CauseChain[]; // top 3, strongest first
  chains: CauseChain[];
  factors: Factor[]; // the football reasons, strongest first
}
export interface Player {
  id: string; // a slug such as reds-felix-ashdown: always take it from /players
  name: string;
  team: string;
  rating: number | null;
  touches: number;
  passes: number;
  carries: number;
  shots: number; // includes goals
  goals: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  progressive: number;
  goal_minutes: number[];
  key_moments: number;
  chains_started: number;
  chains_finished: number;
  chains_involved: number;
  goals_created: number;
}
export type PlayerSummary = Player;

export interface RatingLine {
  reason: string;
  points: number;
}

/** One row per detected move the player was in. The contract lists no fields, so it is read loosely. */
export type PlayerMoment = Record<string, unknown>;

export interface PlayerDetail extends Player {
  rating_breakdown: RatingLine[]; // sums to the rating: show it as a receipt
  moments: PlayerMoment[];
  actions: Action[];
}

export interface PlayerReview {
  text: string;
  rating: number | null;
  rating_breakdown: RatingLine[];
  evidence: string[];
}

export interface Finding {
  code: string;
  title: string;
  detail: string;
  advice?: string; // issues always have advice
  evidence: string[];
}

export interface Assessment {
  team: string;
  opponent: string;
  verdict: string; // playing well | mixed | struggling | too little play to judge
  score: string; // e.g. "3/4"
  points: RatingLine[];
  metrics: Record<string, number>;
  strengths: Finding[]; // can be empty
  issues: Finding[];
  text: string;
  lang: string;
  evidence: string[];
}

/* ---------- Factors, pass quality, tactics, win probability, validation ---------- */
export interface Factor {
  code: string; // "finishing:Reds": the part before the colon names the kind
  weight: number;
  team: string;
  effect: string; // "helped" | "held back"
  favours: string; // the team the factor worked for
  title: string;
  detail: string;
  principle?: string; // the football idea behind it: a small "why this matters" line
  evidence: string[];
}

export interface QualityReason {
  code: string;
  text: string;
  principle?: string;
}

export interface PassQuality {
  rating: string; // excellent | good | routine | unsuccessful | poor
  reasons: QualityReason[]; // can be empty for a routine pass
  evidence: string[];
  danger_before?: number; // 0 to 1, for a small bar
  danger_after?: number;
}

export interface Tactic {
  code: string; // high_press | deep_defence | possession | counter
  title: string;
  verdict: string; // worked | did not work | mixed
  detail: string;
  principle?: string;
  evidence: string[];
}

export interface SecondHalfChange {
  code: string;
  direction: string;
  title: string;
  detail: string;
  before: number;
  after: number;
  evidence: string[];
}

export interface SecondHalf {
  available: boolean;
  reason?: string; // why it is unavailable
  effect?: string; // worked | backfired | no clear effect
  swing?: number;
  halftime_score?: Record<string, number>;
  changes?: SecondHalfChange[];
  xg_first?: { for: number; against: number };
  xg_second?: { for: number; against: number };
}

export interface FormationPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface FormationEstimate {
  available: boolean;
  reason?: string; // show this instead of inventing a shape
  shape?: string;
  players?: FormationPlayer[];
  base?: string;
  in_possession?: string;
  out_of_possession?: string;
  [key: string]: unknown;
}

export interface Tactics {
  team: string;
  tactics: Tactic[]; // can be empty when no style stands out
  second_half: SecondHalf;
  second_half_story: string[];
  formation: FormationEstimate;
  lang: string;
  text: string;
  evidence: string[];
}

export interface Prediction {
  available: boolean;
  reason?: string; // when unavailable
  minute?: number;
  teams?: string[]; // the order of the two teams
  score?: Record<string, number>;
  probabilities?: Record<string, number>; // whole percentages: the two team names and "draw"
  favourite?: string | null;
  expected_goals_so_far?: Record<string, number>;
  minutes_left?: number; // 0 means the result is settled: say "final"
  reasons?: string[];
  method?: string;
}

export interface PredictResponse extends Prediction {
  timeline?: { minute: number; probabilities: Record<string, number> }[];
}

export interface Validation {
  available: boolean;
  matches?: number;
  source?: string;
  shot_value?: { correlation?: number; mean_shot_x?: number };
  formation?: { matched?: number; teams?: number };
  win_probability?: Record<string, { matches?: number; ours?: number; base_rate?: number }>;
}