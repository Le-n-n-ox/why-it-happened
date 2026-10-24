import { ArrowRight } from "lucide-react";
import { ABOUT_HREF, APP_HREF, wrap } from "../config";
import { ActionLink } from "./ActionLink";
import { Reveal } from "./Reveal";

const MASK = "radial-gradient(70% 90% at 50% 0%, #000 20%, transparent 75%)";

export function LandingCta() {
  return (
    <section className={`${wrap} border-t border-line/60 py-16 lg:py-20`}>
      <Reveal className="relative isolate overflow-hidden rounded-card border border-line bg-surface-2 p-8 shadow-card sm:p-12">
        {/* Backdrop: a faded grid and twin corner glows */}
        <div aria-hidden="true" className="lp-grid pointer-events-none absolute inset-0 -z-10 opacity-25"
          style={{ maskImage: MASK, WebkitMaskImage: MASK }} />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 -z-10 size-56 rounded-full bg-accent-2/15 blur-3xl" />

        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Get started</span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              Pick a match and find out why.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Open any goal, card or swing to see the chain of causes, the evidence behind it, and whether the model or the rules wrote it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ActionLink href={APP_HREF}>
              Open the app <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </ActionLink>
            <ActionLink ghost href={ABOUT_HREF}>About the project</ActionLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}