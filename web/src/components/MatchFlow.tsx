import { describeEvent } from "@/lib/matchFlow";
import { formatMinute, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { MatchEvent } from "@/types/types";

export function MatchFlow({ events, teams, technical = false }: {
  events: MatchEvent[];
  teams: string[];
  technical?: boolean;
}) {
  const recent = events.slice(-5).reverse();
  return (
    <section className="grid gap-2 rounded-card border border-line bg-surface px-4 py-3" aria-label="Live match flow">
      <h3 className={`${ui.h3} m-0`}>{technical ? "Live match flow" : "What's happening"}</h3>
      {recent.length === 0 ? (
        <p className={`${ui.empty} m-0`}>Waiting for the first match event...</p>
      ) : (
        <ol className="grid gap-2">
          {recent.map((event) => (
            <li key={event.id} className="flex items-start gap-2">
              <span className={`${ui.minute} shrink-0`}>{formatMinute(event.minute)}</span>
              <span className="font-bold" style={{ color: teamColor(event.team, teams) }}>{event.team}</span>
              <span>{describeEvent(event, technical)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
