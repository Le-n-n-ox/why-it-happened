// web/src/components/Verdict.tsx - a team verdict. "too little play to judge" is normal: plain text, no warning style.
import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  "playing well": "bg-accent text-accent-ink",
  mixed: "bg-surface-3 text-fg",
  struggling: "bg-warn text-black shadow-sm",
};

export function Verdict({ verdict }: { verdict: string }) {
  const style = STYLE[verdict];

  // The 4th case is "too little play to judge" — normal, not a warning. Plain muted text.
  if (style === undefined) {
    return <span className="text-[.9rem] italic leading-relaxed text-muted">{verdict}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-[.72rem] font-semibold uppercase tracking-wider",
        style,
      )}
    >
      {verdict}
    </span>
  );
}