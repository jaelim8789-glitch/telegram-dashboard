"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useFadeIn } from "@/lib/useFadeIn";

const ITEMS = [
  { q: "TeleMon은 무엇인가요?", a: "TeleMon은 텔레그램 자동화 플랫폼입니다. 여러 Telegram 계정을 하나의 대시보드에서 관리하고, 자동 응답, 예약 발송, 그룹 검색, 전달 분석 등을 코딩 없이 사용할 수 있습니다." },
  { q: "기술을 몰라도 사용할 수 있나요?", a: "네, 코딩이 전혀 필요 없습니다. 전화번호를 입력하고 계정을 등록한 후, 자동 응답 규칙을 설정하고 메시지를 발송하면 됩니다. 3단계면 끝입니다." },
  { q: "계정이 차단될 위험이 있나요?", a: "TeleMon은 Telegram 사용 정책을 준수하도록 설계되었습니다. 발송 간격, 일일 한도, FloodWait 처리를 자동으로 관리하여 차단 위험을 최소화합니다." },
  { q: "무료로 사용할 수 있나요?", a: "네! Free Trial 요금제로 1개 계정을 연결해 모든 기본 기능을 무료로 체험하실 수 있습니다." },
  { q: "여러 계정을 동시에 운영할 수 있나요?", a: "네. Pro 요금제는 10개, Team 요금제는 20개 계정을 동시에 운영할 수 있습니다." },
  { q: "환불 정책은 어떻게 되나요?", a: "유료 요금제는 결제일로부터 7일 이내에 전액 환불이 가능합니다. support@telemon.io로 문의주세요." },
];

export function FAQ() {
  useFadeIn();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? ITEMS.filter((item) => item.q.toLowerCase().includes(filter.toLowerCase()) || item.a.toLowerCase().includes(filter.toLowerCase()))
    : ITEMS;

  return (
    <section id="faq" className="tm-section-bg px-6 sm:px-6 lg:px-8 py-12 sm:py-12 luxury-section">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10 sm:mb-12" data-fade>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              FAQ
            </p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            자주 묻는 <span style={{ color: "var(--color-accent)" }}>질문</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">TeleMon에 대해 궁금한 점을 확인하세요.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="질문 검색..."
            className="w-full py-3 pl-11 pr-4 text-sm outline-none"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.75rem",
              color: "var(--color-text)",
            }}
          />
        </div>

        <div className="space-y-3">
          {filtered.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: "0.75rem", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium transition-all"
                  style={{ color: "var(--color-text)" }}
                >
                  <span className="flex-1 pr-4">{item.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--color-text-muted)" }} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            더 궁금한 점이 있으면{' '}
            <Link href="mailto:support@telemon.io" style={{ color: "var(--color-accent)" }}>support@telemon.io</Link>
            로 문의해주세요.
          </p>
        </div>
      </div>
    </section>
  );
}