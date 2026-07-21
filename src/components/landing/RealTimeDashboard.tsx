"use client";

import { motion } from "framer-motion";
import { DashboardPreview } from "./DashboardPreview";

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

      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-xl shadow-2xl overflow-hidden border border-[var(--color-accent-border)] w-full max-w-5xl"
          style={{
            background: "var(--color-card)",
          }}
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </div>
  );
}