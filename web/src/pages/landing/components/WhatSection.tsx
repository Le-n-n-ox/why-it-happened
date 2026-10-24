import { Flag, MessageSquare, Radio, Search, Target, TrendingUp, Users } from "lucide-react";
import { wrap } from "../config";
import { WinChartGraphic } from "../graphics/WinChartGraphic";
import { Reveal } from "./Reveal";

const features = [
  { icon: Radio, t: "Live pitch", d: "The last 60 seconds of play, faded by age, with a time scrubber and a Players layer." },
  { icon: Target, t: "Tactics", d: "Did a high press or a deep block work? A verdict and the half-time change, side by side." },
  { icon: Users, t: "Players", d: "A rating with its breakdown, so the number always explains itself." },
  { icon: Flag, t: "Fouls", d: "Flagged fouls first, routine ones folded into one line." },
  { icon: MessageSquare, t: "Ask the match", d: "Ask in plain language. If the data cannot answer, it says so." },
  { icon: Search, t: "Why this goal", d: "The model proposes up to three ideas. The rules test each one." },
];

export function WhatSection() {
  return (
    <section id="features" className={`${wrap} py-16 lg:py-24`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="rounded-card border border-line bg-surface p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-accent">
            <TrendingUp size={20} aria-hidden="true" />
            <span className="font-semibold">Win probability</span>
          </div>
          <h3 className="mt-2 font-heading text-2xl font-bold">Watch the odds move, and see what moved them</h3>
          <p className="mt-1 text-sm text-muted">Example chart. Home, draw and away, with a marker at the goal.</p>
          <div className="mt-4">
            <Reveal>{(on) => <WinChartGraphic on={on} />}</Reveal>
          </div>
        </Reveal>

        <Reveal delay={150} className="rounded-card border border-line bg-surface-2 p-6">
          <h3 className="font-heading text-2xl font-bold">Read the match your way</h3>
          <p className="mt-2 text-muted">Open any event on the pitch to see its why. Sentences without evidence are never shown.</p>
        </Reveal>

        {features.map(({ icon: Icon, t, d }, i) => (
          <Reveal key={t} delay={(i % 3) * 100} className="group rounded-card border border-line bg-surface p-6 transition-colors hover:border-accent/50">
            <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-accent transition-transform group-hover:-translate-y-1">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-heading text-xl font-semibold">{t}</h3>
            <p className="mt-1 text-muted">{d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}