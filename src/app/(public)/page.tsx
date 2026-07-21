"use client";

import { useFadeIn } from "@/lib/useFadeIn";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarqueeTrust } from "@/components/landing/MarqueeTrust";
import { OperationalStatus } from "@/components/landing/OperationalStatus";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { FAQ } from "@/components/landing/FAQ";
import { CtaSection } from "@/components/landing/CtaSection";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// 새로운 섹션 컴포넌트들
import { CoreFeatures } from "@/components/landing/CoreFeatures";
import { WhyChooseTeleMon } from "@/components/landing/WhyChooseTeleMon";
import { RealTimeDashboard } from "@/components/landing/RealTimeDashboard";

export default function HomePage() {
  useFadeIn();
  return (
    <>
      <HeroSection />
      <MarqueeTrust />
      
      <section className="tm-section-bg py-12 sm:py-16 px-4 sm:px-6 lg:px-8 luxury-section"> {/* px-4로 모바일 여백 조정 */}
        <div className="mx-auto max-w-6xl w-full"> {/* w-full 추가 */}
          <CoreFeatures />
        </div>
      </section>
      
      <SectionDivider />
      <OperationalStatus />
      <SectionDivider />
      
      <section className="tm-section-bg py-12 sm:py-16 px-4 sm:px-6 lg:px-8 luxury-section"> {/* px-4로 모바일 여백 조정 */}
        <div className="mx-auto max-w-6xl w-full"> {/* w-full 추가 */}
          <RealTimeDashboard />
        </div>
      </section>
      
      <SectionDivider />
      <HowItWorksSection />
      <SectionDivider />
      
      <section className="tm-section-bg-alt py-12 sm:py-16 px-4 sm:px-6 lg:px-8 luxury-section"> {/* px-4로 모바일 여백 조정 */}
        <div className="mx-auto max-w-6xl w-full"> {/* w-full 추가 */}
          <WhyChooseTeleMon />
        </div>
      </section>
      
      <SectionDivider />
      <PricingPreview />
      <SectionDivider />
      <FAQ />
      <SectionDivider />
      <CtaSection />

      {/* Fixed bottom CTA for mobile (luxury brand pattern) */}
      <div className="luxury-bottom-cta md:hidden">
        <Link
          href="/signup"
          className="btn-luxury btn-luxury-primary flex-1 justify-center text-xs py-3"
        >
          지금 무료체험 시작하기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  );
}