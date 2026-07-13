"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, AlertTriangle, TrendingDown, MessageCircle, DollarSign } from "lucide-react";

const PROBLEMS = [
  {
    icon: DollarSign,
    title: "당신은 매일 돈을 버리고 있다",
    desc: "하루 8시간, 일주일에 40시간. 그중 얼마나 많은 시간을 의미 없는 반복에 쓰고 있습니까? 그 시간에 당신은 새로운 비즈니스를 만들 수 있습니다. 시간은 곧 돈입니다. 당신은 지금 현금을 창밖으로 던지고 있습니다.",
    quote: "\"시간은 돈이다. 당신은 매일 천만원을 길바닥에 버리고 있다.\"",
  },
  {
    icon: TrendingDown,
    title: "기회는 당신의 무관심 속에 사라진다",
    desc: "경쟁자는 이미 자동화하고 있습니다. 그들은 당신이 고객 한 명 한 명에게 답장하는 동안, 같은 시간에 수백 명에게 메시지를 보내고 있습니다. 당신의 안일함이 당신의 수익을 갉아먹고 있습니다.",
    quote: "\"경쟁자는 이미 자동화했다. 당신은 아직도 하나하나 수동으로 하는가?\"",
  },
  {
    icon: MessageCircle,
    title: "똑같은 질문, 똑같은 답변, 똑같은 하루",
    desc: "\"가격이 어떻게 되나요?\" — 같은 질문에 오늘도 30분을 낭비했습니다. 1년이면 182시간입니다. 그 시간에 당신은 무엇을 할 수 있었습니까?",
    quote: "\"오늘도 같은 질문에 답했다. 내일도 그럴 것인가?\"",
  },
  {
    icon: AlertTriangle,
    title: "모르는 것이 가장 무섭다",
    desc: "발송이 왜 실패했는지 모릅니다. 계정이 왜 차단됐는지 모릅니다. 당신은 깜깜한 방 안에서 눈을 감고 일하고 있습니다. TeleMon은 당신의 눈이 되어 모든 것을 투명하게 보여드립니다.",
    quote: "\"무지는 가장 큰 비용이다. 알면 통제할 수 있다.\"",
  },
];

export function ProblemsSection() {
  return (
    <section className="tm-section-bg px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-accent)" }}>
            <AlertTriangle className="h-3 w-3 inline mr-1" /> 현실을 직시하라
          </p>
          <h2 className="section-heading text-2xl sm:text-3xl">
            당신, 이런 적 없습니까?
          </h2>
          <p className="mt-4 text-sm editorial-body max-w-lg mx-auto">
            솔직히 털어놓으십시오. 우리는 당신을 판단하지 않습니다.
            <br />
            <span style={{ color: "var(--color-accent)" }}>함께 해결하러 온 동료입니다.</span>
          </p>
        </div>

        {/* 에르메스 명품 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-7 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                style={{
                  borderTop: "4px solid var(--color-accent)",
                }}
              >
                {/* 상단 우측 장식 */}
                <div className="absolute -top-2.5 right-6 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                  TM
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-lg mb-4 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {p.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {p.desc}
                </p>

                {/* 인용구 — 금색 왼쪽 바와 함께 */}
                <div className="mt-5 pl-4 border-l-2 border-[var(--color-accent)]">
                  <p className="text-xs italic leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    {p.quote}
                  </p>
                </div>

                {/* 하단 금색 장식선 */}
                <div className="mt-5 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm italic mb-6" style={{ color: "var(--color-text-muted)" }}>
            &ldquo;변화를 원한다면, 지금 이 순간부터 다르게 행동하라.
            <br />
            <span style={{ color: "var(--color-accent)", fontStyle: "normal" }}>내일은 없다. 오늘이 전부다.</span>&rdquo;
          </p>
          <Link
            href="/signup"
            className="btn-luxury btn-luxury-primary inline-flex"
          >
            지금 바꾸십시오
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}