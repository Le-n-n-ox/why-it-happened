// web/src/pages/PlayersPage.tsx - every player, best rated first.
import { useState } from "react";
import { getPlayers } from "../api";
import { Loader } from "../Loader";
import { teamColor } from "../match";
import { useMatch } from "../matchContext";
import { formatRating, normalizePlayers, prettyKey } from "../players";
import type { PlayerSummary } from "../types";
import { useApi } from "../useApi";

type Sort = "rating" | "name" | "team";
const SORTS: { id: Sort; label: string }[] = [
  { id: "rating", label: "Rating" },
  { id: "name", label: "Name" },
  { id: "team", label: "Team" },
];

const byName = (a: PlayerSummary, b: PlayerSummary) => a.name.localeCompare(b.name);
const byRating = (a: PlayerSummary, b: PlayerSummary) =>
  (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || byName(a, b);
const byTeam = (a: PlayerSummary, b: PlayerSummary) => a.team.localeCompare(b.team) || byRating(a, b);

export function PlayersPage() {
  const { teams } = useMatch();
  const { data, error, loading, retry } = useApi(getPlayers, "all");
  const [sort, setSort] = useState<Sort>("rating");
  const [team, setTeam] = useState("all");

  const players = data === null ? [] : normalizePlayers(data);
  const playerTeams = [...new Set(players.map((p) => p.team))].filter((t) => t !== "");
  const activeTeam = playerTeams.includes(team) ? team : "all";
  const list = players
    .filter((p) => activeTeam === "all" || p.team === activeTeam)
    .sort(sort === "rating" ? byRating : sort === "name" ? byName : byTeam);

  // Bar scale is a guess: ratings up to 10 use /10, anything larger uses /100.
  const top = Math.max(0, ...players.map((p) => p.rating ?? 0));
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

      {loading && (
        <Loader label="Loading players" />
      )}

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
          <div className="sortbar">
            <span className="sortbar__label">Sort by</span>
            <div className="fav" role="group" aria-label="Sort players">
              {SORTS.map((s) => (
                <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {playerTeams.length > 1 && (
            <div className="team-filter">
              <span className="sortbar__label">Team</span>
              <div className="fav" role="group" aria-label="Filter by team">
                <button type="button" aria-pressed={activeTeam === "all"} onClick={() => setTeam("all")}>
                  Both teams
                </button>
                {playerTeams.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={activeTeam === t}
                    onClick={() => setTeam(t)}
                    style={{ borderColor: teamColor(t, teams) }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ol className="playerlist">
            {list.map((p, n) => {
              const color = teamColor(p.team, teams);
              const pct = p.rating === null ? 0 : Math.max(0, Math.min(100, (p.rating / scaleMax) * 100));
              return (
                <li key={p.id} className="pcard" style={{ borderLeftColor: color }}>
                  <span className="pcard__rank" aria-hidden="true">{n + 1}</span>
                  <div className="pcard__main">
                    <a className="pcard__name" href={`#/player/${encodeURIComponent(p.id)}`}>{p.name}</a>
                    <div className="card__meta">
                      <span className="card__team" style={{ color }}>{p.team}</span>
                    </div>
                    <div className="card__chips">
                      {p.stats.slice(0, 4).map((s) => (
                        <span key={s.key} className="chip">{prettyKey(s.key)}: {s.value}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pcard__rating">
                    <span className="rating" aria-label={`Rating ${formatRating(p.rating)}`}>
                      {formatRating(p.rating)}
                    </span>
                    <div className="rating-bar" aria-hidden="true">
                      <span style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}