import { Button } from "@/components/Button";
import { teamColor } from "@/lib/match";

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

const ROW = "flex flex-wrap items-center gap-2.5";
const LABEL = "text-[.8rem] font-bold uppercase tracking-[.06em] text-muted";
const FAV = "flex flex-wrap gap-2";
const FAV_BUTTON = "border-2 px-4 py-2 aria-pressed:bg-surface-2 aria-pressed:shadow-[0_0_0_2px_var(--accent)]";

export function PlayerFilters({
  sort, team, teams, matchTeams, onSortChange, onTeamChange,
}: PlayerFiltersProps) {
  return (
    <>
      <div className={ROW}>
        <span className={LABEL}>Sort by</span>
        <div className={FAV} role="group" aria-label="Sort players">
          {SORTS.map((option) => (
            <Button
              key={option.id}
              className={FAV_BUTTON}
              aria-pressed={sort === option.id}
              onClick={() => onSortChange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {matchTeams.length > 1 && (
        <div className={ROW}>
          <span className={LABEL}>Team</span>
          <div className={FAV} role="group" aria-label="Filter by team">
            <Button className={FAV_BUTTON} aria-pressed={team === "all"} onClick={() => onTeamChange("all")}>
              Both teams
            </Button>
            {matchTeams.map((matchTeam) => (
              <Button
                key={matchTeam}
                className={FAV_BUTTON}
                aria-pressed={team === matchTeam}
                onClick={() => onTeamChange(matchTeam)}
                style={{ borderColor: teamColor(matchTeam, teams) }}
              >
                {matchTeam}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}