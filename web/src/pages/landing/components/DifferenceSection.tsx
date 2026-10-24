import { Check, X } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";
import { wrap } from "../config";
import { Reveal } from "./Reveal";

const rows: [string, string, string][] = [
  ["What you get", "Scores, stats and charts", "The cause chain behind each event: trigger, development, payoff, consequence"],
  ["Proof", "A claim you take on trust", "Evidence chips on every claim that light up the pitch"],
  ["AI writing", "Free text that can say anything", "The model only phrases facts. Invented event ids, numbers and names are rejected"],
  ["When data can't answer", "A confident guess", "\u201CThe match data cannot answer this\u201D, with the reason"],
  ["Intent", "Reads a coach's or player's mind", "Never states intent. It judges the result of a way of playing"],
  ["The full story", "Tells the winner's story", "Shows what held the winner back too"],
];

// The section carries data-in="true" once it has been seen: these classes react to it.
const FADE_UP =
  "opacity-0 translate-y-2 transition duration-500 ease-out group-data-[in=true]/cmp:translate-y-0 group-data-[in=true]/cmp:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";
const POP =
  "scale-0 transition-transform duration-500 ease-[cubic-bezier(.2,1.4,.4,1)] group-data-[in=true]/cmp:scale-100 motion-reduce:scale-100 motion-reduce:transition-none";
const delay = (i: number, base = 0) => ({ transitionDelay: `${base + i * 90}ms` });

function Badge({ ok, i }: { ok: boolean; i: number }) {
  const Icon = ok ? Check : X;
  return (
    <span
      className={cn(
        "mr-2.5 inline-grid size-5 shrink-0 place-items-center rounded-full align-[-4px]",
        ok ? "bg-accent/15 text-accent" : "bg-accent-2/15 text-accent-2",
        POP,
      )}
      style={delay(i, ok ? 520 : 420)}
    >
      <Icon size={12} strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

export function DifferenceSection() {
  const [ref, seen] = useInView<HTMLElement>({ once: true, threshold: 0.15 });

  return (
    <section ref={ref} id="compare" data-in={seen} className={`group/cmp ${wrap} py-16 lg:py-24`}>
      <Reveal>
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Comparison</span>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            How it differs from other apps
          </h2>
          <span
            aria-hidden="true"
            className="mt-4 block h-1 w-20 origin-left scale-x-0 rounded-full bg-gradient-to-r from-accent to-accent-2 transition-transform duration-700 ease-out group-data-[in=true]/cmp:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none"
          />
        </div>
      </Reveal>

      {/* Wide screens: a table */}
      <Reveal delay={100} className="mt-10 hidden overflow-hidden rounded-card border border-line bg-surface shadow-card sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-sm">
                <th className="p-4 font-medium text-muted"><span className="sr-only">Topic</span></th>
                <th className="p-4 font-medium text-muted">Typical stats and AI-summary apps</th>
                <th className="border-l border-accent/30 bg-accent/10 p-4 font-heading text-base font-semibold shadow-[inset_0_-2px_0_var(--accent)]">
                  <span className="inline-flex items-center gap-2 text-accent">
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" aria-hidden="true" />
                    Why It Happened
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([topic, other, ours], i) => (
                <tr key={topic} className="group/row border-b border-line transition-colors last:border-0 hover:bg-surface-2/40">
                  <th
                    scope="row"
                    className="relative p-4 align-top font-semibold text-fg before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:scale-y-0 before:rounded-full before:bg-accent before:transition-transform group-hover/row:before:scale-y-100"
                  >
                    <div className={FADE_UP} style={delay(i, 250)}>{topic}</div>
                  </th>
                  <td className="p-4 align-top text-muted">
                    <div className={FADE_UP} style={delay(i, 300)}>
                      <Badge ok={false} i={i} />
                      {other}
                    </div>
                  </td>
                  <td className="border-l border-accent/30 bg-accent/[.05] p-4 align-top text-fg">
                    <div className={FADE_UP} style={delay(i, 350)}>
                      <Badge ok i={i} />
                      {ours}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Phones: one card per row, so nothing scrolls sideways */}
      <ul className="mt-10 grid gap-3 sm:hidden">
        {rows.map(([topic, other, ours], i) => (
          <li
            key={topic}
            className={cn("grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card", FADE_UP)}
            style={delay(i, 200)}
          >
            <h3 className="m-0 text-base font-bold">{topic}</h3>
            <p className="m-0 flex items-start text-muted">
              <Badge ok={false} i={i} />
              <span>
                <span className="block text-[.7rem] font-semibold uppercase tracking-wider">Typical apps</span>
                {other}
              </span>
            </p>
            <p className="m-0 flex items-start rounded-xl border border-accent/30 bg-accent/10 p-3 text-fg">
              <Badge ok i={i} />
              <span>
                <span className="block text-[.7rem] font-semibold uppercase tracking-wider text-accent">Why It Happened</span>
                {ours}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">A general comparison of approaches. No specific app is named.</p>
    </section>
  );
}