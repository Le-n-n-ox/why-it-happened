// web/src/pages/PlayersPage.tsx - every player from /players: a card each, with the comparison control.
import { useState } from "react";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters, type PlayerSort } from "@/components/players/PlayerFilters";
import { useApi } from "@/hooks/useApi";
import { useCompare } from "@/hooks/useCompare";
import { getPlayers } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { Player } from "@/types/types";

const byName = (a: Player, b: Player) => a.name.localeCompare(b.name);
const byRating = (a: Player, b: Player) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || byName(a, b);
const byTeam = (a: Player, b: Player) => a.team.localeCompare(b.team) || byRating(a, b);

export function PlayersPage() {
  const { teams } = useMatch();
  const { data, error, loading, retry } = useApi(getPlayers, "all");
  const [sort, setSort] = useState<PlayerSort>("rating");
  const [team, setTeam] = useState("all");
  const { vs, setVs } = useCompare();

  const players = data ?? [];
  const playerTeams = [...new Set(players.map((p) => p.team))].filter(Boolean);
  const activeTeam = playerTeams.includes(team) ? team : "all";
  const list = players
    .filter((p) => activeTeam === "all" || p.team === activeTeam)
    .sort(sort === "rating" ? byRating : sort === "name" ? byName : byTeam);
  const opponent = players.find((p) => p.id === vs) ?? null;

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

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="players-compare" className="text-sm font-semibold">
              Compare with
            </label>
            <select
              id="players-compare"
              value={vs ?? ""}
              onChange={(e) => setVs(e.target.value || null)}
            >
              <option value="">No one</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {opponent && (
              <span className="text-[.85rem]" style={{ color: teamColor(opponent.team, teams) }}>
                {opponent.name} is the second player. Open any player to see them side by side.
              </span>
            )}
          </div>

          <ul className="m-0 grid list-none gap-2.5 p-0">
            {list.map((p, n) => (
              <PlayerCard
                key={p.id}
                player={p}
                rank={n + 1}
                teams={teams}
                onCompare={(id) => setVs(vs === id ? null : id)}
                comparing={vs === p.id}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
