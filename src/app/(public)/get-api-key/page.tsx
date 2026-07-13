"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, KeyRound, Shield, Smartphone, CheckCircle2, Star, Sparkles, Heart,
  Loader2, Copy, Check, AlertTriangle, Clock, Eye, EyeOff,
} from "lucide-react";
import { useFadeIn } from "@/lib/useFadeIn";
import { LaunchOfferCountdown } from "@/components/landing/LaunchOfferCountdown";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const POLL_TIMEOUT_SECONDS = 180;

// requestPlanId values are canonical plan ids (free/pro/team) matching the
// backend's PLAN_CATALOG (app/core/plans.py, branch fix/p0-2-pricing-contract-v2:
// pro=$100/monthly, team=$199/quarterly — same prices shown below). That branch
// is not yet merged to the backend's master; until it deploys, /api/payment/
// request-key?plan=team will 400 against the current stale billing.py catalog
// (which only knows free/basic/pro/enterprise). No id-mapping or stale pricing
// is used here — this intentionally targets the canonical contract, not the
// currently-deployed one.
const PLANS = [
  {
    name: "Free Trial",
    price: "0",
    period: "무료",
    features: ["1개 계정 연결", "자동 응답 기능", "메시지 발송", "기본 발송 로그"],
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
    requestPlanId: "pro",
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
    requestPlanId: "team",
    cta: "Team 시작",
    popular: false,
  },
  {
    name: "첫 발자취+",
    price: "1,000",
    period: "영구",
    badge: "첫 발자취+",
    badgeIcon: Star,
    tagline: "프랜차이즈처럼 영업하십시오.",
    features: [
      "무제한 계정 연결",
      "모든 프리미엄 기능 평생 무료",
      "평생 업데이트 & 신규 기능 포함",
      "24시간 우선 지원",
      "로드맵 의견 반영 우선권",
      "API 키 판매 & 임대 — 전부 무료",
      "한국어 · 영어 · 중국어 · 일본어 다국어 지원",
    ],
    href: "mailto:support@telemon.io?subject=첫 발자취+ 문의",
    cta: "첫 발자취 남기기",
    popular: false,
    premium: true,
    subtitle: "하나 사서 전 세계를 상대로 영업하십시오. 우리는 함께 성장합니다.",
  },
];

type FlowStep = "browse" | "payment" | "waiting" | "done";

export default function GetApiKeyPage() {
  useFadeIn();
  const { toast } = useToast();

  const [flowStep, setFlowStep] = useState<FlowStep>("browse");
  const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);

  // Poll payment status
  useEffect(() => {
    if (flowStep !== "waiting" || !paymentRef) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payment/status/${paymentRef}`);
        if (!res.ok) { /* non-2xx — keep polling */ return; }
        const data = await res.json();
        if (data.status === "completed") {
          const key = data.api_key ?? data.api_key_masked ?? null;
          if (key) {
            setApiKey(key);
            setFlowStep("done");
            toast("success", "🎉 입금 확인! API 키가 발급되었습니다.");
            clearInterval(interval);
          }
        }
      } catch { /* ignore — retry next interval */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [flowStep, paymentRef, toast]);

  // Waiting time counter + timeout
  useEffect(() => {
    if (flowStep !== "waiting") { setWaitingTime(0); return; }
    let mount = true;
    const t = setInterval(() => {
      if (!mount) return;
      setWaitingTime((p) => {
        if (p + 1 >= POLL_TIMEOUT_SECONDS) {
          setFlowStep("browse");
          setError("입금 확인 시간이 초과되었습니다. 다시 시도해주세요.");
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => { mount = false; clearInterval(t); };
  }, [flowStep]);

  async function handleRequestKey(planName: string, requestPlanId: string) {
    setRequestingPlanId(requestPlanId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payment/request-key?plan=${requestPlanId}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.detail || "요청 실패");
      setSelectedPlanName(planName);
      setPaymentRef(data.payment_ref);
      setWalletAddress(data.wallet_address);
      setAmount(data.amount_usdt);
      setFlowStep("payment");
      toast("info", `결제 정보가 생성되었습니다. ${data.amount_usdt} USDT를 송금해주세요.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setRequestingPlanId(null);
    }
  }

  function copyToClipboard(text: string, type: "wallet" | "memo" | "key") {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "wallet") { setCopiedWallet(true); setTimeout(() => setCopiedWallet(false), 2000); }
      if (type === "memo") { setCopiedMemo(true); setTimeout(() => setCopiedMemo(false), 2000); }
      if (type === "key") { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
      toast("success", "클립보드에 복사되었습니다");
    }).catch(() => toast("error", "복사에 실패했습니다"));
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="tm-section-bg bg-grid min-h-screen px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          홈으로
        </Link>

        <div className="text-center" data-fade>
          <div className="badge-premium mx-auto w-fit mb-4">API Key</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-app-text">
            <span className="gold-text">API 키</span> 발급
          </h1>
          <p className="mt-3 text-base text-app-text-secondary max-w-lg mx-auto">
            외부 프로그램·스크립트에서 TeleMon API를 사용하려면 X-API-Key가 필요합니다.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-6" data-fade>
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">1. 전화번호 인증</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  회원가입 페이지에서 전화번호를 입력하고 Telegram 앱으로 전송된 인증번호를 확인하세요.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">2. API 키 발급</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  인증 완료 시 API 키가 한 번만 표시됩니다. 안전한 곳에 복사해두세요.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">3. API 사용</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  발급받은 키를 HTTP 헤더 <code className="text-app-text">X-API-Key</code>에 담아 요청하세요. 모든 API 엔드포인트는 <code className="text-app-text">/api/*</code>에서 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2" data-fade>
          {[
            { icon: KeyRound, title: "SHA-256 해시 저장", desc: "원본 키는 저장되지 않으며, 해시로만 검증됩니다." },
            { icon: Shield, title: "관리자 콘솔에서 관리", desc: "발급·삭제·재발급을 관리자 페이지에서 직접 제어합니다." },
            { icon: CheckCircle2, title: "사용자별 발급", desc: "전화번호 인증 사용자마다 고유한 API 키가 부여됩니다." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass-card p-4 flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 gold-text" />
                <div>
                  <h4 className="text-sm font-semibold text-app-text">{item.title}</h4>
                  <p className="mt-0.5 text-xs text-app-text-muted">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center" data-fade>
          <Link href="/signup" className="btn-primary inline-flex h-11 items-center gap-2 rounded-[10px] px-8 text-sm font-semibold">
            지금 API 키 발급받기
          </Link>
        </div>
      </div>

      {/* ── Pricing Section ── */}
      <div className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto" data-fade>
          <div className="badge-premium mx-auto w-fit mb-4">요금제</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-app-text">
            투명한 <span className="gold-text">가격</span>
          </h2>
          <p className="mt-3 text-base text-app-text-secondary">
            필요한 만큼만 선택하세요. 언제든지 변경 가능합니다.
          </p>
        </div>

        {/* Countdown */}
        <div className="mt-12 mx-auto max-w-4xl">
          <LaunchOfferCountdown />
        </div>

        {flowStep === "browse" ? (
          <>
            {error && (
              <div className="mt-8 mx-auto max-w-lg">
                <InlineError>{error}</InlineError>
              </div>
            )}

            {/* Pricing Cards */}
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto items-stretch">
              {PLANS.map((plan, i) => {
                const isLifetime = plan.name === "첫 발자취+";
                const isRequesting = requestingPlanId === plan.requestPlanId;
                return (
                  <div
                    key={plan.name}
                    data-fade
                    className={`relative rounded-xl p-6 sm:p-7 transition-all duration-300 flex flex-col ${
                      plan.popular
                        ? "card-premium scale-[1.02] border-accent-border/40"
                        : isLifetime
                          ? "glass-card border-accent-border/50 ring-1 ring-accent-border/30 overflow-hidden"
                          : "glass-card"
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {/* 가장 인기 뱃지 */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-app-primary px-4 py-0.5 text-xs font-semibold text-app-bg shadow-sm whitespace-nowrap z-10">
                        가장 인기
                      </div>
                    )}

                    {/* 첫 발자취 전용 배경 효과 */}
                    {isLifetime && (
                      <>
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-accent-glow blur-[80px] opacity-30" />
                          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-accent-glow blur-[80px] opacity-20" />
                        </div>
                        <div className="absolute inset-0 rounded-xl pointer-events-none border border-accent-border/30" />
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-hover px-4 py-1 text-[10px] font-bold text-[var(--color-accent-contrast)] shadow-lg whitespace-nowrap uppercase tracking-wider">
                          <Star className="h-3 w-3 fill-current" />
                          첫 발자취+
                        </div>
                      </>
                    )}

                    <div className="relative z-0 flex flex-col h-full">
                      <h3 className="font-serif font-semibold text-app-text flex items-center gap-2">
                        {isLifetime ? (
                          <>
                            <Sparkles className="h-4 w-4 text-accent" />
                            <span className="text-base">{plan.name}</span>
                          </>
                        ) : (
                          <span className="text-base">{plan.name}</span>
                        )}
                      </h3>

                      <div className="mt-4 flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold text-app-text tabular-nums tracking-tight">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-app-text-secondary">/{plan.period}</span>
                      </div>

                      {isLifetime && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-accent font-medium leading-relaxed">
                            {plan.tagline}
                          </p>
                          {plan.subtitle && (
                            <p className="text-[11px] text-app-text-muted italic leading-relaxed">
                              &ldquo;{plan.subtitle}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      <ul className="mt-6 space-y-3 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-3 text-sm text-app-text-secondary">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 gold-text" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {plan.requestPlanId ? (
                        <button
                          type="button"
                          onClick={() => handleRequestKey(plan.name, plan.requestPlanId!)}
                          disabled={requestingPlanId !== null}
                          className={`mt-6 flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50 ${
                            plan.popular ? "btn-primary relative z-10" : "btn-secondary"
                          }`}
                        >
                          {isRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {plan.cta}
                        </button>
                      ) : (
                        <Link
                          href={plan.href!}
                          className={`mt-6 flex h-11 items-center justify-center rounded-[10px] text-sm font-semibold transition-all ${
                            isLifetime
                              ? "bg-gradient-to-r from-accent to-accent-hover text-[var(--color-accent-contrast)] shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]"
                              : "btn-secondary"
                          }`}
                        >
                          {isLifetime && <Heart className="h-3.5 w-3.5 mr-1.5" />}
                          {plan.cta}
                        </Link>
                      )}

                      {isLifetime && (
                        <p className="mt-3 text-center text-[10px] text-app-text-subtle leading-relaxed">
                          우리는 함께 갑니다. 시작부터 끝까지.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-16 mx-auto max-w-lg">
            <div className="glass-card p-6 sm:p-8">
              {error && <InlineError className="mb-4">{error}</InlineError>}

              {/* Payment step */}
              {flowStep === "payment" && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-semibold text-app-text">{selectedPlanName} 요금제 · USDT 송금</h2>
                    <p className="text-sm text-app-text-secondary mt-1">
                      아래 정보로 USDT(TRC20)를 보내주세요. 입금 확인 후 자동으로 API 키가 발급됩니다.
                    </p>
                  </div>

                  <div className="rounded-xl bg-app-primary-muted border border-app-border p-5 text-center">
                    <p className="text-xs text-app-text-muted mb-1">송금 금액</p>
                    <p className="text-3xl font-bold gold-text">{amount} USDT</p>
                    <p className="text-xs text-app-text-muted mt-1">네트워크: TRC20 (트론)</p>
                  </div>

                  <div className="rounded-xl border border-app-border bg-app-surface p-4">
                    <p className="text-[11px] font-medium text-app-text-muted mb-2 uppercase tracking-wider">보낼 주소 (TRC20)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all text-xs text-app-text font-mono bg-app-card rounded-lg p-2.5 border border-app-border/50">
                        {walletAddress}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(walletAddress, "wallet")}
                        className="shrink-0 rounded-lg bg-app-primary-muted px-3 py-2 text-xs font-medium gold-text hover:opacity-80 transition-all"
                      >
                        {copiedWallet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-app-warning/30 bg-app-warning-muted p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-app-warning" />
                      <p className="text-xs font-semibold text-app-warning">메모(Memo) 필수!</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-app-warning font-mono font-bold tracking-wide">{paymentRef}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentRef, "memo")}
                        className="shrink-0 rounded-lg bg-app-warning/20 px-3 py-1.5 text-xs font-medium text-app-warning hover:bg-app-warning/30 transition-all"
                      >
                        {copiedMemo ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-app-warning/70">
                      송금 시 메모에 반드시 위 코드를 입력해야 자동으로 API 키가 발급됩니다!
                    </p>
                  </div>

                  <div className="rounded-xl bg-app-surface border border-app-border p-4 text-sm space-y-2">
                    <p className="font-medium text-app-text text-xs">📋 송금 순서</p>
                    <ol className="space-y-1.5 text-xs text-app-text-secondary">
                      <li className="flex items-start gap-2"><span className="gold-text font-bold">1.</span> 바이낸스/업비트에서 USDT(TRC20) 출금</li>
                      <li className="flex items-start gap-2"><span className="gold-text font-bold">2.</span> 위 지갑 주소로 <strong className="text-app-text">{amount} USDT</strong> 보내기</li>
                      <li className="flex items-start gap-2"><span className="gold-text font-bold">3.</span> 메모에 <strong className="text-app-warning">{paymentRef}</strong> 입력 (필수)</li>
                      <li className="flex items-start gap-2"><span className="gold-text font-bold">4.</span> 5~10분 후 자동으로 API 키 발급</li>
                    </ol>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFlowStep("waiting")}
                    className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold relative z-10"
                  >
                    USDT 보냈어요! 확인 대기
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowStep("browse")}
                    className="w-full text-center text-xs text-app-text-muted hover:text-app-text transition-colors"
                  >
                    요금제 다시 선택
                  </button>
                </div>
              )}

              {/* Waiting step */}
              {flowStep === "waiting" && (
                <div className="space-y-6 text-center animate-fade-in">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-primary-muted">
                    <Loader2 className="h-10 w-10 animate-spin gold-text" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-app-text">입금 확인 중...</h2>
                    <p className="text-sm text-app-text-secondary mt-1">USDT 입금을 확인하고 있습니다.</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-2xl font-mono gold-text font-bold">
                    <Clock className="h-5 w-5" />
                    {formatTime(waitingTime)}
                  </div>

                  <div className="rounded-xl border border-app-border bg-app-surface p-4 text-left text-sm space-y-2">
                    <p className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider">송금 정보</p>
                    <p className="text-app-text-secondary text-xs">메모: <code className="text-app-warning font-mono">{paymentRef}</code></p>
                    <p className="text-app-text-secondary text-xs">금액: <strong className="gold-text">{amount} USDT</strong></p>
                    <p className="text-app-text-secondary text-xs">네트워크: TRC20 (트론)</p>
                  </div>

                  <p className="text-xs text-app-text-subtle">
                    이 페이지를 닫아도 됩니다. 나중에 같은 payment_ref로 상태를 확인할 수 있습니다.
                  </p>
                </div>
              )}

              {/* Done step */}
              {flowStep === "done" && apiKey && (
                <div className="space-y-6 text-center animate-scale-in">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted">
                    <CheckCircle2 className="h-10 w-10 text-app-success" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-app-text">API 키 발급 완료! 🎉</h2>
                    <p className="text-sm text-app-text-secondary mt-1">
                      USDT 입금이 확인되었습니다. 아래 API 키를 안전한 곳에 저장하세요.
                    </p>
                  </div>

                  <div className="rounded-xl border border-app-border bg-app-surface p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider">API Key</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(apiKey, "key")}
                        className="flex items-center gap-1 rounded-lg bg-app-primary-muted px-2.5 py-1 text-xs font-medium gold-text hover:opacity-80 transition-all"
                      >
                        {copiedKey ? <><Check className="h-3 w-3" /> 복사됨</> : <><Copy className="h-3 w-3" /> 복사</>}
                      </button>
                    </div>
                    <div className="relative">
                      <code className="block break-all text-sm text-app-text font-mono bg-app-card rounded-lg p-3 border border-app-border">
                        {showKey ? apiKey : apiKey.slice(0, 12) + "••••••••" + apiKey.slice(-8)}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-app-text-muted hover:text-app-text transition-all"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href="/admin/login"
                      className="btn-primary flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold relative z-10 group"
                    >
                      API 키로 로그인
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-app-text-subtle">
              문의: @telemon_support · 결제 후 7일 이내 환불 가능
            </p>
          </div>
        )}

        {/* Roadmap */}
        <div className="mt-24 mx-auto max-w-4xl" data-fade>
          <div className="rounded-2xl border border-accent-border/30 bg-gradient-to-br from-accent-glow/20 via-app-card to-accent-glow/10 p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-accent-glow blur-[100px] opacity-20 pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-accent-glow blur-[100px] opacity-10 pointer-events-none" />

            <div className="relative z-0">
              <div className="badge-premium mx-auto w-fit mb-4">
                <Sparkles className="h-3 w-3" />
                함께 갑시다
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
                이것이 끝이 아닙니다. <span className="gold-text">시작일 뿐입니다</span>
              </h2>
              <p className="mt-4 text-sm text-app-text-secondary leading-relaxed max-w-2xl mx-auto">
                지금 첫 발자취+를 구독하는 당신은 앞으로 나올{' '}
                <span className="text-app-text font-semibold">모든 자동화 프로그램</span>을
                함께하게 됩니다. 우리는 멈추지 않습니다.
              </p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left max-w-3xl mx-auto">
                {[
                  { icon: "🤖", title: "토토·바카라 사이트 자동화", desc: "AI 기반 베팅 자동화 & 어드민 운영 시스템" },
                  { icon: "🧠", title: "AI 어드민 & 마케팅팀", desc: "운영 자동화 — 웹서치팀·마케팅팀 통합 AI 어드민" },
                  { icon: "🎬", title: "유튜브 쇼츠 자동화", desc: "쇼츠 생성·업로드·관리 올인원 자동화" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-app-border bg-app-card/80 p-4 hover:border-accent-border/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <h3 className="text-sm font-semibold text-app-text group-hover:text-accent transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-app-text-muted leading-relaxed pl-9">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[10px] text-app-text-subtle italic">
                그리고 더 많은 자동화 프로그램이 계속 출시됩니다.
              </div>

              <div className="mt-8 border-t border-accent-border/20 pt-6 max-w-lg mx-auto">
                <p className="text-xs text-app-text-secondary leading-relaxed">
                  &ldquo;지금 함께하는 당신은 단순한 고객이 아닙니다.{' '}
                  <span className="text-accent font-medium">함께 첫 발자취를 내딛는 동반자</span>입니다.
                  우리가 만드는 모든 자동화는 당신의 것입니다.&rdquo;
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-app-text-subtle">
                  <Heart className="h-3 w-3 text-accent" />
                  기다리고 함께하면 모든 것이 당신의 것이 됩니다
                  <Heart className="h-3 w-3 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center max-w-lg mx-auto" data-fade>
          <div className="badge-premium mx-auto w-fit mb-4 animate-pulse-glow-soft">
            <Heart className="h-3 w-3" />
            함께 갑시다
          </div>
          <p className="text-sm text-app-text-secondary leading-relaxed max-w-sm mx-auto">
            &ldquo;최고를 향해 가다가 망하는 것이 가장 아름다운 길입니다.
            <br />
            우리는 그 길에 함께 서겠습니다.&rdquo;
          </p>
          <Link
            href="/signup"
            className="btn-primary mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] px-8 text-sm font-semibold animate-glow-pulse"
          >
            무료로 첫발을 내딛다
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
