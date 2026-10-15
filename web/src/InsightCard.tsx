// web/src/InsightCard.tsx - one insight. A real <button>, so keyboard and screen readers just work.
import { memo } from "react";
import type { Insight } from "./types";
import { factChips, formatMinute, kindLabel, lacksLang, pickText, stripCitations } from "./match";

interface Props {
  insight: Insight;
  lang: string;
  color: string; // the team's colour (a CSS variable)
  selected: boolean;
  onSelect: (id: string) => void; // must be stable (useCallback) for memo to help
}

export const InsightCard = memo(function InsightCard({ insight, lang, color, selected, onSelect }: Props) {
  const fallback = lacksLang(insight, lang);
  return (
    <li className="card" style={{ borderLeftColor: color }}>
      <button
        type="button"
        className="card__button"
        aria-pressed={selected}
        onClick={() => onSelect(insight.id)}
      >
        <span className="card__meta">
          <span className="card__minute">{formatMinute(insight.minute)}</span>
          <span className="card__team" style={{ color }}>{insight.team}</span>
          <span className="card__kind">{kindLabel(insight.kind)}</span>
        </span>
        <span className="card__text" lang={fallback ? "en" : lang}>
          {stripCitations(pickText(insight, lang))}
          {fallback && <span className="tag">EN</span>}
        </span>
        <span className="card__chips">
          {factChips(insight).map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </span>
        <span className="card__evidence">Evidence: {insight.evidence.join(", ")}</span>
      </button>
    </li>
  );
});