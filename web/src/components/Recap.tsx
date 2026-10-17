import { useEffect, useState } from "react";
import { getRecap } from "@/lib/api";
import { formatMinute, keyMoments, pickText, stripCitations } from "@/lib/match";
import type { Insight, Recap as RecapData } from "@/types/types";

interface Props {
  insights: Insight[];
  lang: string;
  ended: boolean;
}

export function Recap({ insights, lang, ended }: Props) {
  const [recap, setRecap] = useState<RecapData | null>(null);

  useEffect(() => {
    if (!ended) {
      setRecap(null);
      return;
    }
    let cancelled = false;
    getRecap(lang)
      .then((r) => {
        if (!cancelled) setRecap(r);
      })
      .catch(() => {
        if (!cancelled) setRecap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ended, lang]);

  if (!ended) return null;

  return (
    <section className="recap" aria-label="Full-time recap">
      <h2>Full-time recap</h2>
      {recap?.text ? (
        <p lang={lang}>{stripCitations(recap.text)}</p>
      ) : (
        <ul>
          {keyMoments(insights).map((i) => (
            <li key={i.id}>
              {formatMinute(i.minute)} {i.team}: {stripCitations(pickText(i, lang))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}