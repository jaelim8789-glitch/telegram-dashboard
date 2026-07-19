"use client";

import { useFadeIn } from "@/lib/useFadeIn";
import { HeroSection } from "@/components/landing/HeroSection";
import { LiveStatsBar } from "@/components/landing/LiveStatsBar";
import { MarqueeTrust } from "@/components/landing/MarqueeTrust";
import { OperationalStatus } from "@/components/landing/OperationalStatus";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { ProblemsSection } from "@/components/landing/ProblemsSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { NewFeaturesSection } from "@/components/landing/NewFeaturesSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { FAQ } from "@/components/landing/FAQ";
import { CtaSection } from "@/components/landing/CtaSection";

export default function HomePage() {
  useFadeIn();
  return (
    <>
      <HeroSection />
      <LiveStatsBar />
      <SectionDivider />
      <MarqueeTrust />
      <SectionDivider />
      <OperationalStatus />
      <SectionDivider />
      <SecuritySection />
      <SectionDivider />
      <ProblemsSection />
      <SectionDivider />

      {/* Dashboard preview with TeleMon signature pattern */}
      <section className="tm-section-bg py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <DashboardPreview />
        </div>
      </section>

      <SectionDivider />
      <HowItWorksSection />
      <SectionDivider />
      <UseCasesSection />
      <SectionDivider />
      <NewFeaturesSection />
      <SectionDivider />
      <PricingPreview />
      <SectionDivider />
      <FAQ />
      <SectionDivider />
      <CtaSection />
    </>
  );
}