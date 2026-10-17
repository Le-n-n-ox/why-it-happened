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

export function PlayerFilters({
  sort, team, teams, matchTeams, onSortChange, onTeamChange,
}: PlayerFiltersProps) {
  return (
    <>
      <div className="sortbar">
        <span className="sortbar__label">Sort by</span>
        <div className="fav" role="group" aria-label="Sort players">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={sort === option.id}
              onClick={() => onSortChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {matchTeams.length > 1 && (
        <div className="team-filter">
          <span className="sortbar__label">Team</span>
          <div className="fav" role="group" aria-label="Filter by team">
            <button type="button" aria-pressed={team === "all"} onClick={() => onTeamChange("all")}>
              Both teams
            </button>
            {matchTeams.map((matchTeam) => (
              <button
                key={matchTeam}
                type="button"
                aria-pressed={team === matchTeam}
                onClick={() => onTeamChange(matchTeam)}
                style={{ borderColor: teamColor(matchTeam, teams) }}
              >
                {matchTeam}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
