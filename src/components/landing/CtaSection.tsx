"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="tm-section-bg-alt px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <p className="text-xs uppercase tracking-[0.15em]" style={{ color: "var(--color-accent)" }}>
            지금 시작
          </p>
          <h2 className="section-heading text-2xl sm:text-3xl">
            지금 바로 시작하세요
          </h2>
          <p className="text-sm editorial-body max-w-md mx-auto">
            코드 없이, 복잡한 설정 없이. 하나의 대시보드로 모든 텔레그램 작업을 자동화하십시오.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/signup" className="btn-luxury btn-luxury-primary group">
              무료로 시작하기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/pricing" className="btn-luxury btn-luxury-secondary">
              요금제 보기
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}