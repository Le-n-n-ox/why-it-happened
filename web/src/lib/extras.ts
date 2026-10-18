// web/src/lib/extras.ts - readers for factors, tactics, the win-probability timeline and pass quality.
// Fields that cannot be read are left out: nothing is invented and nothing is calculated here.
import { firstText, isObj, num, pick, strList } from "@/lib/loose";
import { prettyKey } from "@/lib/players";

export interface FactorView {
  title: string;
  detail?: string;
  team?: string;
  points?: number;
  evidence: string[];
  insightId?: string;
}

function readFactor(item: unknown): FactorView[] {
  if (typeof item === "string") return item.trim() === "" ? [] : [{ title: item, evidence: [] }];
  if (!isObj(item)) return [];
  const code = firstText(item.code);
  const title =
    firstText(item.title, item.label, item.reason, item.name, item.headline, item.text) ??
    (code !== undefined ? prettyKey(code) : undefined);
  if (title === undefined) return [];
  const detail = firstText(item.detail, item.why, item.description, item.explanation, item.summary, item.text);
  return [
    {
      title,
      detail: detail !== undefined && detail !== title ? detail : undefined,
      team: firstText(item.team),
      points: num(pick(item, ["points", "weight", "impact", "value"])),
      evidence: strList(item.evidence),
      insightId: firstText(item.insight_id),
    },
  ];
}

export const readFactors = (raw: unknown): FactorView[] =>
  Array.isArray(raw) ? raw.flatMap((item) => readFactor(item)) : [];

/* ---------- Tactics ---------- */

export interface TacticsView {
  headline?: string;
  text?: string;
  facts: [string, string | number][];
  metrics: [string, number][];
  sections: { title: string; items: FactorView[] }[];
  evidence: string[];
}

const SKIP_FACTS = new Set(["team", "opponent", "lang", "text", "summary", "description", "headline", "title", "status", "detail"]);

export function readTactics(raw: unknown): TacticsView | null {
  if (!isObj(raw)) return null;
  const headline = firstText(raw.style, raw.headline, raw.label, raw.title, raw.verdict);
  const text = firstText(raw.text, raw.summary, raw.description);

  const facts: [string, string | number][] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (SKIP_FACTS.has(k)) continue;
    if (typeof v === "number" || (typeof v === "string" && v.length <= 40 && v !== headline)) facts.push([k, v]);
  }

  const metrics: [string, number][] = [];
  if (isObj(raw.metrics)) {
    for (const [k, v] of Object.entries(raw.metrics)) if (typeof v === "number") metrics.push([k, v]);
  }

  const sections = Object.entries(raw)
    .filter(([k, v]) => k !== "evidence" && k !== "metrics" && Array.isArray(v))
    .map(([k, v]) => ({ title: prettyKey(k), items: readFactors(v) }))
    .filter((s) => s.items.length > 0);

  const evidence = strList(raw.evidence);
  if (!headline && !text && facts.length === 0 && metrics.length === 0 && sections.length === 0) return null;
  return { headline, text, facts, metrics, sections, evidence };
}

/* ---------- Win probability ---------- */

export interface PredictSeries {
  name: string;
  draw: boolean;
  points: { minute: number; pct: number }[];
}

export interface PredictView {
  series: PredictSeries[];
  minMinute: number;
  maxMinute: number;
}

/** Reads /predict's timeline. Fractions (0.62) are shown as percentages (62): that is formatting, not a new number. */
export function readPredict(raw: unknown, teams: string[]): PredictView | null {
  const list = Array.isArray(raw) ? raw : isObj(raw) ? pick(raw, ["timeline", "points", "series"]) : undefined;
  if (!Array.isArray(list)) return null;

  const rows = list.flatMap((p): { minute: number; probs: Record<string, number> }[] => {
    if (!isObj(p)) return [];
    const minute = num(pick(p, ["minute", "t", "time", "min"]));
    if (minute === undefined) return [];
    const nested = pick(p, ["probabilities", "probs", "win_probability", "probability", "p"]);
    const src = isObj(nested) ? nested : p;
    const probs: Record<string, number> = {};
    teams.forEach((team, i) => {
      const v = num(
        pick(src, [
          team, team.toLowerCase(),
          i === 0 ? "home" : "away", i === 0 ? "home_win" : "away_win", i === 0 ? "home_prob" : "away_prob",
        ]),
      );
      if (v !== undefined) probs[team] = v;
    });
    const draw = num(pick(src, ["draw", "draws", "tie", "draw_prob"]));
    if (draw !== undefined) probs["Draw"] = draw;
    return Object.keys(probs).length > 0 ? [{ minute, probs }] : [];
  });
  if (rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => a.minute - b.minute);
  const top = Math.max(...sorted.flatMap((r) => Object.values(r.probs)));
  const scale = top <= 1.0001 ? 100 : 1;
  const names = [...teams, "Draw"].filter((n) => sorted.some((r) => r.probs[n] !== undefined));
  return {
    series: names.map((name) => ({
      name,
      draw: name === "Draw",
      points: sorted.filter((r) => r.probs[name] !== undefined).map((r) => ({ minute: r.minute, pct: r.probs[name] * scale })),
    })),
    minMinute: sorted[0].minute,
    maxMinute: sorted[sorted.length - 1].minute,
  };
}

/* ---------- Quality (pass detail) ---------- */

export interface QualityView {
  label?: string;
  score?: number;
  text?: string;
  lines: { reason: string; value?: number }[];
  evidence: string[];
}

const LINE_KEYS = ["factors", "reasons", "points", "breakdown", "rating_breakdown", "components", "metrics"];

export function readQuality(raw: unknown): QualityView | null {
  if (typeof raw === "string") return raw.trim() === "" ? null : { text: raw, lines: [], evidence: [] };
  if (typeof raw === "number") return { score: raw, lines: [], evidence: [] };
  if (!isObj(raw)) return null;

  const rating = raw.rating;
  const label = firstText(raw.label, raw.grade, raw.verdict, raw.level, raw.name, typeof rating === "string" ? rating : undefined);
  const score = num(pick(raw, ["score", "value"])) ?? (typeof rating === "number" ? rating : undefined);
  const text = firstText(raw.text, raw.summary, raw.why, raw.detail, raw.description, raw.explanation);

  const lines: QualityView["lines"] = [];
  for (const key of LINE_KEYS) {
    const v = raw[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") lines.push({ reason: item });
        else if (isObj(item)) {
          const reason = firstText(item.reason, item.label, item.title, item.text, item.name);
          if (reason !== undefined) lines.push({ reason, value: num(pick(item, ["points", "value", "score", "weight"])) });
        }
      }
    } else if (isObj(v)) {
      for (const [k, n] of Object.entries(v)) {
        const value = num(n);
        if (value !== undefined) lines.push({ reason: prettyKey(k), value });
      }
    }
  }

  const evidence = strList(raw.evidence);
  if (!label && score === undefined && !text && lines.length === 0) return null;
  return { label, score, text, lines, evidence };
}