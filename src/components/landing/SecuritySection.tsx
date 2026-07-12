"use client";

import { motion } from "framer-motion";
import { Shield, KeyRound, Lock, Eye, Server, RefreshCw } from "lucide-react";

const ITEMS = [
  { icon: Lock, title: "암호화 저장", desc: "모든 Telegram 세션 데이터는 AES-256으로 암호화되어 저장됩니다." },
  { icon: KeyRound, title: "API 키 인증", desc: "전화번호 인증을 통한 API 키 발급으로 안전하게 외부 연동하십시오." },
  { icon: Eye, title: "투명한 로깅", desc: "모든 발송 내역이 기록되며, 실패 원인까지 상세히 추적 가능합니다." },
  { icon: Shield, title: "FloodWait 보호", desc: "Telegram 제한을 자동 감지하고 준수하여 계정을 보호합니다." },
  { icon: Server, title: "세션 격리", desc: "각 계정의 세션이 독립적으로 관리되어 한 계정의 오류가 다른 계정에 영향을 주지 않습니다." },
  { icon: RefreshCw, title: "자동 재인증", desc: "세션 만료 시 자동 감지하고 재인증을 유도하여 다운타임을 줄입니다." },
];

export function SecuritySection() {
  return (
    <section className="tm-section-bg-alt px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "var(--accent)" }}>
            <Shield className="h-3 w-3 inline mr-1" /> 보안
          </p>
          <h2 className="section-heading text-2xl sm:text-3xl">
            당신의 데이터는 <span style={{ color: "var(--accent)" }}>안전합니다</span>
          </h2>
          <p className="mt-3 text-sm editorial-body">보안은 선택이 아닌 기본입니다. TeleMon은 안전하게 보호합니다.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
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

                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>

                {/* 하단 장식선 */}
                <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}