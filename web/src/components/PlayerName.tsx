// web/src/components/PlayerName.tsx - a player's name, linked to their page when the players list has a match.
import { ui } from "../lib/ui";
import type { PlayerSummary } from "../types/types";

export function findPlayer(name: string, players: PlayerSummary[]): PlayerSummary | undefined {
  const key = name.trim().toLowerCase();
  return players.find((p) => p.id.toLowerCase() === key || p.name.toLowerCase() === key);
}

export function PlayerName({ name, players }: { name: string; players: PlayerSummary[] }) {
  const p = findPlayer(name, players);
  return p ? (
    <a
      className={`${ui.link} inline-flex items-center gap-0.5 rounded-sm transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      href={`#/player/${encodeURIComponent(p.id)}`}
    >
      {p.name}
    </a>
  ) : (
    <span className="text-muted">{name}</span>
  );
}

export function NameList({ names, players }: { names: string[]; players: PlayerSummary[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 && <span className="text-muted" aria-hidden="true">{", "}</span>}
          <PlayerName name={n} players={players} />
        </span>
      ))}
    </>
  );
}