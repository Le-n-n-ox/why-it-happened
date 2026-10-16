// web/src/match.ts - small pure helpers. No React in here, so they are easy to test.
import type { Insight, MatchEvent } from "./types";

export const PITCH_W = 105;
export const PITCH_H = 68;

/** Where to draw an event. `leftTeam` attacks to the right; the other team is rotated 180 degrees. */
export function toPitch(ev: Pick<MatchEvent, "x" | "y" | "team">, leftTeam: string) {
  const isLeft = ev.team === leftTeam;
  const x = isLeft ? ev.x : 100 - ev.x;
  const y = isLeft ? ev.y : 100 - ev.y;
  return { px: (x / 100) * PITCH_W, py: (y / 100) * PITCH_H };
}

/** Teams in first-seen order. The first team is "home" and plays left to right. */
export function teamsFrom(events: MatchEvent[]): string[] {
  return [...new Set(events.map((e) => e.team))];
}

export function scoreFrom(events: MatchEvent[], teams: string[]): Record<string, number> {
  const score: Record<string, number> = Object.fromEntries(teams.map((t) => [t, 0]));
  for (const e of events) {
    if (e.type === "goal" && e.team in score) score[e.team] += 1;
  }
  return score;
}

export const formatMinute = (minute: number): string => `${Math.floor(minute)}'`;

const KIND_LABELS: Record<string, string> = {
  counter_attack: "Counter-attack",
  high_press: "High press",
  player_standout: "Standout player",
  turnover_shot: "Turnover shot",
  high_press_turnover: "High-press turnover",
};
export const kindLabel = (kind: string): string =>
  KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Text in the chosen language, else English, else whatever exists. */
export function pickText(insight: Insight, lang: string): string {
  const n = insight.narration;
  return n[lang] ?? n["en"] ?? Object.values(n)[0] ?? "";
}

/** True when the insight has no text in `lang` (so pickText fell back). */
export const lacksLang = (insight: Insight, lang: string): boolean => !(lang in insight.narration);

/** Language codes from /health (`extra`), the insights, and the current choice. English first. */
export function languagesFrom(insights: Insight[], extra: string[] = []): string[] {
  const codes = new Set<string>(["en", ...extra]);
  for (const i of insights) Object.keys(i.narration).forEach((c) => codes.add(c));
  return [...codes];
}

/** The events an insight cites, in the order it cites them. Unknown ids are skipped. */
export function evidenceEvents(
  insight: Insight | undefined,
  byId: Map<string, MatchEvent>,
): MatchEvent[] {
  if (!insight) return [];
  return insight.evidence.map((id) => byId.get(id)).filter((e): e is MatchEvent => e !== undefined);
}

/** Fallback recap with no LLM: the most important moments, in match order. */
export function keyMoments(insights: Insight[], limit = 5): Insight[] {
  const weight = (i: Insight) =>
    i.facts["ended_in"] === "goal" ? 3 : i.kind === "high_press" ? 1 : 2;
  return [...insights]
    .sort((a, b) => weight(b) - weight(a) || a.minute - b.minute)
    .slice(0, limit)
    .sort((a, b) => a.minute - b.minute);
}

// CSS variables, so colours stay defined in index.css only.
const TEAM_COLORS = ["var(--accent)", "var(--accent-2)"]; // first team, second team
export function teamColor(team: string, teams: string[]): string {
  return TEAM_COLORS[teams.indexOf(team)] ?? "var(--muted)";
}

/** Drops "[e1, e2]" citations and a leading "10'" (the card shows the minute separately). */
export const stripCitations = (text: string): string =>
  text.replace(/\s*\[[^\]]*\]/g, "").replace(/^\s*\d+'\s*/, "").trim();

/** Short chips from an insight's facts, e.g. ["12s", "2 passes", "ends in shot"]. */
export function factChips(insight: Insight): string[] {
  const f = insight.facts;
  const out: string[] = [];
  if (typeof f["duration_s"] === "number") out.push(`${f["duration_s"]}s`);
    if (typeof f["passes"] === "number") {
    out.push(`${f["passes"]} ${f["passes"] === 1 ? "pass" : "passes"}`);
  }
  if (f["ended_in"] !== undefined) out.push(`ends in ${String(f["ended_in"]).replace(/_/g, " ")}`);
  return out;
}

/**
 * Match minute for the clock when the backend sends no "tick" events:
 * the latest minute mentioned by any insight or by the events it cites.
 */
export function clockFromInsights(insights: Insight[], byId: Map<string, MatchEvent>): number {
  let minute = 0;
  for (const i of insights) {
    minute = Math.max(minute, i.minute);
    for (const id of i.evidence) minute = Math.max(minute, byId.get(id)?.minute ?? 0);
  }
  return minute;
}

/** "sw" -> "Swahili". Falls back to the code itself. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
