// web/src/hooks/useMatchStream.ts - live insights and one tick per match event.
import { useCallback, useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { Insight, MatchEvent } from "@/types/types";

export type StreamStatus = "connecting" | "live" | "ended" | "error";

// Newest minute first. Order by minute, never by arrival: narration can land a second after its tick.
const byMinuteDesc = (a: Insight, b: Insight) => b.minute - a.minute || a.id.localeCompare(b.id);

function parse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** `speed` is seconds per match minute (0 to 5). `source` is "live" to follow a match pushed in by a feed. */
export function useMatchStream(speed?: number, source?: string) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [ticks, setTicks] = useState<MatchEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [run, setRun] = useState(0); // bump to replay the match

  useEffect(() => {
    setInsights([]);
    setTicks([]);
    setStatus("connecting");
    let finished = false;

    const query = new URLSearchParams();
    if (speed !== undefined) query.set("speed", String(Math.min(5, Math.max(0, speed))));
    if (source !== undefined) query.set("source", source);
    const qs = query.toString();
    const stream = new EventSource(`${API}/stream${qs ? `?${qs}` : ""}`);

    const markLive = () => setStatus((s) => (s === "connecting" ? "live" : s));
    stream.onopen = markLive;

    stream.onmessage = (e: MessageEvent<string>) => {
      markLive();
      const insight = parse<Insight>(e.data);
      if (!insight) return;
      setInsights((prev) => (prev.some((p) => p.id === insight.id) ? prev : [...prev, insight].sort(byMinuteDesc)));
    };

    stream.addEventListener("tick", (e: Event) => {
      markLive();
      const tick = parse<MatchEvent>((e as MessageEvent<string>).data);
      if (!tick) return;
      setTicks((prev) => (prev.some((t) => t.id === tick.id) ? prev : [...prev, tick]));
    });

    // End of match: close it, or the browser would reconnect and replay the match.
    stream.addEventListener("done", () => {
      finished = true;
      setStatus("ended");
      stream.close();
    });

    // Never reconnect automatically: close and let the viewer press Retry.
    stream.onerror = () => {
      if (finished) return;
      finished = true;
      stream.close();
      setStatus("error");
    };

    return () => {
      finished = true;
      stream.close();
    };
  }, [run, speed, source]);

  const replay = useCallback(() => setRun((n) => n + 1), []);
  return { insights, ticks, status, replay };
}