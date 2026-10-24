import { Check, Flag, MessageSquare, Radio, Search, Target, TrendingUp, Users } from "lucide-react";
import { WinChartGraphic } from "../graphics/WinChartGraphic";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const features = [
  { icon: Radio, t: "Live pitch", d: "The last 60 seconds of play, faded by age, with a time scrubber and a Players layer." },
  { icon: Target, t: "Tactics", d: "Did a high press or a deep block work? A verdict and the half-time change, side by side." },
  { icon: Users, t: "Players", d: "A rating with its breakdown, so the number always explains itself." },
  { icon: Flag, t: "Fouls", d: "Flagged fouls first, routine ones folded into one line." },
  { icon: MessageSquare, t: "Ask the match", d: "Ask in plain language. If the data cannot answer, it says so." },
  { icon: Search, t: "Why this goal", d: "The model proposes up to three ideas. The rules test each one." },
];

const guarantees = [
  "Every claim carries evidence chips",
  "A sentence that fails a check is replaced by a rules sentence",
  "Always badged: model or \u201CRules only\u201D",
];

export function WhatSection() {
  return (
    <Section id="features">
      <SectionHead kicker="Features" title="What you can do">
        Six ways into the match, each one anchored to evidence you can see.
      </SectionHead>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Featured: win probability. One Reveal drives both the fade and the chart. */}
        <Reveal className="relative overflow-hidden rounded-card border border-line bg-surface p-6 sm:col-span-2">
          {(on) => (
            <>
              <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-accent/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-accent">
                  <TrendingUp size={20} aria-hidden="true" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Win probability</span>
                </div>
                <h3 className="mt-3 font-heading text-2xl font-bold text-fg">Watch the odds move, and see what moved them</h3>
                <p className="mt-1 text-sm text-muted">Example chart. Home, draw and away, with a marker at the goal.</p>
                <div className="mt-4">
                  <WinChartGraphic on={on} />
                </div>
              </div>
            </>
          )}
        </Reveal>

        <Reveal delay={150} className="flex flex-col rounded-card border border-line bg-surface-2 p-6 sm:col-span-2 lg:col-span-1">
          <h3 className="font-heading text-2xl font-bold text-fg">Read the match your way</h3>
          <p className="mt-2 text-muted">
            Open any event on the pitch to see its why. Sentences without evidence are not shown, apart from each page&apos;s headline.
          </p>
          <ul className="mt-5 grid gap-2.5 text-sm">
            {guarantees.map((t) => (
              <li key={t} className="flex items-start gap-2 text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {features.map(({ icon: Icon, t, d }, i) => (
          <Reveal
            key={t}
            delay={(i % 3) * 100}
            className="group rounded-card border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-card"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-accent transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-accent/10">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-heading text-xl font-semibold text-fg">{t}</h3>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{d}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}