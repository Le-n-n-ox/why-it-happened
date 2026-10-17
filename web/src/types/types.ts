// web/src/types.ts - mirrors the backend JSON. Edit only when the contract changes.
export type EventType = "pass" | "carry" | "shot" | "goal" | "tackle" | "interception" | "foul";

export interface MatchEvent {
  id: string; // "e7" - what an insight cites as evidence
  minute: number; // match clock, 14.3 = 14m18s
  team: string;
  player: string | null;
  type: EventType;
  x: number; // 0-100, measured from the team's OWN goal line
  y: number; // 0-100 across the pitch
  outcome: string | null;
}

export interface Insight {
  id: string; // "counter_attack-e1"
  kind: string; // unknown kinds must still render
  team: string;
  minute: number; // when it was detected
  evidence: string[]; // MatchEvent ids
  // Known keys: duration_s, passes, ended_in, players, starter, finisher. Others may appear.
  facts: Record<string, unknown>;
  narration: Record<string, string>; // language code -> text, e.g. { en: "...", sw: "..." }
}

export interface Health {
  status: string;
  llm_configured: boolean;
  languages: string[];
}

export interface Recap {
  lang: string;
  text: string;
  insight_ids: string[];
}

// Players (built from /players responses by players.ts)
export interface Stat {
  key: string;
  value: string | number;
}

export interface PlayerSummary {
  id: string;
  name: string;
  team: string;
  rating: number | null;
  stats: Stat[];
}

export interface RatingPart {
  label: string;
  value: number;
}

export interface PlayerMoment {
  text: string;
  minute?: number;
  evidence: string[];
  insightId?: string;
}

export interface PlayerAction {
  eventId?: string;
  minute?: number;
  type?: string;
  why: string;
  evidence: string[];
  insightId?: string;
}

export interface PlayerDetail extends PlayerSummary {
  breakdown: RatingPart[];
  moments: PlayerMoment[];
  actions: PlayerAction[];
}

export interface PlayerReview {
  text: string;
  lang: string;
  rating: number | null;
  evidence: string[];
}