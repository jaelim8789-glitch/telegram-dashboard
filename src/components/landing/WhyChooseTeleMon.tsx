"use client";

import { motion } from "framer-motion";
import { Zap, Settings, Shield, Bot } from "lucide-react";

const REASONS = [
  { 
    icon: Zap, 
    title: "빠른 설정", 
    desc: "전화번호 인증만으로 계정을 간편하게 연결하고, 몇 분 안에 자동화를 시작할 수 있습니다." 
  },
  { 
    icon: Settings, 
    title: "강력한 자동화", 
    desc: "예약 발송, 키워드 기반 자동 응답, 반복 작업 등 다양한 자동화 기능을 제공합니다." 
  },
  { 
    icon: Shield, 
    title: "안전한 운영", 
    desc: "Telegram 정책을 준수하는 방식으로 계정 보호 및 데이터 암호화를 제공합니다." 
  },
  { 
    icon: Bot, 
    title: "AI 지원", 
    desc: "AI 비서가 채널 운영을 도와주며, 자연스러운 대화와 운영을 지원합니다." 
  },
];

export function WhyChooseTeleMon() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
            TeleMon을 선택하는 이유
          </p>
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
        </div>
        <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
          왜 <span style={{ color: "var(--color-accent)" }}>TeleMon</span>을 선택해야 할까요?
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">다른 플랫폼과 차별화된 TeleMon의 가치</p>
        <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {REASONS.map((reason, i) => {
          const Icon = reason.icon;
          return (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-center text-center"
              style={{
                borderTop: "4px solid var(--color-accent)",
              }}
            >
              {/* 상단 우측 TM 배지 */}
              <div className="absolute -top-2.5 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                TM
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-lg mb-4 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{reason.desc}</p>

              {/* 하단 장식선 */}
              <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}