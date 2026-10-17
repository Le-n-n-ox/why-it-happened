// web/src/App.tsx - shell: sidebar, topbar, banners and the current page.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Icon } from "./icons";
import { formatMinute, languageName, teamColor } from "./match";
import { MatchProvider } from "./MatchProvider";
import { useMatch } from "./matchContext";
import { AboutPage } from "./pages/AboutPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AnnouncersPage } from "./pages/AnnouncersPage";
import { FansPage } from "./pages/FansPage";
import { InsightPage } from "./pages/InsightPage";
import { LivePage } from "./pages/LivePage";
import { PlayerPage } from "./pages/PlayerPage";
import { PlayersPage } from "./pages/PlayersPage";
import { RecapPage } from "./pages/RecapPage";
import { Sidebar } from "./Sidebar";
import { useHashRoute } from "./useHashRoute";
import { useTheme } from "./useTheme";

const INSIGHT_PREFIX = "/insight/";
const PLAYER_PREFIX = "/player/";

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function Page({ path }: { path: string }) {
  if (path === "/recap") return <RecapPage />;
  if (path === "/analytics") return <AnalyticsPage />;
  if (path === "/players") return <PlayersPage />;
  if (path.startsWith(PLAYER_PREFIX)) {
    return <PlayerPage id={safeDecode(path.slice(PLAYER_PREFIX.length))} />;
  }
  if (path === "/announcers") return <AnnouncersPage />;
  if (path === "/fans") return <FansPage />;
  if (path === "/about") return <AboutPage />;
  if (path.startsWith(INSIGHT_PREFIX)) {
    return <InsightPage id={safeDecode(path.slice(INSIGHT_PREFIX.length))} />;
  }
  return <LivePage />;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem("nav") === "collapsed";
  } catch {
    return false; // storage can be blocked
  }
}

function Shell() {
  const path = useHashRoute();
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    teams, score, clock, ended, status, lang, languages, changeLang,
    follow, toggleFollow, restart, eventsFailed,
  } = useMatch();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [home, away] = teams;

  useEffect(() => {
    try {
      localStorage.setItem("nav", collapsed ? "collapsed" : "open");
    } catch {
      /* storage blocked: ignore */
    }
  }, [collapsed]);

  // Mobile drawer: move focus in when it opens, close on Escape.
  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLElement>("#sidebar a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <div className="shell" data-open={open} data-collapsed={collapsed}>
      <Sidebar
        path={path}
        collapsed={collapsed}
        theme={theme}
        onNavigate={closeMenu}
        onClose={closeMenu}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onToggleTheme={toggleTheme}
      />
      <button type="button" className="backdrop" tabIndex={-1} aria-label="Close menu" onClick={closeMenu} />

      <div className="shell__main">
        <header className="topbar">
          <button
            ref={menuButton}
            type="button"
            className="icon-btn topbar__menu"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="sidebar"
            onClick={() => setOpen(true)}
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
            <button type="button" aria-pressed={follow} onClick={toggleFollow}>
              Follow live: {follow ? "on" : "off"}
            </button>
            <button type="button" onClick={restart}>
              <Icon name="replay" /> Replay
            </button>
          </div>
        </header>

        <main className="content">
          {status === "error" && (
            <p role="alert" className="banner">
              Can't reach the match feed. Is the backend running?{" "}
              <button type="button" onClick={restart}>Retry</button>
            </p>
          )}
          {eventsFailed && status !== "error" && (
            <p role="alert" className="banner">
              Couldn't load match events, so the pitch is unavailable.{" "}
              <button type="button" onClick={() => window.location.reload()}>Reload</button>
            </p>
          )}
          <div key={path} className="page-enter">
            <Page path={path} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MatchProvider>
      <Shell />
    </MatchProvider>
  );
}