import { Check, X } from "lucide-react";
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

export function DifferenceSection() {
  return (
    <section id="compare" className={`${wrap} py-16 lg:py-24`}>
      <Reveal>
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Comparison</span>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            How it differs from other apps
          </h2>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-10 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-sm">
                <th className="p-4 font-medium text-muted"><span className="sr-only">Topic</span></th>
                <th className="p-4 font-medium text-muted">Typical stats and AI-summary apps</th>
                <th className="p-4 font-heading text-base font-semibold">
                  <span className="inline-flex items-center gap-2 text-accent">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                    Why It Happened
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([topic, other, ours]) => (
                <tr key={topic} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/40">
                  <th scope="row" className="p-4 align-top font-semibold text-fg">{topic}</th>
                  <td className="p-4 align-top text-muted">
                    <X size={16} className="mr-2 inline shrink-0 align-[-2px] text-accent-2/70" aria-hidden="true" />
                    {other}
                  </td>
                  <td className="p-4 align-top text-fg">
                    <Check size={16} className="mr-2 inline shrink-0 align-[-2px] text-accent" aria-hidden="true" />
                    {ours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <p className="mt-4 text-sm text-muted">A general comparison of approaches. No specific app is named.</p>
    </section>
  );
}