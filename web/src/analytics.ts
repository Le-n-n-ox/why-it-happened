// web/src/analytics.ts - pure chart data, computed from events and insights only.
import type { Insight, MatchEvent } from "./types";

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