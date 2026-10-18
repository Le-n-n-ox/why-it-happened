// web/src/pages/PlayersPage.tsx - every player from /players: a table sorted by rating.
import { useState } from "react";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { PlayerFilters, type PlayerSort } from "@/components/players/PlayerFilters";
import { useApi } from "@/hooks/useApi";
import { getPlayers } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { formatRating, ratingPct, STAT_LABELS, type StatKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { Player } from "@/types/types";

const COLUMNS: StatKey[] = [
  "goals", "goals_created", "chains_involved", "touches", "passes", "carries", "shots", "tackles", "interceptions", "fouls",
];

const byName = (a: Player, b: Player) => a.name.localeCompare(b.name);
const byRating = (a: Player, b: Player) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || byName(a, b);
const byTeam = (a: Player, b: Player) => a.team.localeCompare(b.team) || byRating(a, b);

export function PlayersPage() {
  const { teams } = useMatch();
  const { data, error, loading, retry } = useApi(getPlayers, "all");
  const [sort, setSort] = useState<PlayerSort>("rating");
  const [team, setTeam] = useState("all");

  const players = data ?? [];
  const playerTeams = [...new Set(players.map((p) => p.team))].filter(Boolean);
  const activeTeam = playerTeams.includes(team) ? team : "all";
  const list = players
    .filter((p) => activeTeam === "all" || p.team === activeTeam)
    .sort(sort === "rating" ? byRating : sort === "name" ? byName : byTeam);

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Players</h2>
      <p className={ui.empty}>
        Every number comes from the match backend. Rating is the only player score. Shots include goals.
      </p>

      {loading && <Loader label="Loading players" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load players ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}
      {!loading && error === null && players.length === 0 && (
        <p className={ui.empty}>No players in this match data yet.</p>
      )}

      {players.length > 0 && (
        <>
          <PlayerFilters
            sort={sort}
            team={activeTeam}
            teams={teams}
            matchTeams={playerTeams}
            onSortChange={setSort}
            onTeamChange={setTeam}
          />
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full border-collapse text-[.88rem]">
              <thead>
                <tr>
                  <th className={ui.th}>#</th>
                  <th className={ui.th}>Player</th>
                  <th className={ui.th}>Team</th>
                  <th className={ui.th}>Rating</th>
                  {COLUMNS.map((k) => <th key={k} className={`${ui.th} whitespace-nowrap`}>{STAT_LABELS[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {list.map((p, n) => {
                  const color = teamColor(p.team, teams);
                  return (
                    <tr key={p.id} className="hover:bg-surface-2">
                      <td className={ui.td}>{n + 1}</td>
                      <td className={ui.td}>
                        <a className={`${ui.link} font-semibold`} href={`#/player/${encodeURIComponent(p.id)}`}>
                          {p.name}
                        </a>
                      </td>
                      <td className={ui.td} style={{ color }}>{p.team}</td>
                      <td className={ui.td}>
                        <div className="flex min-w-[120px] items-center gap-2">
                          <span className="min-w-[3ch] font-heading text-base font-bold tabular-nums">
                            {formatRating(p.rating)}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                            <span
                              className="block h-full animate-meter-in rounded-[inherit] transition-[width] duration-[600ms]"
                              style={{ width: `${ratingPct(p.rating)}%`, background: color }}
                            />
                          </div>
                        </div>
                      </td>
                      {COLUMNS.map((k) => (
                        <td key={k} className={`${ui.td} tabular-nums`}>{p[k]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}