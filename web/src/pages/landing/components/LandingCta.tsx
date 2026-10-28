import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ABOUT_HREF, APP_HREF, wrap } from "../config";
import { DRAW, FADE_UP, ORIGIN, POP, at } from "../motion";
import { ActionLink } from "./ActionLink";
import { Reveal } from "./Reveal";
import { Sequence } from "./Sequence";

const MASK = "radial-gradient(70% 90% at 50% 0%, #000 20%, transparent 75%)";

export function LandingCta() {
  return (
    <section className={`${wrap} border-t border-line/60 py-16 lg:py-20`}>
      <Reveal className="relative isolate overflow-hidden rounded-card border border-line bg-surface-2 p-8 shadow-card sm:p-12">
        <div aria-hidden="true" className="lp-grid pointer-events-none absolute inset-0 -z-10 opacity-25" style={{ maskImage: MASK, WebkitMaskImage: MASK }} />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 -z-10 size-56 rounded-full bg-accent-2/15 blur-3xl" />

        <Sequence className="relative">
          {/* Centre circle of a pitch, drawing itself behind the call to action */}
          <svg
            viewBox="0 0 200 200"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="pointer-events-none absolute -right-6 top-1/2 hidden size-72 -translate-y-1/2 text-accent/30 lg:block"
          >
            <circle cx="100" cy="100" r="70" pathLength={1} className={DRAW} style={{ transitionDuration: "1600ms" }} />
            <path d="M100 10V190" pathLength={1} className={DRAW} style={{ transitionDuration: "1600ms", ...at(300) }} />
            <circle cx="100" cy="100" r="4" fill="currentColor" stroke="none" className={cn(ORIGIN, POP)} style={at(1300)} />
            <circle cx="100" cy="100" r="9" className={cn("animate-ring", ORIGIN)} />
          </svg>

          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className={cn("block text-xs font-bold uppercase tracking-[0.14em] text-accent", FADE_UP)}>Get started</span>
              <h2 className={cn("mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl", FADE_UP)} style={at(120)}>
                Pick a match and find out why.
              </h2>
              <p className={cn("mt-3 text-base leading-relaxed text-muted", FADE_UP)} style={at(240)}>
                Open any goal, card or swing to see the chain of causes, the evidence behind it, and whether the model or the rules wrote it.
              </p>
            </div>
            <div className={cn("flex flex-wrap items-center gap-3 lg:mr-40", FADE_UP)} style={at(400)}>
              <ActionLink href={APP_HREF}>
                Open the app <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </ActionLink>
              <ActionLink ghost href={ABOUT_HREF}>About the project</ActionLink>
            </div>
          </div>
        </Sequence>
      </Reveal>
    </section>
  );
}