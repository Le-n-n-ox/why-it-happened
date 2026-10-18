import type { Health, MatchEvent, Recap } from "@/types/types";

export const API: string = import.meta.env.VITE_API_URL ?? "";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const getHealth = () => getJson<Health>("/health");
export const getEvents = () => getJson<MatchEvent[]>("/events");
export const getRecap = (lang: string) =>
  getJson<Recap>(`/recap?lang=${encodeURIComponent(lang)}`);

// Player endpoints return unknown on purpose: players.ts reads them defensively.
export const getPlayers = () => getJson<unknown>("/players");
export const getPlayer = (id: string) => getJson<unknown>(`/players/${encodeURIComponent(id)}`);
export const getPlayerReview = (id: string, lang: string) =>
  getJson<unknown>(`/players/${encodeURIComponent(id)}/review?lang=${encodeURIComponent(lang)}`);
export const getEventWhy = (id: string) => getJson<unknown>(`/events/${encodeURIComponent(id)}/why`);

export const getMatchWhy = (lang: string) => getJson<unknown>(`/why?lang=${encodeURIComponent(lang)}`);