// web/src/PlayerName.tsx - a player's name, linked to their page when the players list has a match.
import type { PlayerSummary } from "@/types/types";

export function findPlayer(name: string, players: PlayerSummary[]): PlayerSummary | undefined {
  const key = name.trim().toLowerCase();
  return players.find((p) => p.id.toLowerCase() === key || p.name.toLowerCase() === key);
}

export function PlayerName({ name, players }: { name: string; players: PlayerSummary[] }) {
  const p = findPlayer(name, players);
  return p ? (
    <a className="pname" href={`#/player/${encodeURIComponent(p.id)}`}>{p.name}</a>
  ) : (
    <span className="pname pname--plain">{name}</span>
  );
}

export function NameList({ names, players }: { names: string[]; players: PlayerSummary[] }) {
  return (
    <span className="namelist">
      {names.map((n) => (
        <PlayerName key={n} name={n} players={players} />
      ))}
    </span>
  );
}