// web/src/lib/api.ts - the only file that knows the server address and the endpoint paths.
import type {
  Action, Assessment, AskResponse, GoalHypotheses, HalftimeResponse, Health, Insight, InsightRecord, MatchEvent,
  MatchInfo, MatchWhy, MomentumResponse, Player, PlayerDetail, PlayerReview, PositionsResponse, PredictResponse, Recap,
  StyleClaims, Tactics, Validation, VoicesResponse,
} from "@/types/types";

// Dev: empty, so requests go through the Vite proxy. Production same-origin build: also empty.
export const API: string = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new ApiError(res.status, `${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

/** A list that arrives bare or wrapped as { <key>: [...] }. */
function listOf<T>(raw: unknown, key: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "object" && raw !== null) {
    const inner = (raw as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

export const getHealth = () => getJson<Health>("/health");
export const getMatch = () => getJson<MatchInfo>("/match");
export const getEvents = () => getJson<MatchEvent[]>("/events");
export const getRecap = (lang: string) => getJson<Recap>(`/recap?lang=${enc(lang)}`);

export async function getEventWhy(id: string): Promise<Action> {
  const a = await getJson<Action>(`/events/${enc(id)}/why`);
  return { ...a, evidence: a.evidence ?? [] };
}

export async function getFouls(): Promise<Action[]> {
  return listOf<Action>(await getJson<unknown>("/fouls"), "fouls").map((a) => ({
    ...a,
    evidence: a.evidence ?? [],
    factors: a.factors ?? [],
  }));
}

export async function getPlayers(): Promise<Player[]> {
  return listOf<Player>(await getJson<unknown>("/players"), "players");
}

export async function getPlayer(id: string): Promise<PlayerDetail> {
  const p = await getJson<PlayerDetail>(`/players/${enc(id)}`);
  return {
    ...p,
    goal_minutes: p.goal_minutes ?? [],
    rating_breakdown: p.rating_breakdown ?? [],
    moments: p.moments ?? [],
    actions: (p.actions ?? []).map((a) => ({ ...a, evidence: a.evidence ?? [] })),
  };
}

export async function getPlayerReview(id: string, lang: string): Promise<PlayerReview> {
  const r = await getJson<PlayerReview>(`/players/${enc(id)}/review?lang=${enc(lang)}`);
  return { ...r, rating_breakdown: r.rating_breakdown ?? [], evidence: r.evidence ?? [] };
}

export async function getAssessment(team: string): Promise<Assessment> {
  const a = await getJson<Assessment>(`/team/${enc(team)}/assessment`);
  return {
    ...a,
    points: a.points ?? [],
    metrics: a.metrics ?? {},
    strengths: (a.strengths ?? []).map((f) => ({ ...f, evidence: f.evidence ?? [] })),
    issues: (a.issues ?? []).map((f) => ({ ...f, evidence: f.evidence ?? [] })),
    evidence: a.evidence ?? [],
  };
}

export async function getWhy(): Promise<MatchWhy> {
  const w = await getJson<MatchWhy>("/why");
  const result = w.result ?? { score: {}, winner: null, reasons: [] };
  return {
    result: { ...result, reasons: result.reasons ?? [] },
    turning_points: w.turning_points ?? [],
    chains: w.chains ?? [],
    factors: w.factors ?? [],
  };
}

export async function getTactics(team: string): Promise<Tactics> {
  const t = await getJson<Tactics>(`/team/${enc(team)}/tactics`);
  return {
    ...t,
    tactics: (t.tactics ?? []).map((x) => ({ ...x, evidence: x.evidence ?? [] })),
    second_half: t.second_half ?? { available: false },
    second_half_story: t.second_half_story ?? [],
    formation: t.formation ?? { available: false },
    evidence: t.evidence ?? [],
  };
}

export const getPredict = () => getJson<PredictResponse>("/predict");

/** Until the validation script has run on real matches the server answers { available: false }: show nothing. */
export async function getValidation(): Promise<Validation> {
  try {
    return await getJson<Validation>("/validation");
  } catch {
    return { available: false };
  }
}

/* ---------- Ask, hypotheses, positions, history ---------- */

/**
 * Ask the match a question. `mode` is "auto" (the model answers when it is configured) or "rules"
 * (the same facts joined by the rules), so the two answers can be put side by side. `previous` is the
 * question before this one, so a follow-up like "and in the second half?" can be read against it.
 */
export function getAsk(q: string, lang: string, mode: "auto" | "rules" = "auto",
                      previous?: string): Promise<AskResponse> {
  const prev = previous ? `&prev=${enc(previous)}` : "";
  return getJson<AskResponse>(`/ask?q=${enc(q)}&lang=${enc(lang)}&mode=${enc(mode)}${prev}`);
}

/** Claims tested against the match events for one goal. `mode` is "auto" or "sweep" (rules only). */
export function getGoalHypotheses(goalId: string, mode: "auto" | "sweep" = "auto"): Promise<GoalHypotheses> {
  return getJson<GoalHypotheses>(`/goals/${enc(goalId)}/hypotheses?mode=${enc(mode)}`);
}

/** The biggest jumps in the win-probability line, each with the claims tested for it. */
export function getMomentum(mode: "auto" | "sweep" = "auto"): Promise<MomentumResponse> {
  return getJson<MomentumResponse>(`/momentum?mode=${enc(mode)}`);
}

/** Claims about how a team played across the whole match, tested by the same rules. */
export function getTeamClaims(team: string, mode: "auto" | "sweep" = "auto"): Promise<StyleClaims> {
  return getJson<StyleClaims>(`/team/${enc(team)}/claims?mode=${enc(mode)}`);
}

/** What the first half showed for each team. */
export function getHalftime(lang: string): Promise<HalftimeResponse> {
  return getJson<HalftimeResponse>(`/halftime?lang=${enc(lang)}`);
}

/** The same match facts, written for a fan, an announcer and an analyst. */
export function getVoices(lang: string): Promise<VoicesResponse> {
  return getJson<VoicesResponse>(`/voices?lang=${enc(lang)}`);
}

/** Where each player was last seen. These are event locations, not live tracking. */
export function getPositions(minute?: number): Promise<PositionsResponse> {
  const qs = minute === undefined ? "" : `?minute=${minute}`;
  return getJson<PositionsResponse>(`/positions${qs}`);
}

/** The insights the server has collected, independent of the live stream. */
export async function getInsights(): Promise<Insight[]> {
  const list = await getJson<unknown>("/insights");
  return Array.isArray(list) ? (list as Insight[]) : [];
}

/** Saved insights from the database, newest minute first. */
export async function getInsightHistory(team?: string, limit = 20): Promise<InsightRecord[]> {
  const params = new URLSearchParams();
  if (team) params.set("team", team);
  params.set("limit", String(limit));
  const list = await getJson<unknown>(`/insights/history?${params.toString()}`);
  if (!Array.isArray(list)) return [];
  return (list as InsightRecord[]).map((r) => ({
    ...r,
    evidence: r.evidence ?? [],
    facts: r.facts ?? {},
  }));
}
