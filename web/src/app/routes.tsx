import { AboutPage } from "@/pages/AboutPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AnnouncersPage } from "@/pages/AnnouncersPage";
import { FansPage } from "@/pages/FansPage";
import { InsightPage } from "@/pages/InsightPage";
import { LivePage } from "@/pages/LivePage";
import { PlayerPage } from "@/pages/PlayerPage";
import { PlayersPage } from "@/pages/PlayersPage";
import { RecapPage } from "@/pages/RecapPage";

const INSIGHT_PREFIX = "/insight/";
const PLAYER_PREFIX = "/player/";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function RoutePage({ path }: { path: string }) {
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
