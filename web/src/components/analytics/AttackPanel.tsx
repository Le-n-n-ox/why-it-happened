import { CHANNEL_NAMES } from "@/lib/analytics";
import { Pitch } from "@/components/Pitch";
import { ui } from "@/lib/ui";
import type { MatchEvent } from "@/types/types";
import type { AttackRow, ZoneCell } from "@/lib/analytics";

interface AttackPanelProps {
  events: MatchEvent[];
  teams: string[];
  colors: string[];
  zones: ZoneCell[];
  rows: AttackRow[];
  leader: string | null;
}

export function AttackPanel({ events, teams, colors, rows, leader }: Omit<AttackPanelProps, 'zones'>) {
  const noAttacks = rows.every((row) => row.total === 0);
  return (
    <section className={ui.panel} aria-label="Where each team attacks">
      <h3 className={ui.h3}>Where each team attacks</h3>
      <p className={ui.empty}>
        Passes, carries and shots in each team's final third, split into the top, centre and bottom of the
        pitch map. Darker means more.
      </p>
      <Pitch events={events} selected={[]} teams={teams} />
      <ul className="m-0 grid list-disc gap-1 pl-5">
        {rows.map((row, index) => (
          <li key={row.team}>
            <strong style={{ color: colors[index] }}>{row.team}</strong>: {row.total} final-third actions
            {row.total > 0 && `, most through the ${CHANNEL_NAMES[row.bestChannel]} of the pitch (${row.bestCount})`}
          </li>
        ))}
      </ul>
      <p className="m-0 font-bold">
        {noAttacks ? "No attacking actions in the final third yet."
          : leader ? `${leader} attack the most.` : "Both teams have attacked equally so far."}
      </p>
    </section>
  );
}