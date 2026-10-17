import { useState } from "react";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters, type PlayerSort } from "@/components/players/PlayerFilters";
import { getPlayers } from "@/lib/api";
import { normalizePlayers } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useMatch } from "@/types/matchContext";
import type { PlayerSummary } from "@/types/types";

const byName = (a: PlayerSummary, b: PlayerSummary) => a.name.localeCompare(b.name);
const byRating = (a: PlayerSummary, b: PlayerSummary) =>
  (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || byName(a, b);
const byTeam = (a: PlayerSummary, b: PlayerSummary) =>
  a.team.localeCompare(b.team) || byRating(a, b);

export function PlayersPage() {
  const { teams } = useMatch();
  const { data, error, loading, retry } = useApi(getPlayers, "all");
  const [sort, setSort] = useState<PlayerSort>("rating");
  const [team, setTeam] = useState("all");

  const players = data === null ? [] : normalizePlayers(data);
  const playerTeams = [...new Set(players.map((player) => player.team))].filter(Boolean);
  const activeTeam = playerTeams.includes(team) ? team : "all";
  const list = players
    .filter((player) => activeTeam === "all" || player.team === activeTeam)
    .sort(sort === "rating" ? byRating : sort === "name" ? byName : byTeam);
  const top = Math.max(0, ...players.map((player) => player.rating ?? 0));
  const scaleMax = top <= 10 ? 10 : 100;

  return (
    <section className={ui.pageWide}>
      <div className="flex items-end justify-between gap-4 max-[600px]:items-start">
        <div>
          <p className="m-0 text-[.72rem] font-extrabold uppercase tracking-[.12em] text-accent">Match squad</p>
          <h2 className={`${ui.h2} mt-0.5`}>Players</h2>
        </div>
        {!loading && error === null && players.length > 0 && (
          <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-1.5 text-[.8rem] font-bold text-muted max-[600px]:mt-1">
            {players.length} players
          </span>
        )}
      </div>
      <p className={ui.empty}>Ratings come from the match backend. Select a player for the breakdown and review.</p>

      {loading && <Loader label="Loading players" />}
      {error !== null && (
        <p role="alert" className="m-0 rounded-card bg-warn px-3.5 py-2.5 text-black">
          Couldn't load players ({error}).{" "}
          <Button className="border-black bg-white text-black hover:bg-white/80" onClick={retry}>Retry</Button>
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
          <ol className="m-0 grid list-none gap-2.5 p-0">
            {list.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                scaleMax={scaleMax}
                teams={teams}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}