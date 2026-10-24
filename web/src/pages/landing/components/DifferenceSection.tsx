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
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">How it differs from other apps</h2>
      </Reveal>
      <Reveal delay={100} className="mt-10 overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th className="p-4 font-medium"><span className="sr-only">Topic</span></th>
              <th className="p-4 font-medium">Typical stats and AI-summary apps</th>
              <th className="p-4 font-heading text-base font-semibold text-accent">Why It Happened</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([topic, other, ours]) => (
              <tr key={topic} className="border-b border-line last:border-0">
                <th scope="row" className="p-4 align-top font-semibold">{topic}</th>
                <td className="p-4 align-top text-muted"><X size={16} className="mr-2 inline text-accent-2" aria-hidden="true" />{other}</td>
                <td className="p-4 align-top"><Check size={16} className="mr-2 inline text-accent" aria-hidden="true" />{ours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
      <p className="mt-3 text-sm text-muted">A general comparison of approaches. No specific app is named.</p>
    </section>
  );
}