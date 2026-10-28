// web/src/components/InsightCard.tsx - one insight: narration, then its four-step chain.
import { memo } from "react";
import { ChainSteps } from "@/components/ChainSteps";
import { factChips, formatMinute, kindLabel, lacksLang, pickText, stripCitations } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { Insight } from "@/types/types";

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
    <li
      className={`animate-slide-in rounded-card border border-l-4 border-line bg-surface transition hover:-translate-y-px hover:shadow-card ${selected ? "shadow-card" : ""}`}
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        className="grid w-full cursor-pointer gap-2 rounded-card p-3.5 text-left hover:bg-surface-3/30 aria-pressed:bg-surface-2/50"
        aria-pressed={selected}
        onClick={() => onSelect(insight.id)}
      >
        <span className={ui.meta}>
          <span className={ui.minute}>{formatMinute(insight.minute)}</span>
          <span className="font-bold" style={{ color }}>{insight.team}</span>
          <span>{kindLabel(insight.kind)}</span>
          {!selected && <span className="ml-auto text-[.72rem] text-muted">Why →</span>}
        </span>
        <span
          lang={fallback ? "en" : lang}
          className={`leading-relaxed ${selected ? "" : "line-clamp-3 text-muted"}`}
        >
          {stripCitations(pickText(insight, lang))}
          {fallback && <span className={ui.tag}>EN</span>}
        </span>
        {selected && <ChainSteps chain={insight.chain} />}
        <span className={ui.chips}>
          {factChips(insight).map((c) => (
            <span key={c} className={ui.chip}>{c}</span>
          ))}
        </span>
        {selected && (
          <span className={ui.chips}>
            {insight.evidence.map((e) => (
              <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
});