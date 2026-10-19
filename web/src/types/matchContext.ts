// web/src/types/matchContext.ts - shared match state, so every page reads one stream.
import { createContext, useContext } from "react";
import type { StreamStatus } from "@/hooks/useMatchStream";
import type { Health, Insight, MatchEvent, MatchInfo, Prediction } from "@/types/types";

export interface MatchState {
  insights: Insight[]; // newest minute first
  status: StreamStatus;
  allEvents: MatchEvent[]; // /events: the whole match
  eventsFailed: boolean;
  teams: string[]; // [home, away] from /match
  byId: Map<string, MatchEvent>;
  shown: MatchEvent[]; // ticks so far: the events that have happened
  predictions: Prediction[];
  ball: MatchEvent | null; // the latest tick
  health: Health | null;
  match: MatchInfo | null;
  score: Record<string, number> | null; // /match score, or null while it is hidden
  languages: string[];
  lang: string;
  changeLang: (code: string) => void;
  clock: number;
  ended: boolean;
  restart: () => void;
  follow: boolean;
  toggleFollow: () => void;
  selectedId: string | null;
  select: (id: string) => void;
  pinned: string[] | null; // event ids highlighted on the pitch (from an event, a reason, a review...)
  pin: (ids: string[] | null) => void;
}

export const MatchContext = createContext<MatchState | null>(null);

export function useMatch(): MatchState {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used inside <MatchProvider>");
  return ctx;
}