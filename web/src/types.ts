export type EventType =
  | "pass"
  | "carry"
  | "shot"
  | "goal"
  | "tackle"
  | "interception"
  | "foul";

export interface MatchEvent {
  id: string;
  minute: number;
  team: string;
  player: string | null;
  type: EventType;
  x: number;
  y: number;
  outcome: string | null;
}

export interface Insight {
  id: string;
  kind: string;
  team: string;
  minute: number;
  evidence: string[];
  facts: Record<string, string | number>;
  narration: Record<string, string>;
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