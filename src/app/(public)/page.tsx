"use client";

import Link from "next/link";

const features = [
  {
    icon: "🤖", title: "자동 응답 (FAQ 매크로)",
    desc: "키워드 기반 자동 답변. 쿨다운/일일 제한 설정. 고객 문의를 실시간으로 자동 응대하세요.",
  },
  {
    icon: "📨", title: "메시지 발송",
    desc: "여러 수신자에게 텍스트+이미지 발송. 즉시 발송 또는 예약 발송을 지원합니다.",
  },
  {
    icon: "📅", title: "예약 발송",
    desc: "원하는 시간에 메시지가 자동 발송되도록 예약. APScheduler가 정확히 실행합니다.",
  },
  {
    icon: "🔐", title: "멀티 계정 관리",
    desc: "여러 Telegram 계정을 하나의 대시보드에서 관리. 세션은 암호화되어 안전하게 저장됩니다.",
  },
  {
    icon: "📊", title: "발송 로그 & 분석",
    desc: "모든 발송 내역을 계정/상태/날짜별로 필터링. 진행 상황 실시간 추적.",
  },
  {
    icon: "🎮", title: "BotFather 원격 제어",
    desc: "Telegram 봇으로 자동응답을 원격으로 켜고 끄기. 대시보드에 접속할 필요 없습니다.",
  },
];

const plans = [
  {
    name: "Free", price: "0", period: "무료",
    features: ["1개 계정 연결", "3개 자동응답 규칙", "월 100회 응답", "1시간 쿨다운"],
    cta: "무료 시작", popular: false,
  },
  {
    name: "Basic", price: "15", period: "USDT/월",
    features: ["2개 계정 연결", "10개 자동응답 규칙", "월 1,000회 응답", "30분 쿨다운", "메시지 발송", "발송 로그"],
    cta: "시작하기", popular: true,
  },
  {
    name: "Pro", price: "38", period: "USDT/월",
    features: ["5개 계정 연결", "50개 자동응답 규칙", "월 10,000회 응답", "1분 쿨다운", "예약 발송", "이미지 첨부", "우선 지원"],
    cta: "Pro 시작", popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-app-bg">
      {/* ─── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-grid">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="relative mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-6 lg:px-8 text-center">
          <div className="badge-premium mx-auto w-fit mb-6 animate-fade-in">
            v2.0 출시 · 지금 가입하면 1개월 무료
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight animate-slide-up">
            텔레그램 자동화,<br />
            <span className="text-app-primary">코딩 없이</span>
            <br />
            하나의 대시보드에서
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-app-text-secondary animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Telegram 계정 관리, 자동 응답(FAQ 매크로), 메시지 발송, 예약 발송까지.
            복잡한 프로그래밍 없이 클릭 몇 번으로 텔레그램을 완전 자동화하세요.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <Link href="/signup" className="btn-primary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-semibold relative z-10">
              무료로 시작하기
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/features" className="btn-secondary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-medium">
              기능 살펴보기
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 max-w-3xl glass-card rounded-2xl p-8 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-center justify-center gap-8 sm:gap-16 text-sm text-app-text-secondary">
              {[
                { value: "1분", label: "설치 시간" },
                { value: "무제한", label: "계정 연결" },
                { value: "99.9%", label: "가동률" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-app-primary">{stat.value}</div>
                  <div className="mt-1.5 text-xs sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────── */}
      <section className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-app-text">
              강력한 <span className="text-app-primary">기능</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
              텔레그램 자동화에 필요한 모든 기능을 제공합니다
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className="glass-card rounded-2xl p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-primary/10 text-2xl">
                  {feat.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-app-text">{feat.title}</h3>
                <p className="mt-2.5 text-sm text-app-text-secondary leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────── */}
      <section id="pricing" className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-app-text">
              투명한 <span className="text-app-primary">가격</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
              필요한 만큼만 선택하세요. 언제든지 변경 가능합니다
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 animate-scale-in ${
                  plan.popular
                    ? "card-premium border-app-primary/30 shadow-xl shadow-app-primary/10 scale-105"
                    : "glass-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-app-primary px-5 py-1 text-xs font-semibold text-white shadow-lg">
                    가장 인기
                  </div>
                )}
                <h3 className="text-xl font-bold text-app-text">{plan.name}</h3>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-app-text">${plan.price}</span>
                  <span className="text-sm text-app-text-secondary">/{plan.period}</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-app-text-secondary">
                      <svg className="h-4 w-4 flex-shrink-0 text-app-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Free" ? "/signup" : "/get-api-key"}
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
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────── */}
      <section className="relative px-4 py-28 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-app-text">
            지금 바로 <span className="text-app-primary">시작</span>하세요
          </h2>
          <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
            1분만에 계정을 연결하고 텔레그램 자동화를 경험해보세요. 신용카드 필요 없음.
          </p>
          <Link
            href="/signup"
            className="btn-primary mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-10 text-base font-semibold relative z-10"
          >
            무료로 시작하기
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────── */}
      <section id="faq" className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl sm:text-4xl font-bold text-app-text">
            자주 묻는 <span className="text-app-primary">질문</span>
          </h2>
          <div className="mt-12 space-y-4">
            {[
              { q: "Telegram 계정이 차단될 위험이 있나요?", a: "저희 시스템은 Telegram의 공식 API(MTProto)를 사용하며, 발송 속도를 의도적으로 제한하여 계정 차단 위험을 최소화합니다. 또한 세션 데이터는 암호화되어 안전하게 보관됩니다." },
              { q: "여러 계정을 동시에 사용할 수 있나요?", a: "네, 요금제에 따라 최대 5개 이상의 계정을 하나의 대시보드에서 관리할 수 있습니다." },
              { q: "자동 응답은 어떻게 동작하나요?", a: "등록된 키워드가 메시지에 포함되면 자동으로 답변을 전송합니다. 쿨다운 시간과 일일 응답 횟수를 설정할 수 있어 스팸으로 간주되지 않도록 제어 가능합니다." },
              { q: "USDT 결제는 어떻게 하나요?", a: "요금제를 선택하면 USDT(TRC20) 지갑 주소와 송금 금액이 표시됩니다. 메모에 고유 코드를 입력하고 송금하면 5~10분 후 자동으로 API 키가 발급됩니다." },
              { q: "서버는 어디에서 호스팅되나요?", a: "자체 서버에서 24/7 운영되며, 자동 응답 기능을 위해 항상 온라인 상태를 유지합니다." },
            ].map((faq, i) => (
              <details key={i} className="group glass-card rounded-xl overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-medium text-app-text hover:text-app-primary transition-colors">
                  {faq.q}
                  <svg className="h-4 w-4 text-app-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="divider-gradient" />
                <div className="px-6 py-5 text-sm text-app-text-secondary leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}