"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "무료",
    features: [
      "1개 계정 연결",
      "자동 응답 기능",
      "메시지 발송",
      "기본 발송 로그",
    ],
    href: "/signup",
    cta: "무료 시작",
    popular: false,
  },
  {
    name: "Pro",
    price: "100",
    period: "월",
    features: [
      "10개 계정 연결",
      "자동 응답 규칙",
      "메시지 발송 & 이미지 첨부",
      "예약 & 반복 발송",
      "발송 로그 & 전달 분석",
      "계정 건강 모니터링",
    ],
    href: "/get-api-key",
    cta: "Pro 시작",
    popular: true,
  },
  {
    name: "Team",
    price: "199",
    period: "분기",
    features: [
      "20개 계정 연결",
      "자동 응답 규칙",
      "메시지 발송 & 이미지 첨부",
      "예약 & 반복 발송",
      "발송 로그 & 전달 분석",
      "계정 건강 모니터링",
    ],
    href: "/get-api-key",
    cta: "Team 시작",
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
              투명한 <span className="text-app-primary">가격</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
              필요한 만큼만 선택하세요. 언제든지 변경 가능합니다.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
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
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-app-primary px-5 py-1 text-xs font-semibold text-white shadow-lg whitespace-nowrap">
                    가장 인기
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

          <div className="mt-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
              더 궁금한 점이 있나요?
            </h2>
            <p className="mt-2 text-app-text-secondary">
              지금 바로 무료로 시작해보세요
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
