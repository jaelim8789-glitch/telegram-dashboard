"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useFadeIn } from "@/lib/useFadeIn";

const ITEMS = [
  { q: "TeleMon은 무엇인가요?", a: "TeleMon은 AI 기반 텔레그램 자동화 플랫폼입니다. 여러 Telegram 계정을 하나의 대시보드에서 관리하고, AI 기반 자동 응답, 예약 발송, 그룹 검색, 전달 분석 등을 코딩 없이 사용할 수 있습니다. 24시간 운영되는 AI 어시스턴트로, 고객 응대부터 마케팅까지 한 번에 해결할 수 있습니다." },
  { q: "기술을 몰라도 사용할 수 있나요?", a: "네, 당연히 가능합니다! 전화번호만 입력하면 계정 등록이 완료되고, 간단한 설정만으로 자동 응답 룰을 만들 수 있습니다. 복잡한 코딩이나 기술 지식이 전혀 필요 없으며, 누구나 3분 안에 시작할 수 있는 직관적인 인터페이스를 제공합니다." },
  { q: "계정이 차단될 위험이 있나요?", a: "TeleMon은 Telegram 사용 정책을 철저히 준수하도록 설계되었습니다. 발송 간격, 일일 한도, FloodWait 처리를 자동으로 관리하여 차단 위험을 최소화합니다. 또한, 계정 건강 모니터링 기능으로 활동 상태를 실시간으로 확인하고, 안전하게 운영할 수 있도록 지원합니다." },
  { q: "무료로 사용해 볼 수 있나요?", a: "네! Free Trial 요금제로 1개 계정을 연결해 모든 기본 기능을 무료로 체험하실 수 있습니다. 별도의 결제 정보 없이도 7일간 무제한으로 사용해보실 수 있으며, 마음에 드시면 언제든지 Pro 요금제로 업그레이드 하실 수 있습니다." },
  { q: "여러 계정을 동시에 운영할 수 있나요?", a: "네! Pro 요금제는 최대 10개, Business 요금제는 무제한 계정을 동시에 운영할 수 있습니다. 각 계정별로 독립된 자동 응답 룰과 발송 스케줄을 설정할 수 있어, 다양한 비즈니스나 프로젝트를 효율적으로 관리할 수 있습니다." },
  { q: "환불 정책은 어떻게 되나요?", a: "유료 요금제는 결제일로부터 7일 이내에 전액 환불이 가능합니다. 기술적 문제가 발생했거나 서비스에 만족하지 못하시는 경우, support@telemon.io로 문의주시면 신속하게 처리해드립니다. 또한, 30일 이내에는 사용량에 따라 부분 환불도 가능합니다." },
  { q: "AI 자동 응답은 얼마나 정확한가요?", a: "TeleMon의 AI 응답 엔진은 최신 GPT 기반 모델을 사용하여, 사용자의 질문 의도를 정확히 파악하고 자연스러운 답변을 생성합니다. 학습 데이터 기반으로 지속적으로 업데이트되어, 실제 고객 문의에 매우 정확하게 대응할 수 있습니다." },
  { q: "보안과 개인정보 보호는 어떻게 이루어지나요?", a: "모든 사용자 데이터는 엔드투엔드 암호화로 안전하게 보호되며, 유럽 GDPR 기준에 맞춘 개인정보 보호 정책을 적용하고 있습니다. 서버는 한국 IDC에 위치해 있어, 국내외 데이터 유출 걱정 없이 안심하고 사용할 수 있습니다." },
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
              <span style={{ color: "var(--color-accent)" }}>FAQ</span>
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
            className="w-full py-3 pl-11 pr-4 text-sm outline-none min-h-[44px]"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-accent-border)",
              borderRadius: "0.75rem",
              color: "var(--color-text)",
              boxShadow: "inset 0 0 0 1px var(--color-accent), 0 0 0 1px var(--color-accent)",
            }}
          />
        </div>

        <div className="space-y-3">
          {filtered.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-0.5 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden min-h-[80px]"
                style={{
                  background: "linear-gradient(var(--color-card), var(--color-card)), linear-gradient(to bottom, var(--color-accent), var(--color-gold-deep))",
                  borderTop: "4px solid var(--color-accent)",
                }}
              >
                {/* 상단 우측 TM 배지 */}
                <div className="absolute -top-2.5 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm z-10">
                  TM
                </div>

                <div style={{ background: "var(--color-card)", padding: "1px" }}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium transition-all min-h-[60px]"
                    style={{ color: "var(--color-text)" }}
                  >
                    <span className="flex-1 pr-4 break-words">{item.q}</span>
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
                        <div className="px-5 pb-4 text-sm leading-relaxed break-words" style={{ color: "var(--color-text-secondary)", paddingTop: "0.75rem" }}>
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 하단 장식선 */}
                <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm break-words" style={{ color: "var(--color-text-muted)" }}>
            더 궁금한 점이 있으면{' '}
            <Link href="mailto:support@telemon.io" style={{ color: "var(--color-accent)" }}>support@telemon.io</Link>
            {' '}로 문의해주세요.
          </p>
        </div>
      </div>
    </section>
  );
}