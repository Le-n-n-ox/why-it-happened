// web/src/PlayerName.tsx - a player's name, linked to their page when the players list has a match.
import type { PlayerSummary } from "./types";

export function findPlayer(name: string, players: PlayerSummary[]): PlayerSummary | undefined {
  const key = name.trim().toLowerCase();
  return players.find((p) => p.id.toLowerCase() === key || p.name.toLowerCase() === key);
}

export function PlayerName({ name, players }: { name: string; players: PlayerSummary[] }) {
  const p = findPlayer(name, players);
  return p ? (
    <a className="link" href={`#/player/${encodeURIComponent(p.id)}`}>{p.name}</a>
  ) : (
    <span>{name}</span>
  );
}

export function NameList({ names, players }: { names: string[]; players: PlayerSummary[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 && ", "}
          <PlayerName name={n} players={players} />
        </span>
      ))}
    </>
  );
}