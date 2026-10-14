// web/src/useInsightStream.ts - live insights from the API via Server-Sent Events.
import { useEffect, useState } from "react";
import type { Insight } from "./types";

const API: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useInsightStream(): Insight[] {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    const source = new EventSource(`${API}/stream`);

    source.onmessage = (e: MessageEvent<string>) => {
      const insight = JSON.parse(e.data) as Insight;
      setInsights((prev) =>
        prev.some((p) => p.id === insight.id) ? prev : [insight, ...prev], // newest first, no duplicates
      );
    };

    // The server ends the replay with a "done" event. Close, or the browser reconnects and replays again.
    source.addEventListener("done", () => source.close());
    source.onerror = () => console.warn("stream interrupted");

    return () => source.close();
  }, []);

  return insights;
}
