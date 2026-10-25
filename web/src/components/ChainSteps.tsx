// web/src/components/ChainSteps.tsx - the "why" in four steps, and a card that wraps it.
import { formatMinute, kindLabel } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { CauseChain } from "@/types/types";

const STEPS = [
  { key: "trigger", label: "Trigger" },
  { key: "development", label: "Development" },
  { key: "payoff", label: "Payoff" },
  { key: "consequence", label: "Consequence" },
] as const;

/** Spans only, so it can sit inside a button. Empty steps are left out: nothing is invented. */
export function ChainSteps({ chain }: { chain: CauseChain | null | undefined }) {
  if (!chain) return null;
  const rows = STEPS.filter((s) => (chain[s.key] ?? "").trim() !== "");
  if (rows.length === 0) return null;
  return (
    <span className="grid gap-2 border-t border-line pt-2.5 text-[.85rem]">
      {rows.map((s, i) => (
        <span
          key={s.key}
          className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5"
        >
          <span className="grid size-5 place-items-center rounded-full bg-surface-2 text-[.65rem] font-bold text-accent ring-1 ring-accent/20">
            {i + 1}
          </span>
          <span className="grid gap-0.5">
            <span className="text-[.65rem] font-semibold uppercase tracking-wider text-muted">
              {s.label}
            </span>
            <span className="leading-relaxed text-fg">{chain[s.key]}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

/** A whole cause chain as a card: used for the three turning points. */
export function ChainCard({ chain, rank, color }: { chain: CauseChain; rank?: number; color: string }) {
  const hasSteps = STEPS.some((s) => (chain[s.key] ?? "").trim() !== "");
  return (
    <li
      className="grid gap-2.5 rounded-card border border-l-4 border-line bg-surface p-4 transition-colors hover:border-accent/30"
      style={{ borderLeftColor: color }}
    >
      <p className={`m-0 ${ui.meta}`}>
        {rank !== undefined && (
          <span className="grid size-5 place-items-center rounded-full bg-accent text-[.65rem] font-bold text-accent-ink shadow-sm">
            {rank}
          </span>
        )}
        <span className={`${ui.minute} tabular-nums`}>{formatMinute(chain.minute)}</span>
        <span className="font-bold" style={{ color }}>{chain.team}</span>
        <span>{kindLabel(chain.kind)}</span>
      </p>

      {hasSteps ? (
        <ChainSteps chain={chain} />
      ) : (
        chain.summary && <p className="m-0 leading-relaxed">{chain.summary}</p>
      )}

      <div className={ui.chips}>
        {chain.evidence.map((e) => (
          <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
        ))}
      </div>

      <a
        className={`${ui.link} text-sm`}
        href={`#/insight/${encodeURIComponent(chain.insight_id)}`}
      >
        Open insight →
      </a>
    </li>
  );
}