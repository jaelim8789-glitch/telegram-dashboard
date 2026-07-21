"use client";

import { motion } from "framer-motion";
import { Users, MessageCircle, Activity, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";

const TRUSTED_DATA = [
  { icon: Users, value: "5000", suffix: "+", label: "사용 기업", description: "전 세계 다양한 기업에서 사용 중" },
  { icon: Users, value: "50000", suffix: "+", label: "사용자 수", description: "활성 사용자 기준" },
  { icon: MessageCircle, value: "10000000", suffix: "+", label: "메시지 수", description: "월간 발송 처리량" },
  { icon: Activity, value: "99.9", suffix: "%", label: "가동률", description: "업타임 기준" },
];

export function MarqueeTrust() {
  return (
    <section className="tm-section-bg px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs uppercase tracking-[0.15em] mb-8" style={{ color: "var(--color-text-muted)" }}>
          전 세계에서 신뢰받는 플랫폼
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {TRUSTED_DATA.map((data, i) => {
            const Icon = data.icon;
            return (
              <motion.div
                key={data.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div 
                  className="text-2xl font-bold mb-1 counter-element"
                  style={{ 
                    color: "var(--color-accent)",
                    '--count-from': 0,
                    '--count-to': parseInt(data.value),
                  } as React.CSSProperties}
                >
                  {data.value}{data.suffix}
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
                  {data.label}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {data.description}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}