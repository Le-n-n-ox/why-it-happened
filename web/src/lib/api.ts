// web/src/lib/api.ts - the only file that knows the server address and the endpoint paths.
import type {
  Action, Assessment, Health, MatchEvent, MatchInfo, MatchWhy, Player, PlayerDetail, PlayerReview, PredictResponse, Recap, Tactics, Validation,
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
