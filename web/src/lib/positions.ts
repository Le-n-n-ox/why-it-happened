// web/src/lib/positions.ts - small helpers for the positions view. Every number here comes from the API.
import type { PositionedPlayer } from "@/types/types";

/** A dot fades as the sighting gets older: solid within a minute, faint after five. */
export function dotOpacity(since: number): number {
  if (since <= 1) return 1;
  if (since >= 5) return 0.25;
  return 1 - 0.75 * ((since - 1) / 4);
}

/** "just now", "1.4 min ago", "12 min ago": how long ago the player was last seen. */
export function sinceLabel(since: number): string {
  if (since < 0.1) return "just now";
  if (since < 10) return `${since.toFixed(1)} min ago`;
  return `${Math.round(since)} min ago`;
}

/** Team, then name: the order the list is shown in. */
export function byTeamThenName(a: PositionedPlayer, b: PositionedPlayer): number {
  return a.team.localeCompare(b.team) || a.player.localeCompare(b.player);
}
