"use client";

import { motion } from "framer-motion";
import { Server, Shield, Wifi, Database } from "lucide-react";

const ITEMS = [
  { icon: Server, title: "FastAPI 백엔드", desc: "메시지 발송, 계정 관리, API 키 인증 처리를 담당하는 핵심 서버" },
  { icon: Wifi, title: "WebSocket 알림", desc: "실시간 발송 상태 및 계정 건강 변경 알림을 브라우저에 푸시" },
  { icon: Database, title: "SQLite (WAL 모드)", desc: "계정 세션, 발송 로그, 설정 데이터를 WAL 모드로 저장하고 주기적으로 자동 백업" },
  { icon: Shield, title: "워커 프로세스", desc: "예약 발송, 반복 발송, 자동 응답을 비동기로 처리하는 백그라운드 작업자" },
];

export function OperationalStatus() {
  return (
    <section className="tm-section-bg px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-accent)" }}>
            플랫폼 아키텍처
          </p>
          <h2 className="section-heading text-2xl sm:text-3xl">
            <span style={{ color: "var(--color-accent)" }}>검증된</span> 인프라
          </h2>
          <p className="mt-3 text-sm editorial-body max-w-lg mx-auto">
            TeleMon은 안정적인 오픈소스 기술 스택 위에 구축되었습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</p>

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