// web/src/layout/Header.tsx - sticky top bar: menu (mobile), score from /match, clock, status, narration, language, follow, replay.
import type { RefObject } from "react";
import { Menu, RotateCcw } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/Button";
import { NarrationBadge } from "@/components/NarrationBadge";
import type { StreamStatus } from "@/hooks/useMatchStream";
import { formatMinute, languageName, teamColor } from "@/lib/match";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

const BADGE: Record<StreamStatus, string> = {
  connecting: "bg-surface-2 text-muted ring-1 ring-line",
  live: "bg-live text-white ring-1 ring-live/40 shadow-sm before:size-[7px] before:animate-pulse-dot before:rounded-full before:bg-white before:content-['']",
  ended: "bg-surface-2 text-muted ring-1 ring-line",
  error: "bg-warn text-black ring-1 ring-warn/40 shadow-sm",
};

const GOALS = "font-heading text-[2.1rem] leading-none tabular-nums max-[900px]:text-[1.7rem]";
const teamHref = (team: string) => `#/team/${encodeURIComponent(team)}`;

interface HeaderProps {
  menuButton: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenMenu: () => void;
}

export function Header({ menuButton, open, onOpenMenu }: HeaderProps) {
  const {
    teams, score, clock, ended, status, lang, languages, changeLang,
    follow, toggleFollow, restart, match, health,
  } = useMatch();
  const [home, away] = teams;
  const source = match?.source ?? health?.source;

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-line bg-surface px-4 py-2.5 supports-[backdrop-filter]:bg-surface/85 supports-[backdrop-filter]:backdrop-blur-md">
      <button
        ref={menuButton}
        type="button"
        onClick={onOpenMenu}
        aria-expanded={open}
        aria-controls="sidebar"
        aria-label="Open menu"
        className="hidden size-10 place-items-center rounded-[10px] border border-line bg-surface-2 text-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface max-[900px]:grid"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <h1 className="m-0 font-heading text-lg font-bold sr-only max-[900px]:not-sr-only">
        Why It Happened
      </h1>

      {away !== undefined && (
        <p className="m-0 flex items-baseline gap-2.5 font-bold">
          <a
            href={teamHref(home)}
            className="text-[1.05rem] hover:underline hover:underline-offset-2"
            style={{ color: teamColor(home, teams) }}
          >
            {home}
          </a>
          <span className={GOALS}>
            {score ? <AnimatedNumber value={score[home] ?? 0} /> : "–"}
          </span>
          <span className="text-muted">-</span>
          <span className={GOALS}>
            {score ? <AnimatedNumber value={score[away] ?? 0} /> : "–"}
          </span>
          <a
            href={teamHref(away)}
            className="text-[1.05rem] hover:underline hover:underline-offset-2"
            style={{ color: teamColor(away, teams) }}
          >
            {away}
          </a>
          <span className="sr-only">
            {score
              ? `Score: ${home} ${score[home] ?? 0}, ${away} ${score[away] ?? 0}`
              : "Score shown at full time"}
          </span>
        </p>
      )}

      <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 font-heading text-lg font-bold tabular-nums text-accent ring-1 ring-accent/20">
        {ended ? "FT" : formatMinute(clock)}
      </span>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
          BADGE[status],
        )}
      >
        {status}
      </span>

      <NarrationBadge />

      {source && (
        <span className="hidden text-[0.7rem] font-medium uppercase tracking-wider text-muted/80 sm:inline">
          Data: {source}
        </span>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2 max-[900px]:ml-0 max-[900px]:w-full">
        <select
          value={lang}
          onChange={(e) => changeLang(e.target.value)}
          aria-label="Language"
          className="h-9 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium text-fg outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent"
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {languageName(code)}
            </option>
          ))}
        </select>

        <Button aria-pressed={follow} onClick={toggleFollow}>
          Follow live: {follow ? "on" : "off"}
        </Button>

        <Button onClick={restart} className="gap-1.5">
          <RotateCcw size={16} aria-hidden="true" />
          Replay
        </Button>
      </div>
    </header>
  );
}