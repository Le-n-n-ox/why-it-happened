import "./landing.css";
import { DifferenceSection } from "./components/DifferenceSection";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { LandingCta } from "./components/LandingCta";
import { LandingFooter } from "./components/LandingFooter";
import { LandingNav } from "./components/LandingNav";
import { WhatSection } from "./components/WhatSection";
import { WhySection } from "./components/WhySection";

export function LandingPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip text-fg antialiased selection:bg-accent selection:text-accent-ink">
      {/* Skip link — invisible until focused, then a floating pill */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-card focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Skip to content
      </a>

      {/* Ambient glow behind the nav + hero. Pure decoration; safe to delete. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent), transparent 70%)",
          opacity: 0.10,
        }}
      />

      <LandingNav />

      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <HowItWorks />
        <WhySection />
        <DifferenceSection />
        <WhatSection />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;