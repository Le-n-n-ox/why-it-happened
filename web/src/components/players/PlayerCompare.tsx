// web/src/components/players/PlayerCompare.tsx - two players side by side, from the API's numbers only.
import { Button } from "@/components/Button";
import { Heatmap } from "@/components/Heatmap";
import { Loader } from "@/components/Loader";
import { RatingReceipt } from "@/components/RatingReceipt";
import { useApi } from "@/hooks/useApi";
import { getPlayer, getPlayers } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { formatRating, STAT_LABELS, type StatKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import type { MatchEvent, PlayerDetail } from "@/types/types";

const COUNTS: StatKey[] = [
  "touches", "passes", "carries", "shots", "goals", "tackles", "interceptions", "fouls",
  "progressive", "key_moments", "chains_involved",
];

interface ColumnProps {
  player: PlayerDetail;
  teams: string[];
  events: MatchEvent[];
}

/** One player: the rating and its breakdown, the main counts, and where their events happened. */
function CompareColumn({ player, teams, events }: ColumnProps) {
  const color = teamColor(player.team, teams);
  const mine = events.filter((e) => e.team === player.team && e.player === player.name);
  return (
    <div className="grid min-w-0 content-start gap-3 rounded-card border border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-heading text-lg font-bold">{player.name}</span>
        <span className="text-[.85rem] font-semibold" style={{ color }}>{player.team}</span>
        <span className="font-heading text-xl font-bold tabular-nums" aria-label={`Rating ${formatRating(player.rating)}`}>
          {formatRating(player.rating)}
        </span>
      </div>

      <RatingReceipt lines={player.rating_breakdown} rating={player.rating} />

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-1.5">
        {COUNTS.map((k) => (
          <div key={k} className="rounded-card bg-surface-2 px-2.5 py-1.5">
            <dt className="text-[.68rem] text-muted uppercase">{STAT_LABELS[k]}</dt>
            <dd className="m-0 font-bold tabular-nums">{player[k]}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2">
        <Heatmap events={mine} teams={teams} color={color} />
        <p className="m-0 text-[.8rem] text-muted">
          Where {player.name}'s {mine.length} events in the match data fell on the pitch.
        </p>
      </div>
    </div>
  );
}

interface Props {
  current: PlayerDetail;
  opponentId: string;
  teams: string[];
  events: MatchEvent[];
  onPick: (id: string) => void;
  onClear: () => void;
}

/** The compare panel: the player whose page this is, and the one chosen with ?vs=. */
export function PlayerCompare({ current, opponentId, teams, events, onPick, onClear }: Props) {
  const { data: opponent, loading, error, notFound } = useApi(getPlayer, opponentId);
  const roster = useApi(getPlayers, "all");
  const options = (roster.data ?? []).filter((p) => p.id !== current.id);
  // A shared link can name a player the roster does not list: keep it selectable anyway.
  const missing = opponent !== null && !options.some((p) => p.id === opponent.id);

  return (
    <section className={ui.panel} aria-label="Compare two players">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h3 className={ui.h3}>Compare</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="compare-opponent" className="text-sm font-semibold">
            Compare with
          </label>
          <select
            id="compare-opponent"
            value={opponentId}
            onChange={(e) => onPick(e.target.value)}
          >
            {missing && opponent && <option value={opponent.id}>{opponent.name}</option>}
            {options.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={onClear}>Clear</Button>
        </div>
      </div>

      <p className={ui.empty}>
        Every number comes from the player reports the server sends. The maps show where each player's
        own events fell on the pitch.
      </p>

      {loading && <Loader label="Loading the other player" />}
      {error !== null && notFound && (
        <p className={ui.empty}>That player is not in this match data.</p>
      )}
      {error !== null && !notFound && (
        <p role="alert" className={ui.banner}>Couldn't load the other player ({error}).</p>
      )}

      {opponent && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
          <CompareColumn player={current} teams={teams} events={events} />
          <CompareColumn player={opponent} teams={teams} events={events} />
        </div>
      )}
    </section>
  );
}
