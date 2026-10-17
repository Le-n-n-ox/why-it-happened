import type { RefObject } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Icon } from "@/components/icons";
import { PowerSwitch } from "@/components/PowerSwitch";
import { formatMinute, languageName, teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";

interface HeaderProps {
  menuButton: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenMenu: () => void;
}

export function Header({ menuButton, open, onOpenMenu }: HeaderProps) {
  const {
    teams, score, clock, ended, status, lang, languages, changeLang,
    follow, toggleFollow, restart,
  } = useMatch();
  const [home, away] = teams;

  return (
    <header className="topbar">
      <button
        ref={menuButton}
        type="button"
        className="icon-btn topbar__menu"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="sidebar"
        onClick={onOpenMenu}
      >
        <Icon name="menu" />
      </button>
      <span className="topbar__brand">Why It Happened</span>

      {away !== undefined && (
        <p className="scoreboard">
          <span className="scoreboard__team" style={{ color: teamColor(home, teams) }}>{home}</span>
          <span className="scoreboard__goals"><AnimatedNumber value={score[home]} /></span>
          <span className="scoreboard__sep">-</span>
          <span className="scoreboard__goals"><AnimatedNumber value={score[away]} /></span>
          <span className="scoreboard__team" style={{ color: teamColor(away, teams) }}>{away}</span>
          <span className="sr-only">{`Score: ${home} ${score[home]}, ${away} ${score[away]}`}</span>
        </p>
      )}
      <span className="clock">{ended ? "FT" : formatMinute(clock)}</span>
      <span className={`badge badge--${status}`}>{status}</span>

      <div className="topbar__actions">
        <select value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language">
          {languages.map((code) => (
            <option key={code} value={code}>{languageName(code)}</option>
          ))}
        </select>
        <PowerSwitch checked={follow} onChange={toggleFollow} label="Follow live" />
        <button type="button" onClick={restart}>
          <Icon name="replay" /> Replay
        </button>
      </div>
    </header>
  );
}
