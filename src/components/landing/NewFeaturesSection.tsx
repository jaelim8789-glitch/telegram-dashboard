"use client";

import { motion } from "framer-motion";
import { Bot, Shuffle, Store, MessageCircle, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Bot, title: "AI 비서와 채팅",
    desc: "고도로 훈련된 AI 비서에게 그룹 운영, 메시지 전략, 일정 관리를 물어보세요. 자연어로 명령하고 즉시 실행합니다.",
    tag: "NEW",
    color: "from-indigo-500 to-blue-600",
    details: [
      "DeepSeek 기반 지능형 에이전트",
      "레벨업 & 경험치 시스템",
      "업무 추천 / 일정 제안",
    ],
  },
  {
    icon: Shuffle, title: "랜덤 리플라이",
    desc: "여러 응답 템플릿 중 하나를 무작위로 골라 자동 답장합니다. 정해진 답변이 아닌, 자연스러운 대화를 연출하세요.",
    tag: "NEW",
    color: "from-emerald-500 to-teal-600",
    details: [
      "여러 템플릿 간 랜덤 선택",
      "조건부 응답 트리거",
      "사용자 지정 응답 풀",
    ],
  },
  {
    icon: Store, title: "Agent 템플릿 마켓",
    desc: "커뮤니티가 만든 AI Agent 템플릿을 탐색하고 즉시 적용하십시오. 마케팅, 고객응대, 커뮤니티 관리 등 목적별 템플릿을 제공합니다.",
    tag: "NEW",
    color: "from-amber-500 to-orange-600",
    details: [
      "템플릿 구매 & 즉시 적용",
      "카테고리별 탐색 & 검색",
      "직접 템플릿 출시 가능",
    ],
  },
];

export function NewFeaturesSection() {
  return (
    <section className="tm-section-bg px-6 sm:px-6 lg:px-8 py-12 sm:py-12 luxury-section">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              새로운 기능
            </p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            이제 <span style={{ color: "var(--color-accent)" }}>AI와 함께</span> 운영하십시오
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">TeleMon의 최신 기능으로 그룹 운영을 한 단계 업그레이드하세요.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col min-h-[320px]"
                style={{
                  borderTop: "4px solid var(--color-accent)",
                }}
              >
                <div className="absolute -top-2.5 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                  TM
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} text-white shadow-md`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold-deep)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-bg)] shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-base font-semibold break-words" style={{ color: "var(--color-text)" }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed flex-1 break-words" style={{ color: "var(--color-text-secondary)" }}>{f.desc}</p>

                <ul className="mt-4 space-y-1.5">
                  {f.details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-xs break-words" style={{ color: "var(--color-text-muted)" }}>
                      <Zap className="h-3 w-3 shrink-0" style={{ color: "var(--color-accent)" }} />
                      {d}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-[var(--color-accent-border)]">
                  <Link
                    href="/app/chat"
                    className="inline-flex items-center gap-1 text-xs font-medium min-h-[44px] flex items-center" style={{ color: "var(--color-accent)" }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    AI 비서 사용해보기
                  </Link>
                </div>

                <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/signup" className="btn-luxury btn-luxury-primary inline-flex min-h-[44px] items-center justify-center">
            모든 기능 살펴보기
          </Link>
        </div>
      </div>
    </section>
  );
}