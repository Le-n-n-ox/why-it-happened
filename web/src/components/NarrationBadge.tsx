// web/src/components/NarrationBadge.tsx - how the wording is being written, from /health.
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

const STYLE: Record<string, string> = {
  model: "border-accent text-accent",
  "templates only": "border-line text-muted",
  paused: "border-transparent bg-warn text-black",
  degraded: "border-transparent bg-warn text-black",
};

const HINT: Record<string, string> = {
  "templates only": "No model: every sentence is written by rules.",
  model: "The model rewords captions, reviews, assessments and the recap.",
  paused: "The model is paused: rule text is being sent instead.",
  degraded: "The model is failing: rule text is being sent instead.",
};

export function NarrationBadge() {
  const { health } = useMatch();
  const narration = health?.narration;
  if (!narration) return null;
  const detail = health.model_status ? ` (${health.model_status})` : "";
  return (
    <span
      title={`${HINT[narration] ?? "Narration status"}${detail}`}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase",
        STYLE[narration] ?? "border-line text-muted",
      )}
    >
      {narration}
    </span>
  );
}