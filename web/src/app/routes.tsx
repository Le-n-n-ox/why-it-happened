// web/src/app/routes.tsx - hash routes: "#/team/Reds" -> path "/team/Reds".
import { AboutPage } from "@/pages/AboutPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AnnouncersPage } from "@/pages/AnnouncersPage";
import { AskPage } from "@/pages/AskPage";
import { FansPage } from "@/pages/FansPage";
import { FoulsPage } from "@/pages/FoulsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { InsightPage } from "@/pages/InsightPage";
import { LivePage } from "@/pages/LivePage";
import { PlayerPage } from "@/pages/PlayerPage";
import { PlayersPage } from "@/pages/PlayersPage";
import { PositionsPage } from "@/pages/PositionsPage";
import { RecapPage } from "@/pages/RecapPage";
import { ResultPage } from "@/pages/ResultPage";
import { TeamPage } from "@/pages/TeamPage";

const INSIGHT_PREFIX = "/insight/";
const PLAYER_PREFIX = "/player/";
const TEAM_PREFIX = "/team/";

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function RoutePage({ path }: { path: string }) {
  if (path === "/result") return <ResultPage />;
  if (path === "/recap") return <RecapPage />;
  if (path === "/ask") return <AskPage />;
  if (path === "/positions") return <PositionsPage />;
  if (path === "/history") return <HistoryPage />;
  if (path === "/teams") return <TeamPage />;
  if (path.startsWith(TEAM_PREFIX)) return <TeamPage team={safeDecode(path.slice(TEAM_PREFIX.length))} />;
  if (path === "/players") return <PlayersPage />;
  if (path.startsWith(PLAYER_PREFIX)) return <PlayerPage id={safeDecode(path.slice(PLAYER_PREFIX.length))} />;
  if (path === "/fouls") return <FoulsPage />;
  if (path === "/analytics") return <AnalyticsPage />;
  if (path === "/announcers") return <AnnouncersPage />;
  if (path === "/fans") return <FansPage />;
  if (path === "/about") return <AboutPage />;
  if (path.startsWith(INSIGHT_PREFIX)) return <InsightPage id={safeDecode(path.slice(INSIGHT_PREFIX.length))} />;
  return <LivePage />;
}