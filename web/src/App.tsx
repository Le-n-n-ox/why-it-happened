// web/src/App.tsx - shell: header, navigation, banners and the current page.
import { formatMinute, languageName, teamColor } from "./match";
import { MatchProvider } from "./MatchProvider";
import { useMatch } from "./matchContext";
import { AboutPage } from "./pages/AboutPage";
import { AnnouncersPage } from "./pages/AnnouncersPage";
import { FansPage } from "./pages/FansPage";
import { InsightPage } from "./pages/InsightPage";
import { LivePage } from "./pages/LivePage";
import { RecapPage } from "./pages/RecapPage";
import { useHashRoute } from "./useHashRoute";

const INSIGHT_PREFIX = "/insight/";

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function Page({ path }: { path: string }) {
  if (path === "/recap") return <RecapPage />;
  if (path === "/announcers") return <AnnouncersPage />;
  if (path === "/fans") return <FansPage />;
  if (path === "/about") return <AboutPage />;
  if (path.startsWith(INSIGHT_PREFIX)) {
    return <InsightPage id={safeDecode(path.slice(INSIGHT_PREFIX.length))} />;
  }
  return <LivePage />;
}

const NAV = [
  { href: "#/", path: "/", label: "Live" },
  { href: "#/recap", path: "/recap", label: "Timeline" },
  { href: "#/announcers", path: "/announcers", label: "Announcers" },
  { href: "#/fans", path: "/fans", label: "Fans" },
  { href: "#/about", path: "/about", label: "How it works" },
];

function Shell() {
  const path = useHashRoute();
  const {
    teams, score, clock, ended, status, lang, languages, changeLang,
    follow, toggleFollow, restart, eventsFailed,
  } = useMatch();
  const [home, away] = teams;

  return (
    <main className="app">
      <header className="header">
        <h1>Why It Happened</h1>
        {away !== undefined && (
          <p className="scoreboard">
            <span className="scoreboard__team" style={{ color: teamColor(home, teams) }}>{home}</span>
            <span className="scoreboard__goals">{score[home]}</span>
            <span className="scoreboard__sep">-</span>
            <span className="scoreboard__goals">{score[away]}</span>
            <span className="scoreboard__team" style={{ color: teamColor(away, teams) }}>{away}</span>
            <span className="sr-only">{`Score: ${home} ${score[home]}, ${away} ${score[away]}`}</span>
          </p>
        )}
        <span className="clock">{ended ? "FT" : formatMinute(clock)}</span>
        <span className={`badge badge--${status}`}>{status}</span>
        <select value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language">
          {languages.map((code) => (
            <option key={code} value={code}>{languageName(code)}</option>
          ))}
        </select>
        <button type="button" aria-pressed={follow} onClick={toggleFollow}>
          Follow live: {follow ? "on" : "off"}
        </button>
        <button type="button" onClick={restart}>Replay</button>
      </header>

      <nav className="nav" aria-label="Pages">
        {NAV.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="nav__link"
            aria-current={n.path === path ? "page" : undefined}
          >
            {n.label}
          </a>
        ))}
      </nav>

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

      <Page path={path} />
    </main>
  );
}

export default function App() {
  return (
    <MatchProvider>
      <Shell />
    </MatchProvider>
  );
}