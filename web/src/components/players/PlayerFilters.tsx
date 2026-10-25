import { motion } from "framer-motion";
import { teamColor } from "@/lib/match";
import { cn } from "@/lib/utils";

export type PlayerSort = "rating" | "name" | "team";

interface PlayerFiltersProps {
  sort: PlayerSort;
  team: string;
  teams: string[];
  matchTeams: string[];
  onSortChange: (sort: PlayerSort) => void;
  onTeamChange: (team: string) => void;
}

const SORTS: { id: PlayerSort; label: string }[] = [
  { id: "rating", label: "Rating" },
  { id: "name", label: "Name" },
  { id: "team", label: "Team" },
];

export function PlayerFilters({
  sort, team, teams, matchTeams, onSortChange, onTeamChange,
}: PlayerFiltersProps) {
  return (
    <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
      
      {/* Sort By Filter */}
      <div className="flex flex-col gap-2">
        <span className="ml-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">
          Sort by
        </span>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface-2 p-1" role="group" aria-label="Sort players">
          {SORTS.map((option) => {
            const isActive = sort === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSortChange(option.id)}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive ? "text-accent-ink" : "text-muted hover:text-fg"
                )}
                aria-pressed={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="sort-active-pill"
                    className="absolute inset-0 rounded-full bg-accent shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Filter */}
      {matchTeams.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="ml-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">
            Team
          </span>
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface-2 p-1" role="group" aria-label="Filter by team">
            <button
              onClick={() => onTeamChange("all")}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                team === "all" ? "text-fg" : "text-muted hover:text-fg"
              )}
              aria-pressed={team === "all"}
            >
              {team === "all" && (
                <motion.div
                  layoutId="team-active-pill"
                  className="absolute inset-0 rounded-full border border-line bg-surface-3 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">Both teams</span>
            </button>

            {matchTeams.map((matchTeam) => {
              const isActive = team === matchTeam;
              const color = teamColor(matchTeam, teams);
              return (
                <button
                  key={matchTeam}
                  onClick={() => onTeamChange(matchTeam)}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !isActive && "text-muted hover:text-fg"
                  )}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="team-active-pill"
                      className="absolute inset-0 rounded-full border bg-surface-3 shadow-sm"
                      style={{ borderColor: color }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span 
                    className="relative z-10 transition-colors duration-300"
                    style={{ color: isActive ? color : undefined }}
                  >
                    {matchTeam}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
    </div>
  );
}