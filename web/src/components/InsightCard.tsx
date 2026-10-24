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
      className="animate-slide-in rounded-card border border-l-4 border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card"
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        className="grid w-full cursor-pointer gap-2 rounded-card p-3.5 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset aria-pressed:bg-surface-2 aria-pressed:ring-1 aria-pressed:ring-accent/20"
        aria-pressed={selected}
        onClick={() => onSelect(insight.id)}
      >
        <span className={ui.meta}>
          <span className={ui.minute}>{formatMinute(insight.minute)}</span>
          <span className="font-bold" style={{ color }}>{insight.team}</span>
          <span>{kindLabel(insight.kind)}</span>
        </span>

        <span className="leading-relaxed" lang={fallback ? "en" : lang}>
          {stripCitations(pickText(insight, lang))}
          {fallback && <span className={ui.tag}>EN</span>}
        </span>

        <ChainSteps chain={insight.chain} />

        <span className={ui.chips}>
          {factChips(insight).map((c) => (
            <span key={c} className={ui.chip}>{c}</span>
          ))}
        </span>

        <span className={ui.chips}>
          {insight.evidence.map((e) => (
            <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
          ))}
        </span>
      </button>
    </li>
  );
});