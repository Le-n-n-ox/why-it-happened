// web/src/lib/match.ts - small pure helpers. No React, and no match statistics: those come from the API.
import { playerNames } from "@/lib/players";
import type { Insight, MatchEvent } from "@/types/types";

export const PITCH_W = 105;
export const PITCH_H = 68;

/** Both teams attack toward x = 100, so the first team is drawn as is and the second team's x is flipped. */
export function toPitch(ev: Pick<MatchEvent, "x" | "y" | "team">, firstTeam: string) {
  const x = ev.team === firstTeam ? ev.x : 100 - ev.x;
  return { px: (x / 100) * PITCH_W, py: (ev.y / 100) * PITCH_H };
}

/** Teams in first-seen order. Used only until /match has loaded. */
export function teamsFrom(events: MatchEvent[]): string[] {
  return [...new Set(events.map((e) => e.team))];
}

export const formatMinute = (minute: number): string => `${Math.floor(minute)}'`;

// One place for kind names. An unknown kind falls back to the kind with underscores replaced by spaces.
const KIND_LABELS: Record<string, string> = {
  counter_attack: "Counter-attack",
  turnover_shot: "Turnover shot",
  high_press_turnover: "High-press turnover",
  goal_buildup: "Goal build-up",
  shot_pressure: "Shot pressure",
  foul_turning_point: "Foul turning point",
  sprint: "Sprint threshold",
  ball_speed: "Ball speed",
  shot_speed: "Shot speed",
  distance_threshold: "Distance covered",
  first_goal: "Opening goal",
  brace: "Brace",
  hat_trick: "Hat-trick",
  comeback: "Comeback",
};
export const kindLabel = (kind: string): string => KIND_LABELS[kind] ?? kind.replace(/_/g, " ");

/** Text in the chosen language, else English, else whatever exists. */
export function pickText(insight: Insight, lang: string): string {
  const n = insight.narration;
  return n[lang] ?? n["en"] ?? Object.values(n)[0] ?? "";
}

export const lacksLang = (insight: Insight, lang: string): boolean => !(lang in insight.narration);

/** Language codes from /health (`extra`), the insights, and the current choice. English first. */
export function languagesFrom(insights: Insight[], extra: string[] = []): string[] {
  const codes = new Set<string>(["en", ...extra]);
  for (const i of insights) Object.keys(i.narration).forEach((c) => codes.add(c));
  return [...codes];
}

/** Events for a list of ids, in that order. Unknown ids are skipped. */
export function eventsByIds(ids: string[], byId: Map<string, MatchEvent>): MatchEvent[] {
  return ids.map((id) => byId.get(id)).filter((e): e is MatchEvent => e !== undefined);
}

export function evidenceEvents(
  insight: Insight | undefined,
  byId: Map<string, MatchEvent>,
): MatchEvent[] {
  return insight ? eventsByIds(insight.evidence, byId) : [];
}

// CSS variables, so colours stay defined in index.css only.
const TEAM_COLORS = ["var(--accent)", "var(--accent-2)"]; // first team, second team
export function teamColor(team: string, teams: string[]): string {
  return TEAM_COLORS[teams.indexOf(team)] ?? "var(--muted)";
}

/** Drops the trailing "[d17, d18]" citation and a leading "9'" (cards show the minute and the ids separately). */
export const stripCitations = (text: string): string =>
  text.replace(/\s*\[[^\]]*\]/g, "").replace(/^\s*\d+'\s*/, "").trim();

/** Raw positions and pitch distances are never shown: start_x, end_x, forward_gain and the like are for drawing only. */
export const isDisplayableFact = (key: string): boolean => !/(^|_)(x|y)$|distance|gain/.test(key);

/** Short chips from an insight's facts, e.g. ["12s", "2 passes", "ends in shot", "started: Ada"]. */
export function factChips(insight: Insight): string[] {
  const f = insight.facts;
  const out: string[] = [];
  if (typeof f["duration_s"] === "number") out.push(`${f["duration_s"]}s`);
  if (typeof f["passes"] === "number") {
    out.push(`${f["passes"]} ${f["passes"] === 1 ? "pass" : "passes"}`);
  }
  if (f["ended_in"] !== undefined && f["ended_in"] !== null) {
    out.push(`ends in ${String(f["ended_in"]).replace(/_/g, " ")}`);
  }

  const starter = playerNames(f["starter"])[0];
  const finisher = playerNames(f["finisher"])[0];
  if (starter !== undefined && starter === finisher) {
    out.push(`${starter} started and finished`);
  } else {
    if (starter !== undefined) out.push(`started: ${starter}`);
    if (finisher !== undefined) out.push(`finished: ${finisher}`);
  }

  const involved = playerNames(f["players"]);
  if (involved.length > 0) {
    const more = involved.length - 3;
    out.push(`${involved.slice(0, 3).join(", ")}${more > 0 ? ` +${more}` : ""}`);
  }
  return out;
}

/** "sw" -> "Swahili". Falls back to the code itself. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}