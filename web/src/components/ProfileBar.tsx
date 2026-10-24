// web/src/components/ProfileBar.tsx - who is watching: mode, favourite clubs and players, one metric.
import { Button } from "@/components/Button";
import { useApi } from "@/hooks/useApi";
import { getPlayers } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { AudienceMode } from "@/types/types";

const MODES: { id: AudienceMode; label: string; hint: string }[] = [
  { id: "fan", label: "Fan", hint: "The story, your club and your player" },
  { id: "analyst", label: "Analyst", hint: "The measured factors and team numbers" },
  { id: "announcer", label: "Announcer", hint: "A timed cue sheet with the names" },
  { id: "player", label: "Player focus", hint: "One player across the whole match" },
];

export const METRICS: { id: string; label: string }[] = [
  { id: "", label: "No metric" },
  { id: "xg", label: "Expected goals" },
  { id: "shots", label: "Shots" },
  { id: "possession", label: "Share of play" },
  { id: "pressing", label: "High turnovers" },
  { id: "tempo", label: "Actions per minute" },
  { id: "final_third", label: "Final-third entries" },
  { id: "goals_created", label: "Goals created" },
  { id: "rating", label: "Player rating" },
];

const CHIP = "border-2 px-3 py-1.5 text-sm aria-pressed:bg-surface-2 aria-pressed:shadow-[0_0_0_2px_var(--accent)]";

/** The shared profile editor. Every page that personalises reads the same state. */
export function ProfileBar({ lockMode, showClubs = true }: { lockMode?: AudienceMode; showClubs?: boolean }) {
  const { teams, profile, setProfile } = useMatch();
  const { data: players } = useApi(getPlayers, "players");
  const names = players ?? [];
  const chosenClubs = profile.clubs;
  const chosenPlayer = profile.players[0] ?? "";
  const activeMode = lockMode ?? profile.mode;

  const toggleClub = (team: string) => {
    const clubs = profile.clubs.includes(team)
      ? profile.clubs.filter((club) => club !== team)
      : [...profile.clubs, team];
    setProfile({ clubs });
  };

  return (
    <section className={ui.panel} aria-label="Your viewing profile">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={ui.h3}>Your profile</h3>
        <Button
          onClick={() => setProfile(lockMode
            ? { clubs: [], players: [], metric: null }
            : { mode: "fan", clubs: [], players: [], metric: null })}
        >
          Reset
        </Button>
      </div>

      {!lockMode && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mode">
          {MODES.map((mode) => (
            <Button
              key={mode.id}
              className={CHIP}
              aria-pressed={profile.mode === mode.id}
              onClick={() => setProfile({ mode: mode.id })}
              title={mode.hint}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      )}
      <p className={ui.empty}>{MODES.find((mode) => mode.id === activeMode)?.hint}</p>

      {showClubs && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Favourite clubs">
          <span className="text-[.8rem] font-semibold uppercase text-muted">Clubs</span>
          <Button className={CHIP} aria-pressed={profile.clubs.length === 0} onClick={() => setProfile({ clubs: [] })}>
            Both
          </Button>
          {teams.map((team) => (
            <Button
              key={team}
              className={CHIP}
              aria-pressed={profile.clubs.includes(team)}
              onClick={() => toggleClub(team)}
              style={{ borderColor: teamColor(team, teams) }}
            >
              {team}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold uppercase text-muted">Player</span>
          <select
            value={chosenPlayer}
            onChange={(event) => setProfile({ players: event.target.value ? [event.target.value] : [] })}
            aria-label="Favourite player"
          >
            <option value="">All players</option>
            {names.map((player) => (
              <option key={player.id} value={player.name}>
                {player.name} ({player.team})
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold uppercase text-muted">Metric</span>
          <select
            value={profile.metric ?? ""}
            onChange={(event) => setProfile({ metric: event.target.value || null })}
            aria-label="Performance metric"
          >
            {METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>{metric.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className={ui.empty}>
        {chosenClubs.length > 0 ? `Following ${chosenClubs.join(" + ")}` : "Following both teams"}
        {chosenPlayer ? ` and ${chosenPlayer}` : ""}. Saved in this browser.
      </p>
    </section>
  );
}
