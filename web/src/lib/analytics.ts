// web/src/analytics.ts - pure chart data, computed from events and insights only.
import { PITCH_H, PITCH_W, toPitch } from "@/lib/match";
import type { Insight, MatchEvent } from "@/types/types";

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Event types present in the data (most common first) with a count per team. counts[team][type]. */
export function countByType(events: MatchEvent[], teams: string[]) {
  const totals = new Map<string, number>();
  for (const e of events) totals.set(e.type, (totals.get(e.type) ?? 0) + 1);
  const types = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
  const counts = teams.map((team) =>
    types.map((t) => events.filter((e) => e.team === team && e.type === t).length),
  );
  return { types, counts };
}

/** Events per time window. counts[team][window]. Windows start at the first event's window. */
export function activityBuckets(events: MatchEvent[], teams: string[], size = 5) {
  if (events.length === 0) {
    return { labels: [] as string[], counts: teams.map(() => [] as number[]) };
  }
  const minutes = events.map((e) => e.minute);
  const start = Math.floor(Math.min(...minutes) / size) * size;
  const end = Math.floor(Math.max(...minutes) / size) * size;
  const n = (end - start) / size + 1;
  const labels = Array.from({ length: n }, (_, i) => `${start + i * size}'`);
  const counts = teams.map(() => new Array<number>(n).fill(0));
  for (const e of events) {
    const t = teams.indexOf(e.team);
    if (t >= 0) counts[t][Math.floor((e.minute - start) / size)] += 1;
  }
  return { labels, counts };
}

export const teamEventCounts = (events: MatchEvent[], teams: string[]): number[] =>
  teams.map((t) => events.filter((e) => e.team === t).length);

export const countType = (events: MatchEvent[], teams: string[], type: string): number[] =>
  teams.map((t) => events.filter((e) => e.team === t && e.type === type).length);

/** Mean x (0 = own goal line, 100 = the opponent's) of each team's events. */
export function averageAdvance(events: MatchEvent[], teams: string[]): number[] {
  return teams.map((t) => {
    const xs = events.filter((e) => e.team === t).map((e) => e.x);
    return xs.length ? Math.round(sum(xs) / xs.length) : 0;
  });
}

export function insightsByKind(insights: Insight[]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of insights) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

/** Metres between two events, using the real pitch size. Only meaningful in one team's frame. */
const metres = (a: MatchEvent, b: MatchEvent): number =>
  Math.hypot(((b.x - a.x) / 100) * PITCH_W, ((b.y - a.y) / 100) * PITCH_H);

/* ---------- Where each team attacks ---------- */

const ATTACK_TYPES = new Set(["pass", "carry", "shot", "goal"]);
export const CHANNEL_NAMES = ["top", "centre", "bottom"] as const;

export interface ZoneCell {
  team: string;
  channel: number; // 0 top, 1 centre, 2 bottom, as drawn on the pitch map
  count: number;
  x: number; // pitch map coordinates (metres)
  y: number;
  w: number;
  h: number;
}

/** Six cells: each team's final third split into three channels, in pitch-map coordinates. */
export function attackZones(events: MatchEvent[], teams: string[]): ZoneCell[] {
  if (teams.length < 2) return [];
  const third = PITCH_W / 3;
  const band = PITCH_H / 3;
  const cells: ZoneCell[] = [];
  teams.slice(0, 2).forEach((team, ti) => {
    for (let c = 0; c < 3; c++) {
      cells.push({ team, channel: c, count: 0, x: ti === 0 ? PITCH_W - third : 0, y: c * band, w: third, h: band });
    }
  });
  for (const e of events) {
    if (!ATTACK_TYPES.has(e.type)) continue;
    const ti = teams.indexOf(e.team);
    if (ti < 0 || ti > 1) continue;
    const { px, py } = toPitch(e, teams[0]);
    const inFinalThird = ti === 0 ? px >= PITCH_W - third : px <= third;
    if (!inFinalThird) continue;
    const channel = Math.min(2, Math.max(0, Math.floor(py / band)));
    cells[ti * 3 + channel].count += 1;
  }
  return cells;
}

export interface AttackRow {
  team: string;
  total: number;
  bestChannel: number;
  bestCount: number;
}

export function attackSummary(cells: ZoneCell[], teams: string[]) {
  const rows: AttackRow[] = teams.slice(0, 2).map((team) => {
    const mine = cells.filter((c) => c.team === team);
    const best = mine.reduce((a, b) => (b.count > a.count ? b : a), mine[0]);
    return {
      team,
      total: sum(mine.map((c) => c.count)),
      bestChannel: best ? best.channel : 1,
      bestCount: best ? best.count : 0,
    };
  });
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const level = rows.length < 2 || sorted[0].total === sorted[1].total;
  const leader = !level && sorted[0].total > 0 ? sorted[0].team : null;
  return { rows, leader };
}

/* ---------- Players and distance (need `player` in the data) ---------- */

// Transparent weights for the computed impact score. Not an official rating.
const WEIGHTS: Record<string, number> = {
  goal: 5, shot: 2, tackle: 1, interception: 1, carry: 0.3, pass: 0.2, foul: -1,
};

export interface PlayerStat {
  player: string;
  team: string;
  actions: number;
  goals: number;
  shots: number;
  score: number; // impact score, higher is better
  distanceM: number; // lower-bound estimate from event locations
}

export function playerStats(events: MatchEvent[]): PlayerStat[] {
  const byPlayer = new Map<string, MatchEvent[]>();
  for (const e of [...events].sort((a, b) => a.minute - b.minute)) {
    if (!e.player) continue;
    const key = `${e.team}|${e.player}`;
    const list = byPlayer.get(key);
    if (list) list.push(e);
    else byPlayer.set(key, [e]);
  }
  return [...byPlayer.values()]
    .map((list) => {
      let distance = 0;
      for (let i = 1; i < list.length; i++) distance += metres(list[i - 1], list[i]);
      const count = (type: string) => list.filter((e) => e.type === type).length;
      return {
        player: list[0].player ?? "",
        team: list[0].team,
        actions: list.length,
        goals: count("goal"),
        shots: count("shot"),
        score: Math.round(sum(list.map((e) => WEIGHTS[e.type] ?? 0)) * 10) / 10,
        distanceM: Math.round(distance),
      };
    })
    .sort((a, b) => b.score - a.score || b.actions - a.actions || a.player.localeCompare(b.player));
}

/** Metres the ball travelled between consecutive events of the same team (estimate). */
export function ballTravel(events: MatchEvent[], teams: string[]): number[] {
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  const totals = teams.map(() => 0);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.team !== b.team) continue;
    const t = teams.indexOf(b.team);
    if (t >= 0) totals[t] += metres(a, b);
  }
  return totals.map((n) => Math.round(n));
}