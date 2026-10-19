// web/src/components/EvidenceChips.tsx - evidence ids as chips, with an optional highlight-on-pitch button.
import { Button } from "@/components/Button";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

/** Pass highlight={false} on pages without a pitch. */
export function EvidenceChips({ ids, highlight = true }: { ids: string[]; highlight?: boolean }) {
  const { pinned, pin } = useMatch();
  if (ids.length === 0) return null;
  const on = pinned !== null && pinned.join() === ids.join();
  return (
    <div className={ui.chips}>
      {ids.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
      {highlight && (
        <Button className="px-2.5 py-0.5 text-xs" aria-pressed={on} onClick={() => pin(on ? null : ids)}>
          Highlight on pitch
        </Button>
      )}
    </div>
  );
}