"use client";

import { motion } from "framer-motion";
import { Shield, Zap, MessageSquare, Users, Bot, ArrowRight } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { icon: Shield, title: "1. 계정 연결", desc: "전화번호를 입력하고 Telegram 계정을 연결하세요. SMS/2FA 인증을 지원합니다." },
  { icon: Zap, title: "2. 자동화 설정", desc: "키워드 기반 자동 응답, 예약 발송, 반복 작업 등을 설정하세요." },
  { icon: Bot, title: "3. AI와 운영 시작", desc: "AI 비서와 함께 채널 운영을 시작하고, 자연스럽게 대화를 이어가세요." },
];

export function HowItWorksSection() {
  return (
    <section className="tm-section-bg px-6 sm:px-6 lg:px-8 py-12 sm:py-12 luxury-section">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-lg mx-auto mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              사용 방법
            </p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            간단한 <span style={{ color: "var(--color-accent)" }}>3단계</span>로 시작
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">복잡한 설정 없이, 간단한 3단계로 끝납니다.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-center text-center"
                style={{
                  borderTop: "4px solid var(--color-accent)",
                }}
              >
                {/* 상단 우측 TM 배지 */}
                <div className="absolute -top-2.5 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                  TM
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-lg mb-4 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{step.desc}</p>

                {/* 하단 장식선 */}
                <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/signup" className="btn-luxury btn-luxury-primary inline-flex">
            지금 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}