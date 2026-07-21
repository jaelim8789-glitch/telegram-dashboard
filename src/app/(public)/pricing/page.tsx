"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const PLANS = [
  {
    name: "Free Plan",
    price: "0",
    period: "무료",
    features: [
      "1개 계정 연결",
      "AI 기반 자동 응답",
      "기본 메시지 발송",
      "간편한 발송 로그 확인",
      "완전 무료 사용",
      "발송 시 워터마크 광고 포함"
    ],
    href: "/signup",
    cta: "무료 시작하기",
    popular: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "월",
    features: [
      "최대 10개 계정 연결",
      "AI 맞춤형 자동 응답",
      "메시지 & 이미지 발송",
      "예약 & 반복 발송 기능",
      "상세 발송 로그 & 분석",
      "계정 건강 상태 모니터링",
      "고급 필터링 도구",
      "AI 챗봇 연동",
    ],
    href: "/get-api-key",
    cta: "전문가용 시작",
    popular: false,
  },
  {
    name: "AI Premium",
    badge: "나만의 AI",
    price: "99",
    period: "월",
    features: [
      "최대 3개 커스텀 AI 에이전트 생성",
      "에이전트 생성 시 목적 템플릿 선택",
      "사실상 무제한 AI 토큰*",
      "웹 검색 & 요약 에이전트",
      "마케팅 카피라이팅 에이전트",
      "데이터 분석 & 보고서 에이전트",
      "고객 응대 자동화 에이전트",
      "5개 계정 연결",
      "예약 & 반복 발송",
      "우선 고객 지원",
    ],
    href: "/get-api-key?plan=ai_premium",
    cta: "AI Premium 시작",
    popular: true,
  },
  {
    name: "Business",
    price: "79",
    period: "월",
    features: [
      "무제한 계정 연결",
      "고급 AI 자동 응답 시스템",
      "메시지 & 미디어 배너 발송",
      "예약 & 반복 & 조건부 발송",
      "실시간 분석 & 리포트",
      "계정 보호 & 보안 모니터링",
      "팀 협업 기능",
      "API 접근 권한",
      "우선 고객 지원",
      "맞춤형 통합 솔루션",
    ],
    href: "/get-api-key",
    cta: "비즈니스용 시작",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-app-bg">
      <section className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="badge-premium mx-auto w-fit mb-4">요금제</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-app-text">
              비용 효율적인 <span className="text-app-primary">AI 운영</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
              비즈니스 성장에 필요한 기능만 골라서, 최고의 가성비로 운영하세요. 언제든지 업그레이드 가능합니다.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 animate-scale-in ${
                  plan.popular
                    ? "card-premium border-app-primary/30 shadow-xl shadow-app-primary/10 scale-105"
                    : "glass-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-1 text-xs font-semibold text-white shadow-lg whitespace-nowrap">
                    {(plan as any).badge || "가장 인기"}
                  </div>
                )}
                <h3 className="text-xl font-bold text-app-text">{plan.name}</h3>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-app-text">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-app-text-secondary">
                    /{plan.period}
                  </span>
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm text-app-text-secondary"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-app-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    plan.popular
                      ? "btn-primary relative z-10"
                      : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Footnote */}
          <p className="mt-8 text-center text-[10px] text-app-text-subtle max-w-2xl mx-auto">
            * AI Premium 요금제는 월 10만 토큰 소프트 캡이 적용되나, 일반 사용 환경에서 도달하기 어려운 수준으로 사실상 무제한에 가깝게 사용 가능합니다.
          </p>

          <div className="mt-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
              지금 시작하시면<br/>
              <span className="text-app-primary">30%</span> 할인 혜택 제공
            </h2>
            <p className="mt-2 text-app-text-secondary">
              첫 달에는 표시된 가격보다 30% 저렴하게 이용하세요. (기간 제한 이벤트)
            </p>
            <Link
              href="/signup"
              className="btn-primary mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-10 text-base font-semibold relative z-10"
            >
              무료 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}