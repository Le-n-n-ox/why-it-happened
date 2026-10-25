// web/src/components/EvidenceChips.tsx - evidence ids as chips, with an optional highlight-on-pitch button.
import { Button } from "@/components/Button";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

type Props = {
  ids: string[];
  highlight?: boolean;
  /** Optional override for the button label when the highlight is active. */
  activeLabel?: string;
  /** Optional override for the button label when the highlight is inactive. */
  idleLabel?: string;
};

/** Pass highlight={false} on pages without a pitch. */
export function EvidenceChips({
  ids,
  highlight = true,
  activeLabel = "Hide on pitch",
  idleLabel = "Highlight on pitch",
}: Props) {
  const { pinned, pin } = useMatch();
  if (ids.length === 0) return null;
  const on = pinned !== null && pinned.join() === ids.join();
  return (
    <div className={ui.chips}>
      {ids.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
      {highlight && (
        <Button
          className="px-2.5 py-0.5 text-xs"
          aria-pressed={on}
          aria-label={on ? activeLabel : idleLabel}
          onClick={() => pin(on ? null : ids)}
        >
          {on ? activeLabel : idleLabel}
        </Button>
      )}
    </div>
  );
}