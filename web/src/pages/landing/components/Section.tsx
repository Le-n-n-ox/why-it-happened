import type { ReactNode } from "react";
import { wrap } from "../config";
import { Reveal } from "./Reveal";

/** Full-width band (so `alt` can tint edge to edge) with the content container inside. */
export function Section({ id, alt, children }: { id?: string; alt?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`border-t border-line/60 py-16 lg:py-24 ${alt ? "bg-surface-2/30" : ""}`}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

export function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <Reveal>
      <div className="max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{kicker}</span>
        <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h2>
        {children && <p className="mt-4 text-lg text-muted">{children}</p>}
      </div>
    </Reveal>
  );
}