import { Check, ChevronDown, Flag, Minus, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sequence } from "../components/Sequence";
import { DRAW, FADE_UP, GROW_X, ORIGIN, POP, at } from "../motion";

// Decorative illustrations for the feature cards. Each plays once when its card scrolls into view.
function Frame({ children }: { children: ReactNode }) {
  return (
    <Sequence threshold={0.4} className="h-28 overflow-hidden rounded-xl border border-line bg-surface-2/60 p-3">
      <div aria-hidden="true">{children}</div>
    </Sequence>
  );
}

function Bar({ label, w, cls, delay }: { label: string; w: number; cls: string; delay: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
        <span className={cn("block h-full rounded-full duration-[900ms]", cls, GROW_X)} style={{ width: `${w}%`, ...at(delay) }} />
      </div>
    </div>
  );
}

const DOTS: [number, number, number][] = [[14, 44, 0.2], [30, 30, 0.3], [46, 40, 0.4], [60, 24, 0.5], [74, 34, 0.65], [90, 26, 0.8], [104, 32, 1]];

/** Last 60 seconds, faded by age, with a time scrubber. */
export function LiveArt() {
  return (
    <Frame>
      <svg viewBox="0 0 120 64" className="h-16 w-full">
        <g className="stroke-line-strong" fill="none" strokeWidth=".8">
          <rect x="1" y="1" width="118" height="62" rx="4" />
          <path d="M60 1v62" />
          <circle cx="60" cy="32" r="9" />
        </g>
        <path d="M14 44 L30 30 L46 40 L60 24 L74 34 L90 26 L104 32" pathLength={1} fill="none" strokeWidth="1"
          className={cn("stroke-accent/60", DRAW)} style={{ transitionDuration: "1400ms", ...at(200) }} />
        {DOTS.map(([x, y, o], i) => (
          <circle key={x} cx={x} cy={y} r="2.4" className={cn("fill-c1", ORIGIN, POP)} style={{ opacity: o, ...at(200 + i * 180) }} />
        ))}
        <circle cx="104" cy="32" r="3" fill="none" strokeWidth=".8" className={cn("stroke-accent animate-ring", ORIGIN)} />
      </svg>
      <div className="relative mt-2 h-1 rounded-full bg-line">
        <span className={cn("absolute inset-y-0 left-0 w-[86%] rounded-full bg-accent/70 duration-[1400ms]", GROW_X)} style={at(200)} />
        <span className="absolute left-[86%] top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface-2" />
      </div>
    </Frame>
  );
}

/** Half-time change: before and after, with an effect badge. */
export function TacticsArt() {
  return (
    <Frame>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-medium text-fg">Pressing height</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-px text-[10px] font-bold text-ok", POP)} style={at(1500)}>
          <Check size={10} /> Worked
        </span>
      </div>
      <div className="grid gap-2">
        <Bar label="Before" w={38} cls="bg-muted/50" delay={200} />
        <Bar label="After" w={74} cls="bg-accent" delay={700} />
      </div>
    </Frame>
  );
}

/** A rating that explains itself. */
export function PlayersArt() {
  return (
    <Frame>
      <div className="grid gap-2">
        <Bar label="Goals" w={82} cls="bg-c1" delay={200} />
        <Bar label="Chances" w={56} cls="bg-c3" delay={500} />
        <Bar label="Defending" w={34} cls="bg-c5" delay={800} />
      </div>
      <p className={cn("mt-2 text-[10px] text-muted", FADE_UP)} style={at(1400)}>Rating = the sum of the reasons</p>
    </Frame>
  );
}

/** Flagged fouls first, routine ones folded into one line. */
export function FoulsArt() {
  const flagged = ["Stopping an attack", "Repeat offender"];
  return (
    <Frame>
      <div className="grid gap-1.5">
        {flagged.map((t, i) => (
          <div key={t} className={cn("flex items-center gap-2 rounded-md bg-warn/10 px-2 py-1 text-[11px]", FADE_UP)} style={at(200 + i * 350)}>
            <Flag size={11} className="shrink-0 text-warn" /> {t}
          </div>
        ))}
        <div className={cn("flex items-center justify-between rounded-md border border-dashed border-line px-2 py-1 text-[11px] text-muted", FADE_UP)} style={at(1000)}>
          Routine fouls, folded <ChevronDown size={12} />
        </div>
      </div>
    </Frame>
  );
}

/** The match data cannot answer a question about intent, and says so. */
export function AskArt() {
  return (
    <Frame>
      <div className={cn("ml-auto w-fit max-w-[88%] rounded-lg bg-accent/15 px-2.5 py-1 text-[11px]", FADE_UP)} style={at(200)}>
        Why did the coach change tactics?
      </div>
      <div className={cn("mt-2 flex w-fit max-w-[92%] items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[11px] text-muted ring-1 ring-line", FADE_UP)} style={at(1000)}>
        <ShieldCheck size={12} className="shrink-0 text-accent" /> The match data cannot answer this.
      </div>
    </Frame>
  );
}

/** Three ideas, each tested, each ending in a verdict. */
export function GoalArt() {
  const rows = [
    { bar: "bg-c1", Icon: Check, tone: "text-ok" },
    { bar: "bg-accent-2", Icon: X, tone: "text-live" },
    { bar: "bg-warn", Icon: Minus, tone: "text-warn" },
  ];
  return (
    <Frame>
      <div className="grid gap-3 pt-1">
        {rows.map(({ bar, Icon, tone }, i) => (
          <div key={bar} className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
              <span className={cn("block h-full w-full rounded-full duration-[800ms]", bar, GROW_X)} style={at(200 + i * 650)} />
            </div>
            <span className={cn("grid size-5 place-items-center rounded-full bg-surface", tone, POP)} style={at(900 + i * 650)}>
              <Icon size={12} />
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}