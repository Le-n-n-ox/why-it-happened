import "./landing.css";
import { DifferenceSection } from "./components/DifferenceSection";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { LandingCta } from "./components/LandingCta";
import { LandingFooter } from "./components/LandingFooter";
import { LandingNav } from "./components/LandingNav";
import { WhatSection } from "./components/WhatSection";
import { WhySection } from "./components/WhySection";

// A plain "#main" link would change your hash route, so move focus with JS instead.
const skipToContent = () => {
  const main = document.getElementById("main");
  main?.focus({ preventScroll: true });
  main?.scrollIntoView();
};

export function LandingPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip text-fg antialiased selection:bg-accent selection:text-accent-ink">
      <button
        type="button"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-card focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Skip to content
      </button>

      <LandingNav />

      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <WhatSection />
        <WhySection />
        <HowItWorks />
        <DifferenceSection />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;