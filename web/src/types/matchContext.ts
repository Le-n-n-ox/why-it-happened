// web/src/matchContext.ts - shared match state, so every page reads one stream.
import { createContext, useContext } from "react";
import type { Insight, MatchEvent } from "@/types/types";
import type { StreamStatus } from "@/hooks/useMatchStream";

export interface MatchState {
  insights: Insight[]; // newest first
  status: StreamStatus;
  allEvents: MatchEvent[];
  eventsFailed: boolean;
  teams: string[];
  byId: Map<string, MatchEvent>;
  languages: string[];
  lang: string;
  changeLang: (code: string) => void;
  clock: number;
  ended: boolean;
  shown: MatchEvent[]; // events that have happened so far
  score: Record<string, number>;
  restart: () => void;
  follow: boolean;
  toggleFollow: () => void;
  selectedId: string | null;
  select: (id: string) => void;
}

export const MatchContext = createContext<MatchState | null>(null);

export function useMatch(): MatchState {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used inside <MatchProvider>");
  return ctx;
}