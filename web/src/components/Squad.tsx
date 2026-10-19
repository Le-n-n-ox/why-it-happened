// web/src/components/Squad.tsx - squad ratings, plus a line-up on a pitch when the backend sends player positions.
import { useApi } from "@/hooks/useApi";
import { getPlayers, getTactics } from "@/lib/api";
import { formatRating } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { FormationEstimate, Player } from "@/types/types";

// Rating pills: 7 and up green, 5 and up amber, below 5 red.
const pill = (r: number | null): string =>
  r === null ? "bg-surface-3 text-fg" : r >= 7 ? "bg-accent text-accent-ink" : r >= 5 ? "bg-warn text-black" : "bg-live text-white";

const clamp = (n: number): number => Math.min(96, Math.max(4, n));
const initials = (name: string): string =>
  name.split(/\s+/).map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase();

interface Placed {
  id?: string;
  name: string;
  x: number; // 0-100 from the team's own goal line
  y: number;
}

/** formation.players is not in the contract yet: read it only if it is there and well formed. */
function placed(f: FormationEstimate): Placed[] {
  const raw = f["players"];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p): Placed[] =>
    typeof p === "object" && p !== null && typeof p.name === "string" && typeof p.x === "number" && typeof p.y === "number"
      ? [{ id: typeof p.id === "string" ? p.id : undefined, name: p.name, x: p.x, y: p.y }]
      : [],
  );
}

function LineupPitch({ players, ratings }: { players: Placed[]; ratings: Player[] }) {
  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-card bg-grass shadow-card"
      role="img"
      aria-label="Line-up on a pitch"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-white/40" aria-hidden="true" />
      <span className="absolute top-1/2 left-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" aria-hidden="true" />
      {players.map((p) => {
        const rating = ratings.find((r) => r.id === p.id || r.name === p.name)?.rating ?? null;
        return (
          <div
            key={p.id ?? p.name}
            className="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 text-center"
            style={{ left: `${clamp(p.y)}%`, top: `${clamp(p.x)}%` }}
          >
            <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-xs font-bold text-fg">
              {initials(p.name)}
            </span>
            {rating !== null && (
              <span className={cn("rounded-full px-1.5 text-[.7rem] font-bold tabular-nums", pill(rating))}>
                {formatRating(rating)}
              </span>
            )}
            <span className="max-w-[5.5rem] truncate text-[.7rem] font-semibold text-white">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Squad({ team }: { team: string }) {
  const players = useApi(getPlayers, "all");
  const tactics = useApi(getTactics, team);
  const squad = (players.data ?? []).filter((p) => p.team.toLowerCase() === team.toLowerCase());
  const formation = tactics.data?.formation;
  const lineup = formation?.available ? placed(formation) : [];
  const shape = formation ? ["shape", "formation", "label"].map((k) => formation[k]).find((v) => typeof v === "string") : undefined;

  if (squad.length === 0 && lineup.length === 0) return null;
  return (
    <section className={ui.panel} aria-label="Squad">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={ui.h3}>Squad</h3>
        {typeof shape === "string" && <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-bold">{shape}</span>}
      </div>

      {lineup.length >= 10 ? (
        <LineupPitch players={lineup} ratings={squad} />
      ) : (
        formation && !formation.available && formation.reason && <p className={ui.empty}>{formation.reason}</p>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {squad.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded-card bg-surface-2 px-3 py-2">
            <a className="min-w-0 truncate font-semibold hover:underline" href={`#/player/${encodeURIComponent(p.id)}`}>
              {p.name}
            </a>
            <span className="flex shrink-0 items-center gap-1.5">
              {p.goals > 0 && <span aria-label={`${p.goals} goals`} title={`${p.goals} goals`}>⚽{p.goals > 1 ? p.goals : ""}</span>}
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", pill(p.rating))}>
                {formatRating(p.rating)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}