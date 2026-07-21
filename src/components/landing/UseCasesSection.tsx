"use client";

import { motion } from "framer-motion";
import { ArrowRight, Briefcase, HeadphonesIcon, Users, BarChart3 } from "lucide-react";
import Link from "next/link";

const CASES = [
  {
    icon: Briefcase, title: "마케팅 자동화",
    desc: "예약 발송으로 정기 뉴스레터, 프로모션 메시지를 자동 전송하십시오. 여러 그룹에 동시 발송, 이미지 첨부도 가능합니다.",
    benefits: ["예약 발송으로 일괄 전송", "여러 그룹 동시 타겟팅", "이미지 첨부"],
  },
  {
    icon: HeadphonesIcon, title: "고객 지원 자동화",
    desc: "자주 묻는 질문에 키워드 기반 자동 응답으로 24시간 즉시 대응하십시오.",
    benefits: ["24/7 자동 응답", "키워드 매칭 + 조건부 응답", "응답 횟수 제한"],
  },
  {
    icon: Users, title: "커뮤니티 운영",
    desc: "그룹 검색으로 관련 커뮤니티를 찾고, 자동 가입하여 네트워크를 확장하십시오.",
    benefits: ["그룹 검색 → 자동 가입", "멀티 계정 동시 운영", "일일 가입 한도 관리"],
  },
  {
    icon: BarChart3, title: "데이터 분석 & 모니터링",
    desc: "발송 로그와 전달 분석으로 메시지 도달률, 성공률, 실패 원인을 한눈에 파악하십시오.",
    benefits: ["전달 성공/실패 분석", "계정 건강 진단", "Failure Intelligence"],
  },
];

export function UseCasesSection() {
  return (
    <section className="tm-section-bg-alt px-6 sm:px-6 lg:px-8 py-12 sm:py-12 luxury-section">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              활용 사례
            </p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            이렇게 <span style={{ color: "var(--color-accent)" }}>활용</span>하십시오
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">TeleMon은 다양한 분야에서 사용됩니다.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {CASES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 min-h-[250px]"
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

                <h3 className="text-base font-semibold break-words" style={{ color: "var(--color-text)" }}>{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed break-words" style={{ color: "var(--color-text-secondary)" }}>{c.desc}</p>

                <ul className="mt-4 space-y-1.5">
                  {c.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs break-words" style={{ color: "var(--color-text-muted)" }}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-accent)" }} />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-[var(--color-accent-border)]">
                  <Link
                    href="/features"
                    className="inline-flex items-center gap-1 text-xs font-medium min-h-[44px] flex items-center" style={{ color: "var(--color-accent)" }}
                  >
                    자세히 보기 <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

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