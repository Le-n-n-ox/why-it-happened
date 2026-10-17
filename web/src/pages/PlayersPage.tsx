import { useState } from "react";
import { Loader } from "@/components/Loader";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters, type PlayerSort } from "@/components/players/PlayerFilters";
import { getPlayers } from "@/lib/api";
import { normalizePlayers } from "@/lib/players";
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
    <section className="page page--wide players-page">
      <div className="players-page__header">
        <div>
          <p className="eyebrow">Match squad</p>
          <h2>Players</h2>
        </div>
        {!loading && error === null && players.length > 0 && (
          <span className="players-page__count">{players.length} players</span>
        )}
      </div>
      <p className="empty">Ratings come from the match backend. Select a player for the breakdown and review.</p>

      {loading && <Loader label="Loading players" />}
      {error !== null && (
        <p role="alert" className="banner">
          Couldn't load players ({error}).{" "}
          <button type="button" onClick={retry}>Retry</button>
        </p>
      )}
      {!loading && error === null && players.length === 0 && (
        <p className="empty">No players in this match data yet.</p>
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
          <ol className="playerlist">
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
