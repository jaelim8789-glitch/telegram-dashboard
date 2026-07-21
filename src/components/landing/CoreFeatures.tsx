"use client";

import { motion } from "framer-motion";
import { MessageCircle, Clock, Zap, Users, BarChart3, Shield, Bot, Settings } from "lucide-react";

const FEATURES = [
  { 
    icon: MessageCircle, 
    title: "자동 응답", 
    desc: "키워드 기반 자동 응답으로 고객 문의에 24시간 대응합니다." 
  },
  { 
    icon: Clock, 
    title: "예약 발송", 
    desc: "특정 시간에 맞춰 메시지를 자동으로 발송할 수 있습니다." 
  },
  { 
    icon: Zap, 
    title: "빠른 설정", 
    desc: "전화번호 인증만으로 간단하게 계정을 연결할 수 있습니다." 
  },
  { 
    icon: Users, 
    title: "그룹 관리", 
    desc: "여러 그룹을 한 번에 관리하고 타겟팅할 수 있습니다." 
  },
  { 
    icon: BarChart3, 
    title: "분석 리포트", 
    desc: "발송 성공률, 응답률 등을 직관적으로 확인할 수 있습니다." 
  },
  { 
    icon: Shield, 
    title: "보안 보호", 
    desc: "계정 데이터는 암호화되어 안전하게 보호됩니다." 
  },
  { 
    icon: Bot, 
    title: "AI 운영", 
    desc: "AI 비서가 채널 운영을 도와줍니다." 
  },
  { 
    icon: Settings, 
    title: "맞춤 설정", 
    desc: "운영 방식에 맞게 자동화를 자유롭게 설정할 수 있습니다." 
  },
];

export function CoreFeatures() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
            핵심 기능
          </p>
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
        </div>
        <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
          <span style={{ color: "var(--color-accent)" }}>TeleMon</span>의 핵심 기능
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">Telegram 운영을 더욱 스마트하게 만들어주는 기능들</p>
        <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
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

              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{feature.desc}</p>

              {/* 하단 장식선 */}
              <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}