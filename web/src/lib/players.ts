// web/src/lib/players.ts - turns /players responses into UI types. Reads loosely: unknown shapes are skipped.
import type {
  PlayerAction, PlayerDetail, PlayerMoment, PlayerReview, PlayerSummary, RatingPart, Stat,
} from "@/types/types";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;

const num = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => s !== undefined) : [];

export const prettyKey = (key: string): string => {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Ratings top out at 9.9: a perfect 10 is not possible. */
export const MAX_RATING = 9.9;

/** Keeps a rating in 0 to 9.9. A value above 10 is treated as bad data and dropped. */
export function clampRating(r: number | undefined): number | undefined {
  if (r === undefined || r < 0 || r > 10) return undefined;
  return Math.min(r, MAX_RATING);
}

/** Bar width in percent on a 0 to 10 scale. It can never reach 100. */
export const ratingPct = (r: number | null): number =>
  r === null ? 0 : (Math.min(Math.max(r, 0), MAX_RATING) / 10) * 100;

export const formatRating = (r: number | null): string =>
  r === null ? "-" : Math.min(r, MAX_RATING).toFixed(1);

function normalizeStats(v: unknown): Stat[] {
  if (isObj(v)) {
    return Object.entries(v).flatMap(([key, value]) =>
      typeof value === "number" || typeof value === "string" ? [{ key, value }] : [],
    );
  }
  if (Array.isArray(v)) {
    return v.flatMap((item) => {
      if (!isObj(item)) return [];
      const key = str(item.key) ?? str(item.label) ?? str(item.name);
      const value = item.value;
      return key !== undefined && (typeof value === "number" || typeof value === "string")
        ? [{ key, value }]
        : [];
    });
  }
  return [];
}

function normalizeBreakdown(v: unknown): RatingPart[] {
  if (isObj(v)) {
    return Object.entries(v).flatMap(([key, value]) => {
      const n = num(value);
      return n === undefined ? [] : [{ label: prettyKey(key), value: n }];
    });
  }
  if (Array.isArray(v)) {
    return v.flatMap((item) => {
      if (!isObj(item)) return [];
      const label = str(item.label) ?? str(item.name) ?? str(item.factor) ?? str(item.key);
      const n = num(item.value) ?? num(item.points) ?? num(item.score) ?? num(item.delta);
      return label === undefined || n === undefined ? [] : [{ label: prettyKey(label), value: n }];
    });
  }
  return [];
}

export function normalizePlayer(raw: unknown): PlayerSummary | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id) ?? str(raw.player_id);
  if (id === undefined) return null;
  return {
    id,
    name: str(raw.name) ?? id,
    team: str(raw.team) ?? "",
    rating: clampRating(num(raw.rating)) ?? null,
    stats: normalizeStats(raw.stats),
  };
}

export function normalizePlayers(raw: unknown): PlayerSummary[] {
  const list = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.players) ? raw.players : [];
  return list.map(normalizePlayer).filter((p): p is PlayerSummary => p !== null);
}

export function normalizeAction(raw: unknown): PlayerAction | null {
  if (!isObj(raw)) return null;
  const why = str(raw.why) ?? str(raw.reason) ?? str(raw.explanation) ?? "";
  const evidence = strList(raw.evidence);
  if (why === "" && evidence.length === 0) return null;
  return {
    eventId: str(raw.event_id) ?? str(raw.id),
    minute: num(raw.minute),
    type: str(raw.type),
    why,
    evidence,
    insightId: str(raw.insight_id),
  };
}

function normalizeMoment(raw: unknown): PlayerMoment | null {
  if (typeof raw === "string") return raw.trim() === "" ? null : { text: raw, evidence: [] };
  if (!isObj(raw)) return null;
  const narration = isObj(raw.narration)
    ? Object.values(raw.narration).find((x): x is string => typeof x === "string")
    : undefined;
  const text =
    str(raw.text) ?? str(raw.why) ?? str(raw.title) ?? str(raw.description) ?? narration ?? str(raw.kind);
  if (text === undefined) return null;
  return {
    text,
    minute: num(raw.minute),
    evidence: strList(raw.evidence),
    insightId: str(raw.insight_id) ?? (raw.kind !== undefined ? str(raw.id) : undefined),
  };
}

export function normalizePlayerDetail(raw: unknown): PlayerDetail | null {
  const base = normalizePlayer(raw);
  if (base === null || !isObj(raw)) return null;
  const moments = Array.isArray(raw.moments) ? raw.moments : [];
  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  return {
    ...base,
    breakdown: normalizeBreakdown(raw.rating_breakdown),
    moments: moments.map(normalizeMoment).filter((m): m is PlayerMoment => m !== null),
    actions: actions.map(normalizeAction).filter((a): a is PlayerAction => a !== null),
  };
}

export function normalizeReview(raw: unknown): PlayerReview | null {
  if (!isObj(raw)) return null;
  const text = str(raw.text) ?? "";
  if (text.trim() === "") return null;
  return {
    text,
    lang: str(raw.lang) ?? "",
    rating: clampRating(num(raw.rating)) ?? null,
    evidence: strList(raw.evidence),
  };
}

/** Names from facts.players / starter / finisher: a string, a list of strings, or a list of objects. */
export function playerNames(v: unknown): string[] {
  const items = typeof v === "string" ? v.split(",") : Array.isArray(v) ? v : [];
  const names = items
    .map((x) => {
      if (typeof x === "string") return x.trim();
      if (isObj(x)) return str(x.name) ?? str(x.player) ?? str(x.id) ?? "";
      return "";
    })
    .filter((n) => n !== "");
  return [...new Set(names)];
}