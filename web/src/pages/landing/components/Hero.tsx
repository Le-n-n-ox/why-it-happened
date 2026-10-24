import { ArrowRight, Check } from "lucide-react";
import { APP_HREF, scrollTo, wrap } from "../config";
import { PitchGraphic } from "../graphics/PitchGraphic";
import { ActionLink } from "./ActionLink";

const chain = [
  "Won the ball high up the pitch",
  "Space opened behind the full-back",
  "A cut-back found a runner at the edge of the box",
  "Finished first time",
];
const promises = ["Evidence on every claim", "The model writes, rules decide", "Falls back to \u201CRules only\u201D"];

export function Hero() {
  return (
    <section className={`${wrap} grid items-center gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-24`}>
      <div className="animate-page-in">
        <h1 className="font-heading text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Know why it happened.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
          Every goal, card and momentum swing, explained in plain language with evidence you can tap and see on the pitch.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ActionLink href={APP_HREF}>
            Open the app <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </ActionLink>
          <ActionLink ghost onClick={() => scrollTo("how")}>See how it works</ActionLink>
        </div>
        <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {promises.map((t) => (
            <li key={t} className="inline-flex items-center gap-2">
              <Check size={16} className="text-accent" aria-hidden="true" />{t}
            </li>
          ))}
        </ul>
      </div>

      <div className="animate-page-in">
        <PitchGraphic />
        <div className="relative -mt-10 ml-4 mr-4 rounded-card border border-line bg-surface/90 p-4 shadow-card backdrop-blur sm:ml-8 sm:mr-0">
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span>Sample goal. Why?</span>
            <span className="inline-flex items-center gap-2 font-semibold text-live">
              <span className="size-2 rounded-full bg-live animate-pulse-dot" />67&apos;
            </span>
          </div>
          <ol>
            {chain.map((s, i) => (
              <li key={s} style={{ animationDelay: `${1700 + i * 250}ms` }}
                className="relative ml-1.5 animate-page-in anim-hold border-l border-line pb-2.5 pl-5 text-sm last:pb-0">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent" />{s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}