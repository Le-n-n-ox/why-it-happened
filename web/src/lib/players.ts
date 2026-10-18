// web/src/lib/players.ts - small player helpers. Every number itself comes from the API.
import type { PlayerMoment } from "@/types/types";

export type StatKey =
  | "touches" | "passes" | "carries" | "shots" | "goals" | "tackles" | "interceptions" | "fouls"
  | "progressive" | "key_moments" | "chains_started" | "chains_finished" | "chains_involved" | "goals_created";

export const STAT_LABELS: Record<StatKey, string> = {
  touches: "Touches",
  passes: "Passes",
  carries: "Carries",
  shots: "Shots",
  goals: "Goals",
  tackles: "Tackles",
  interceptions: "Interceptions",
  fouls: "Fouls",
  progressive: "Progressive",
  key_moments: "Key moments",
  chains_started: "Chains started",
  chains_finished: "Chains finished",
  chains_involved: "Chains involved",
  goals_created: "Goals created",
};

export const prettyKey = (key: string): string => {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Ratings top out at 9.9: a perfect 10 is not possible. */
export const MAX_RATING = 9.9;

export const formatRating = (r: number | null | undefined): string =>
  r === null || r === undefined ? "-" : Math.min(r, MAX_RATING).toFixed(1);

/** Bar width in percent on a 0 to 10 scale. It can never reach 100. */
export const ratingPct = (r: number | null | undefined): number =>
  r === null || r === undefined ? 0 : (Math.min(Math.max(r, 0), MAX_RATING) / 10) * 100;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Names from facts.players / starter / finisher: a string, a list of strings, or a list of objects. */
export function playerNames(v: unknown): string[] {
  const items = typeof v === "string" ? v.split(",") : Array.isArray(v) ? v : [];
  const names = items
    .map((x) => {
      if (typeof x === "string") return x.trim();
      if (isObj(x)) return typeof x.name === "string" ? x.name : typeof x.player === "string" ? x.player : "";
      return "";
    })
    .filter((n) => n !== "");
  return [...new Set(names)];
}

export interface MomentView {
  text: string;
  minute?: number;
  role?: string;
  evidence: string[];
  insightId?: string;
}

const firstText = (...vals: unknown[]): string | undefined =>
  vals.find((v): v is string => typeof v === "string" && v.trim() !== "");

/** A player's moment row. The contract lists no fields, so this reads the likely ones and skips the rest. */
export function readMoment(m: PlayerMoment): MomentView | null {
  const narration = isObj(m.narration) ? Object.values(m.narration)[0] : undefined;
  const text = firstText(m.text, m.summary, m.why, narration, m.kind);
  if (text === undefined) return null;
  return {
    text,
    minute: typeof m.minute === "number" ? m.minute : undefined,
    role: firstText(m.role),
    evidence: Array.isArray(m.evidence) ? m.evidence.filter((e): e is string => typeof e === "string") : [],
    insightId: firstText(m.insight_id) ?? (m.kind !== undefined ? firstText(m.id) : undefined),
  };
}