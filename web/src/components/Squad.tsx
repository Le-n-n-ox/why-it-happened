import { motion } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { getPlayers, getTactics } from "@/lib/api";
import { formatRating } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { FormationEstimate, Player } from "@/types/types";
import { teamColor } from "@/lib/match";

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

function LineupPitch({ players, ratings, color }: { players: Placed[]; ratings: Player[]; color: string }) {
  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-card bg-grass shadow-card sm:max-w-[460px]"
      role="img"
      aria-label="Line-up on a pitch"
    >
      {/* Pitch Markings */}
      <div className="absolute inset-2 rounded-md border-2 border-white/30" aria-hidden="true">
        <span className="absolute inset-x-0 top-1/2 h-[2px] bg-white/30" />
        <span className="absolute left-1/2 top-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
        {/* Top Penalty Box */}
        <span className="absolute left-[22%] top-0 h-[16%] w-[56%] border-b-2 border-x-2 border-white/30" />
        <span className="absolute left-[36%] top-0 h-[6%] w-[28%] border-b-2 border-x-2 border-white/30" />
        {/* Bottom Penalty Box */}
        <span className="absolute bottom-0 left-[22%] h-[16%] w-[56%] border-t-2 border-x-2 border-white/30" />
        <span className="absolute bottom-0 left-[36%] h-[6%] w-[28%] border-t-2 border-x-2 border-white/30" />
      </div>

      {players.map((p, index) => {
        const rating = ratings.find((r) => r.id === p.id || r.name === p.name)?.rating ?? null;
        return (
          <motion.div
            key={p.id ?? p.name}
            initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", bounce: 0.4, delay: index * 0.05 }}
            className="absolute grid justify-items-center gap-1 text-center group z-10"
            style={{ left: `${clamp(p.y)}%`, top: `${clamp(p.x)}%` }}
          >
            <div className="relative">
              <span 
                className="grid size-10 place-items-center rounded-full bg-surface shadow-md text-sm font-bold text-fg border-2 transition-transform duration-300 group-hover:scale-110"
                style={{ borderColor: color }}
              >
                {initials(p.name)}
              </span>
              {rating !== null && (
                <span className={cn(
                  "absolute -bottom-1 -right-2 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums shadow-sm border border-surface", 
                  pill(rating)
                )}>
                  {formatRating(rating)}
                </span>
              )}
            </div>
            <span className="max-w-[6rem] truncate rounded bg-black/40 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white backdrop-blur-sm">
              {p.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// Animation variants for the squad list
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0.3 } }
};

export function Squad({ team, teams = [] }: { team: string, teams?: string[] }) {
  const players = useApi(getPlayers, "all");
  const tactics = useApi(getTactics, team);
  const squad = (players.data ?? []).filter((p) => p.team.toLowerCase() === team.toLowerCase());
  const formation = tactics.data?.formation;
  const lineup = formation?.available ? placed(formation) : [];
  const shape = formation ? ["shape", "formation", "label"].map((k) => formation[k]).find((v) => typeof v === "string") : undefined;
  
  const color = teamColor(team, teams);

  if (squad.length === 0 && lineup.length === 0) return null;
  return (
    <section className={cn(ui.panel, "overflow-hidden")} aria-label="Squad">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-4 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <h3 className={ui.h3}>Squad & Tactics</h3>
        </div>
        {typeof shape === "string" && (
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted">
            {shape}
          </span>
        )}
      </div>

      {lineup.length >= 10 ? (
        <div className="my-6">
          <LineupPitch players={lineup} ratings={squad} color={color} />
        </div>
      ) : (
        formation && !formation.available && formation.reason && (
          <p className={ui.empty}>{formation.reason}</p>
        )
      )}

      <motion.ul 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mt-4"
      >
        {squad.map((p) => (
          <motion.li 
            key={p.id} 
            variants={item}
            className="group flex items-center justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-surface-3 hover:shadow-md"
          >
            <a 
              className="min-w-0 truncate font-semibold transition-colors group-hover:text-accent focus-visible:outline-accent" 
              href={`#/player/${encodeURIComponent(p.id)}`}
            >
              {p.name}
            </a>
            <span className="flex shrink-0 items-center gap-2">
              {p.goals > 0 && (
                <span className="text-sm drop-shadow-sm" aria-label={`${p.goals} goals`} title={`${p.goals} goals`}>
                  ⚽{p.goals > 1 ? <span className="text-xs font-bold">{p.goals}</span> : ""}
                </span>
              )}
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums shadow-sm", pill(p.rating))}>
                {formatRating(p.rating)}
              </span>
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}