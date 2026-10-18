// web/src/components/ScoreLine.tsx - "Reds 2 - Blues 1" from /match, or a note while the score is hidden.
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

export function ScoreLine({ className }: { className?: string }) {
  const { teams, score } = useMatch();
  if (!score) return <span className={cn("text-muted", className)}>Score at full time</span>;
  return <span className={className}>{teams.map((t) => `${t} ${score[t] ?? 0}`).join(" - ")}</span>;
}