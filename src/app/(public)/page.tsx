"use client";

import Link from "next/link";
import {
  Shield,
  Send,
  CalendarClock,
  Users,
  Search,
  Bot,
  Zap,
  BarChart3,
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

/* ─── Feature data (only real, implemented capabilities) ─── */

const CAPABILITIES = [
  {
    icon: Users,
    title: "멀티 계정 관리",
    desc: "여러 Telegram 계정을 하나의 대시보드에서 안전하게 관리하세요. 세션은 암호화되어 저장됩니다.",
    details: ["계정 등록 및 상태 관리", "암호화된 세션 보관", "활성/비활성 전환", "계정 건강 모니터링"],
  },
  {
    icon: Send,
    title: "메시지 발송",
    desc: "등록된 계정으로 텍스트와 이미지를 즉시 발송합니다. 여러 수신자에게 한 번에 전송할 수 있습니다.",
    details: ["텍스트 + 이미지 발송", "다중 수신자 동시 전송", "백그라운드 처리", "발송 내역 추적"],
  },
  {
    icon: CalendarClock,
    title: "예약 발송",
    desc: "원하는 날짜와 시간에 메시지가 자동 발송되도록 예약하세요. 30초 주기로 정확히 디스패치됩니다.",
    details: ["ISO 8601 시간 형식", "예약 상태 실시간 추적", "APScheduler 기반 정확한 실행", "즉시 발송 자동 전환"],
  },
  {
    icon: Bot,
    title: "자동 응답 (FAQ 매크로)",
    desc: "키워드 기반 자동 답변. 쿨다운/일일 제한을 설정하여 스팸 없이 고객 문의를 실시간 자동 응대하세요.",
    details: ["키워드 매칭 (포함/정확히 일치)", "쿨다운 시간 설정", "일일 최대 응답 횟수 제한", "성공/실패 로깅"],
  },
  {
    icon: Zap,
    title: "답장 매크로",
    desc: "일정 간격 또는 지정 시간에 특정 채팅방으로 메시지를 자동 발송합니다. 반복 업무를 완전 자동화하세요.",
    details: ["인터벌/고정 시간 스케줄", "대상 채팅방 지정", "미디어 첨부 지원", "발송 이력 확인"],
  },
  {
    icon: Search,
    title: "그룹 검색",
    desc: "연결된 계정이 속한 모든 그룹과 채널을 실시간으로 조회하고 검색할 수 있습니다.",
    details: ["계정별 그룹/채널 목록", "실시간 Telethon 연동", "그룹명 검색", "참여자 수 표시"],
  },
  {
    icon: Activity,
    title: "계정 건강 모니터링",
    desc: "각 계정의 인증 상태, 세션 유효성, 최근 활동, 오류 내역을 한눈에 확인하고 문제에 대응하세요.",
    details: ["인증 상태 실시간 표시", "세션 만료 감지", "FloodWait/차단 알림", "최근 성공/실패율"],
  },
  {
    icon: BarChart3,
    title: "전달 분석 (Delivery Analytics)",
    desc: "메시지 전달 성공률, 실패 원인, 계정별 성과, 전달 지연 시간까지 상세하게 분석합니다.",
    details: ["전달 성공/실패/성공률", "실패 원인 인텔리전스", "계정별 성과 랭킹", "P95 전달 지연 측정"],
  },
  {
    icon: Shield,
    title: "2FA 인증 지원",
    desc: "SMS 인증부터 2단계 비밀번호까지 완벽한 Telegram 인증 과정을 지원합니다. FloodWait 자동 처리.",
    details: ["SMS 인증번호 요청/확인", "2단계 비밀번호 인증", "FloodWait 에러 처리", "세션 암호화 저장"],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "계정 연결",
    desc: "대시보드에서 Telegram 계정의 전화번호를 입력하고 SMS로 인증합니다. 2FA도 지원됩니다.",
  },
  {
    step: "02",
    title: "작업 구성",
    desc: "자동 응답 규칙, 발송 일정, 답장 매크로를 직관적인 UI로 설정하세요. 코딩이 전혀 필요 없습니다.",
  },
  {
    step: "03",
    title: "실행 및 모니터링",
    desc: "모든 작업이 백그라운드에서 실행됩니다. 발송 로그, 전달 분석, 계정 건강을 실시간으로 모니터링하세요.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "무료",
    features: [
      "1개 계정 연결",
      "3개 자동응답 규칙",
      "월 100회 응답",
      "1시간 쿨다운",
      "기본 발송 로그",
    ],
    href: "/signup",
    cta: "무료 시작",
    popular: false,
  },
  {
    name: "Basic",
    price: "15",
    period: "USDT/월",
    features: [
      "2개 계정 연결",
      "10개 자동응답 규칙",
      "월 1,000회 응답",
      "30분 쿨다운",
      "메시지 발송",
      "발송 로그 & 분석",
    ],
    href: "/get-api-key",
    cta: "시작하기",
    popular: true,
  },
  {
    name: "Pro",
    price: "38",
    period: "USDT/월",
    features: [
      "5개 계정 연결",
      "50개 자동응답 규칙",
      "월 10,000회 응답",
      "1분 쿨다운",
      "예약 발송 & 이미지 첨부",
      "전달 분석 & 계정 건강",
      "우선 기술 지원",
    ],
    href: "/get-api-key",
    cta: "Pro 시작",
    popular: false,
  },
];

const FAQS = [
  {
    q: "Telegram 계정이 차단될 위험이 있나요?",
    a: "저희 시스템은 Telegram의 공식 API(MTProto)를 사용하며, 발송 속도를 의도적으로 제한하고 쿨다운을 적용하여 계정 차단 위험을 최소화합니다. 모든 세션 데이터는 암호화되어 안전하게 보관됩니다.",
  },
  {
    q: "여러 계정을 동시에 사용할 수 있나요?",
    a: "네, 요금제에 따라 최대 5개 이상의 계정을 하나의 대시보드에서 관리할 수 있습니다. 각 계정의 상태를 별도로 모니터링하고 제어할 수 있습니다.",
  },
  {
    q: "자동 응답과 답장 매크로의 차이는 무엇인가요?",
    a: "자동 응답은 들어오는 메시지에 키워드가 포함되면 자동으로 답변을 보내는 기능입니다. 답장 매크로는 설정한 시간/간격에 따라 지정된 채팅방으로 메시지를 발송합니다. 두 기능 모두 완전 자동화되어 있습니다.",
  },
  {
    q: "전달 분석에서는 어떤 정보를 볼 수 있나요?",
    a: "총 전달 시도, 성공/실패 수, 성공률, 실패 원인별 분석, 계정별 성과, 시간대별 전달 추이, 평균 및 P95 전달 지연 시간을 확인할 수 있습니다. 모든 분석은 선택한 기간(7/14/30/90일) 기준으로 필터링 가능합니다.",
  },
  {
    q: "USDT 결제는 어떻게 하나요?",
    a: "원하는 요금제를 선택하면 USDT(TRC20) 지갑 주소와 송금 금액이 표시됩니다. 송금 시 메모에 고유 코드를 반드시 입력해야 하며, 입금 확인 후 5~10분 내에 자동으로 API 키가 발급됩니다.",
  },
  {
    q: "서버는 어디에서 호스팅되나요?",
    a: "자체 인프라에서 24/7 운영됩니다. 자동 응답 및 예약 발송 기능을 위해 항상 온라인 상태를 유지하며, 정기적인 백업과 모니터링이 이루어집니다.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-app-bg">
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden bg-grid">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="relative mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-6 lg:px-8 text-center">
          <div className="badge-premium mx-auto w-fit mb-6 animate-fade-in">
            v2.0 출시 · 지금 가입하면 1개월 무료
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold leading-[1.1] tracking-tight animate-slide-up">
            텔레그램 자동화,
            <br />
            <span className="text-app-primary">코딩 없이</span>
            <br />
            하나의 대시보드에서
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-app-text-secondary animate-slide-up leading-relaxed">
            Telegram 계정 관리, 자동 응답, 예약 발송, 전달 분석까지.
            <br className="hidden sm:inline" />
            복잡한 프로그래밍 없이 클릭 몇 번으로 텔레그램 운영을 완전 자동화하세요.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/signup"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-semibold relative z-10"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="btn-secondary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-medium"
            >
              기능 살펴보기
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mx-auto mt-16 max-w-3xl glass-card rounded-2xl p-8 animate-fade-in">
            <div className="flex items-center justify-center gap-8 sm:gap-16 text-sm text-app-text-secondary">
              {[
                { value: "1분", label: "설치 시간" },
                { value: "무제한", label: "계정 연결" },
                { value: "99.9%", label: "가동률" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-app-primary">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-xs sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Problems Solved ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-app-surface/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
              이런 고민, 하고 계신가요?
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "반복적인 메시지 발송",
                desc: "매일 같은 시간에 같은 메시지를 수동으로 보내고 계신가요? 예약 발송과 답장 매크로가 대신해 드립니다.",
              },
              {
                title: "고객 문의 실시간 응대",
                desc: "FAQ 수준의 문의에 일일이 답변하느라 시간이 소모되나요? 키워드 기반 자동 응답이 즉시 답변합니다.",
              },
              {
                title: "여러 계정 관리의 어려움",
                desc: "여러 Telegram 계정을 오가며 관리하느라 비효율적이신가요? 하나의 대시보드에서 모두 제어하세요.",
              },
              {
                title: "발송 상태 확인 어려움",
                desc: "메시지가 실제로 전달되었는지, 실패했다면 이유가 무엇인지 알 수 없나요? 모든 전달 내역이 기록됩니다.",
              },
              {
                title: "계정 차단 위험",
                desc: "무분별한 발송으로 계정이 차단될까 걱정되시나요? 쿨다운과 속도 제한으로 안전하게 운영합니다.",
              },
              {
                title: "데이터 기반 의사결정",
                desc: "어떤 계정이 가장 효과적인지, 어떤 시간대에 발송이 잘 되는지 데이터로 확인하세요.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass-card rounded-2xl p-6 hover:border-app-border-strong transition-all"
              >
                <h3 className="text-sm font-semibold text-app-text">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-app-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Core Features ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
              실제 구현된{" "}
              <span className="text-app-primary">모든 기능</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-app-text-secondary max-w-2xl mx-auto">
              아래 기능은 모두 현재 대시보드에서 실제로 사용할 수 있습니다.
              허위 광고 없이, 실제 구동되는 기능만을 소개합니다.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="glass-card rounded-2xl p-6 animate-slide-up hover:border-app-border-strong transition-all"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary/10 text-app-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-app-text">
                      {feat.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-app-text-secondary leading-relaxed">
                    {feat.desc}
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {feat.details.map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-2 text-xs text-app-text-muted"
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-app-primary" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/features"
              className="btn-secondary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-medium"
            >
              모든 기능 상세 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Delivery Analytics Spotlight ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-app-surface/30">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="badge-premium w-fit mb-4">신규</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
                메시지 전달{" "}
                <span className="text-app-primary">분석</span>
              </h2>
              <p className="mt-4 text-base text-app-text-secondary leading-relaxed">
                단순히 메시지를 발송하는 것에서 그치지 않습니다. 
                모든 전달 결과를 수집하여 성공률, 실패 원인, 계정별 성과,
                전달 지연 시간까지 상세하게 분석합니다.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "총 전달 시도/성공/실패 현황",
                  "실패 유형별 인텔리전스 분석",
                  "계정별 전달 성과 랭킹",
                  "시간대별 전달 타임라인",
                  "P95 전달 지연 시간 측정",
                  "소스별(발송/자동응답/매크로) 분석",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-app-text-secondary"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0 text-app-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-2xl p-8 sm:p-10">
              <div className="space-y-4">
                {/* Mock analytics card */}
                <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg p-4">
                  <span className="text-xs text-app-text-muted">전달 성공률</span>
                  <div className="text-lg font-bold text-app-success">94.7%</div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg p-4">
                  <span className="text-xs text-app-text-muted">평균 지연</span>
                  <div className="text-lg font-bold text-app-text">1.2s</div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg p-4">
                  <span className="text-xs text-app-text-muted">P95 지연</span>
                  <div className="text-lg font-bold text-app-text">3.8s</div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg p-4">
                  <span className="text-xs text-app-text-muted">영향받은 계정</span>
                  <div className="text-lg font-bold text-app-text">2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
              시작은 <span className="text-app-primary">3단계</span>면 충분합니다
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[70%] h-px bg-gradient-to-r from-app-primary/40 to-transparent" />
                )}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-app-primary/10 text-2xl font-bold text-app-primary">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-app-text">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-app-text-secondary leading-relaxed max-w-xs mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section
        id="pricing"
        className="relative px-4 py-24 sm:px-6 lg:px-8 bg-app-surface/30"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
              투명한 <span className="text-app-primary">가격</span>
            </h2>
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
                <h3 className="text-xl font-bold text-app-text">
                  {plan.name}
                </h3>
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
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
            자주 묻는 <span className="text-app-primary">질문</span>
          </h2>
          <div className="mt-12 space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group glass-card rounded-xl overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-app-text hover:text-app-primary transition-colors">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-app-text-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="divider-gradient" />
                <div className="px-5 py-4 text-sm text-app-text-secondary leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 text-center bg-app-surface/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-app-text">
            지금 바로 <span className="text-app-primary">시작</span>하세요
          </h2>
          <p className="mt-4 text-base sm:text-lg text-app-text-secondary max-w-xl mx-auto">
            1분만에 계정을 연결하고 텔레그램 자동화를 경험해보세요.
            <br />
            신용카드 없이 무료로 시작할 수 있습니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-xl px-10 text-base font-semibold relative z-10"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/get-api-key"
              className="btn-secondary inline-flex h-12 items-center gap-2 rounded-xl px-8 text-base font-medium"
            >
              API 키 발급받기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}