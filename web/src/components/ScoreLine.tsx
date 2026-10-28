// web/src/components/ScoreLine.tsx - "Reds 2 - Blues 1" from /match, or a note while the score is hidden.
import { cn } from "@/lib/utils";
import { teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";

export function ScoreLine({ className }: { className?: string }) {
  const { teams, score } = useMatch();

  if (!score) {
    return (
      <span className={cn("text-[.95rem] font-normal italic text-muted", className)}>
        Score at full time
      </span>
    );
  }

  return (
    <span className={className}>
      {teams.map((t, i) => (
        <span key={t}>
          {i > 0 && <span className="text-muted"> - </span>}
          <span style={{ color: teamColor(t, teams) }}>{t}</span>{" "}
          <span className="tabular-nums">{score[t] ?? 0}</span>
        </span>
      ))}
    </span>
  );
}