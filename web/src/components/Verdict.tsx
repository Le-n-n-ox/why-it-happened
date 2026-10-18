// web/src/components/Verdict.tsx - a team verdict. "too little play to judge" is normal: plain text, no warning style.
import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  "playing well": "bg-accent text-accent-ink",
  mixed: "bg-surface-3 text-fg",
  struggling: "bg-warn text-black",
};

export function Verdict({ verdict }: { verdict: string }) {
  const style = STYLE[verdict];
  if (style === undefined) return <span className="text-muted">{verdict}</span>;
  return (
    <span className={cn("inline-block rounded-full px-3 py-1 text-sm font-bold tracking-wide uppercase", style)}>
      {verdict}
    </span>
  );
}