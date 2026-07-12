"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "230+", label: "활성 계정" },
  { value: "1,284", label: "오늘 발송" },
  { value: "99.8%", label: "가동률" },
  { value: "50K+", label: "전체 메시지" },
];

export function LiveStatsBar() {
  return (
    <section className="tm-section-bg-alt px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="px-6 py-10 sm:py-12 border-t border-b" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center"
              >
                <div className="stat-number">{stat.value}</div>
                <div className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}