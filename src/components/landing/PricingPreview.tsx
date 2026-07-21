"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";

const PLANS = [
  {
    name: "Free Plan", price: "무료",
    features: ["1개 계정 연결", "자동 응답 기능", "메시지 발송", "기본 발송 로그", "완전 무료", "발송 시 워터마크 광고 포함"],
    href: "/signup", cta: "무료 시작", popular: false,
  },
  {
    name: "Pro", price: "$100/월",
    features: ["10개 계정 연결", "예약 & 반복 발송", "이미지 첨부 발송", "발송 로그 & 전달 분석", "계정 건강 모니터링"],
    href: "/pricing", cta: "Pro 시작", popular: true,
  },
  {
    name: "Team", price: "$199/분기",
    features: ["20개 계정 연결", "모든 프리미엄 기능", "API 키 발급", "우선 지원"],
    href: "/pricing", cta: "Team 시작", popular: false,
  },
  {
    name: "첫 발자취+", price: "$1,000", period: "영구",
    tagline: "함께 성장하는 파트너십",
    features: ["무제한 계정 연결", "모든 프리미엄 기능 평생 무료", "평생 업데이트 포함", "24시간 우선 지원"],
    href: "/pricing", cta: "첫 발자취 남기기", popular: false,
  },
];

export function PricingPreview() {
  return (
    <section className="tm-section-bg-alt px-6 sm:px-6 lg:px-8 py-12 sm:py-12 luxury-section">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="section-heading-luxury mb-0">요금제</p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            당신에게 맞는 <span style={{ color: "var(--color-accent)" }}>요금제</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">필요한 만큼만 선택하세요.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col card-3d card-3d-hover min-h-[350px]"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(184,160,96,0.08)",
                borderTop: plan.popular ? "4px solid var(--color-accent)" : "4px solid var(--color-accent)",
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                e.currentTarget.style.setProperty("--mouse-x", String(x));
                e.currentTarget.style.setProperty("--mouse-y", String(y));
              }}
            >
              {/* TM 메달 (상단 우측) */}
              <div className="absolute -top-3 right-4 h-7 w-7 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-lg z-10">
                TM
              </div>

              {/* 금속 리본 배지 (Most popular) */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                  <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-hover)] to-[var(--color-gold-deep)] px-5 py-1 text-[10px] font-bold text-[var(--color-accent-contrast)] shadow-lg uppercase tracking-wider">
                    <Star className="h-3 w-3 fill-current" />
                    BEST VALUE
                  </div>
                </div>
              )}

              {/* Em 보스 효과를 위한 사이드 장식선 */}
              <div className="absolute left-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-[var(--color-accent)]/20 to-transparent" />
              <div className="absolute right-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-[var(--color-accent)]/20 to-transparent" />

              <h3 className="font-serif font-semibold text-base break-words" style={{ color: "var(--color-text)" }}>
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold gold-text">
                  {plan.price}
                </span>
                {plan.period && <span className="text-xs break-words" style={{ color: "var(--color-text-muted)" }}>/{plan.period}</span>}
              </div>
              {plan.tagline && <p className="mt-2 text-xs italic-script break-words" style={{ color: "var(--color-text-muted)" }}>{plan.tagline}</p>}

              <ul className="mt-5 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs break-words" style={{ color: "var(--color-text-secondary)" }}>
                    <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "var(--color-accent)" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="mt-6 flex h-10 items-center justify-center text-xs font-semibold btn-luxury btn-luxury-primary animate-gold-shimmer min-h-[44px] items-center justify-center"
              >
                {plan.cta}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>

              {/* 하단 금속 장식선 */}
              <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}