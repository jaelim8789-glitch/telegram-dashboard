"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function RealTimeDashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
            실시간 대시보드
          </p>
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
        </div>
        <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
          한눈에 보는 <span style={{ color: "var(--color-accent)" }}>TeleMon</span> Dashboard
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">실시간 메시지 현황, 자동화 작업, AI 추천, 운영 통계를 한눈에 확인하세요</p>
        <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-xl shadow-2xl overflow-hidden border border-[var(--color-accent-border)]"
          style={{
            background: "var(--color-card)",
          }}
        >
          <Image
            src="/landing/미래형 AI 자동화 대시보드.png"
            alt="미래형 AI 자동화 대시보드"
            width={600}
            height={400}
            className="w-full h-auto"
            priority
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-xl shadow-2xl overflow-hidden border border-[var(--color-accent-border)]"
          style={{
            background: "var(--color-card)",
          }}
        >
          <Image
            src="/landing/프리미엄 대시보드 UI 디자인.png"
            alt="프리미엄 대시보드 UI 디자인"
            width={600}
            height={400}
            className="w-full h-auto"
            priority
          />
        </motion.div>
      </div>
    </div>
  );
}