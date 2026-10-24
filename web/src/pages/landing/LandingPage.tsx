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
    <div className="min-h-screen overflow-x-clip text-fg">
      <LandingNav />
      <main>
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