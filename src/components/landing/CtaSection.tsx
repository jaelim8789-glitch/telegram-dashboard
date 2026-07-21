"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="tm-section-bg-alt px-6 sm:px-6 lg:px-8 py-16 sm:py-12 luxury-section pb-24 sm:pb-12">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-[var(--color-accent)]" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              지금 시작
            </p>
            <div className="h-px w-8 bg-[var(--color-accent)]" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            지금 바로 시작하세요
          </h2>
          <p className="text-xs sm:text-sm editorial-body max-w-md mx-auto luxury-section-desc">
            코드 없이, 복잡한 설정 없이. 하나의 대시보드로 모든 텔레그램 작업을 자동화하십시오.
          </p>

          {/* Gold divider */}
          <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-40" />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/signup" className="btn-luxury btn-luxury-primary group w-full sm:w-auto justify-center">
              무료로 시작하기
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/pricing" className="btn-luxury btn-luxury-secondary w-full sm:w-auto justify-center">
              요금제 보기
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}