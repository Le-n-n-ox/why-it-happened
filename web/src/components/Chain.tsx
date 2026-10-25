// web/src/components/Chain.tsx - an insight's chain of events: full stepper, and a one-line summary for cards.
import { Button } from "@/components/Button";
import { formatMinute } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { ChainStep } from "@/lib/why";

export function ChainInline({ steps }: { steps: ChainStep[] }) {
  if (steps.length === 0) return null;
  return (
    <span className="line-clamp-2 text-[.8rem] leading-relaxed text-muted">
      <span className="font-semibold text-fg">Chain: </span>
      {steps.map((s) => s.label).join(" → ")}
    </span>
  );
}

interface ChainProps {
  steps: ChainStep[];
  onShow?: (ids: string[]) => void; // highlights a step's events on the pitch
}

export function Chain({ steps, onShow }: ChainProps) {
  if (steps.length === 0) return null;
  return (
    <ol className="m-0 grid list-none gap-0 p-0" aria-label="Chain of events">
      {steps.map((s, i) => (
        <li
          key={`${i}-${s.label}`}
          className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 pb-4 last:pb-0"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-[13px] top-7 w-px bg-line"
            />
          )}
          <span className="z-[1] grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink shadow-sm">
            {i + 1}
          </span>
          <div className="grid min-w-0 gap-1.5 pt-0.5">
            <p className="m-0 leading-relaxed">{s.label}</p>
            {(s.minute !== undefined || s.player !== undefined) && (
              <p className={`m-0 ${ui.meta}`}>
                {s.minute !== undefined && (
                  <span className={`${ui.minute} tabular-nums`}>{formatMinute(s.minute)}</span>
                )}
                {s.player !== undefined && <span>{s.player}</span>}
              </p>
            )}
            {s.evidence.length > 0 && (
              <div className={ui.chips}>
                {s.evidence.map((e) => (
                  <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
                ))}
                {onShow && (
                  <Button
                    className="px-2.5 py-0.5 text-xs"
                    onClick={() => onShow(s.evidence)}
                    aria-label={`Show step ${i + 1} on pitch`}
                  >
                    Show on pitch
                  </Button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}