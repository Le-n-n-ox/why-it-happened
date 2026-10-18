// web/src/layout/Header.tsx - sticky top bar: menu button (mobile), score, clock, status, language, follow, replay.
import type { RefObject } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import type { StreamStatus } from "@/hooks/useMatchStream";
import { formatMinute, languageName, teamColor } from "@/lib/match";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

const BADGE: Record<StreamStatus, string> = {
  connecting: "bg-surface-2 text-muted",
  live: "bg-live text-white before:size-[7px] before:animate-pulse-dot before:rounded-full before:bg-white before:content-['']",
  ended: "bg-surface-2 text-muted",
  error: "bg-warn text-black",
};

interface HeaderProps {
  menuButton: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenMenu: () => void;
}

export function Header({ menuButton, open, onOpenMenu }: HeaderProps) {
  const {
    teams, score, clock, ended, status, lang, languages, changeLang, follow, toggleFollow, restart,
  } = useMatch();
  const [home, away] = teams;

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-line bg-bg px-4 py-2.5 supports-[backdrop-filter]:bg-bg/80 supports-[backdrop-filter]:backdrop-blur-[14px]">
      {/* Menu button: only below 900px, where the sidebar becomes a drawer. */}
      <button
        ref={menuButton}
        type="button"
        onClick={onOpenMenu}
        aria-expanded={open}
        aria-controls="sidebar"
        aria-label="Open menu"
        className="hidden size-10 place-items-center rounded-[10px] border border-line bg-surface-2 hover:bg-surface-3 max-[900px]:grid"
      >
        <Icon name="menu" />
      </button>

      {/* The sidebar carries the brand on desktop, so the title is visible on mobile only. */}
      <h1 className="m-0 font-heading text-lg font-bold sr-only max-[900px]:not-sr-only">Why It Happened</h1>

      {away !== undefined && (
        <p className="m-0 flex items-baseline gap-2.5 font-bold">
          <span className="text-[1.05rem]" style={{ color: teamColor(home, teams) }}>{home}</span>
          <span className="font-heading text-[2.1rem] leading-none tabular-nums max-[900px]:text-[1.7rem]">
            <AnimatedNumber value={score[home]} />
          </span>
          <span className="text-muted">-</span>
          <span className="font-heading text-[2.1rem] leading-none tabular-nums max-[900px]:text-[1.7rem]">
            <AnimatedNumber value={score[away]} />
          </span>
          <span className="text-[1.05rem]" style={{ color: teamColor(away, teams) }}>{away}</span>
          <span className="sr-only">{`Score: ${home} ${score[home]}, ${away} ${score[away]}`}</span>
        </p>
      )}

      <span className="font-heading text-xl font-bold tabular-nums text-accent">
        {ended ? "FT" : formatMinute(clock)}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
          BADGE[status],
        )}
      >
        {status}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2 max-[900px]:ml-0 max-[900px]:w-full">
        <select value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language">
          {languages.map((code) => (
            <option key={code} value={code}>{languageName(code)}</option>
          ))}
        </select>
        <Button aria-pressed={follow} onClick={toggleFollow}>
          Follow live: {follow ? "on" : "off"}
        </Button>
        <Button onClick={restart}>
          <Icon name="replay" /> Replay
        </Button>
      </div>
    </header>
  );
}