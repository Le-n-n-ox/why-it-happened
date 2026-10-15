import { useCallback, useEffect, useState } from "react";
import { API } from "./api";
import type { Insight, MatchEvent } from "./types";

export type StreamStatus = "connecting" | "live" | "ended" | "error";

export function useMatchStream(speed?: number) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [ticks, setTicks] = useState<MatchEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [run, setRun] = useState(0);

  useEffect(() => {
    setInsights([]);
    setTicks([]);
    setStatus("connecting");
    let finished = false;

    const query = speed !== undefined ? `?speed=${speed}` : "";
    const source = new EventSource(`${API}/stream${query}`);

    const markLive = () => setStatus((s) => (s === "connecting" ? "live" : s));

    source.onopen = markLive;

    source.onmessage = (e: MessageEvent<string>) => {
      markLive();
      const insight = JSON.parse(e.data) as Insight;
      setInsights((prev) =>
        prev.some((p) => p.id === insight.id) ? prev : [insight, ...prev]
      );
    };

    source.addEventListener("tick", (e: Event) => {
      markLive();
      const tick = JSON.parse((e as MessageEvent<string>).data) as MatchEvent;
      setTicks((prev) =>
        prev.some((t) => t.id === tick.id) ? prev : [...prev, tick]
      );
    });

    source.addEventListener("done", () => {
      finished = true;
      setStatus("ended");
      source.close();
    });

    source.onerror = () => {
      if (finished) return;
      setStatus(
        source.readyState === EventSource.CLOSED ? "error" : "connecting"
      );
    };

    return () => {
      finished = true;
      source.close();
    };
  }, [run, speed]);

  const replay = useCallback(() => setRun((n) => n + 1), []);

  return { insights, ticks, status, replay };
}