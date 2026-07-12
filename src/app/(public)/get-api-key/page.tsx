"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Copy, Check, ExternalLink, ArrowRight, Clock, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const PLANS = [
  { id: "basic", name: "Basic", usdt: 15, desc: "2개 계정 · 10개 규칙 · 월 1,000회", gradient: "from-app-primary to-orange-600" },
  { id: "pro", name: "Pro", usdt: 38, desc: "5개 계정 · 50개 규칙 · 월 10,000회", gradient: "from-purple-500 to-pink-600" },
  { id: "enterprise", name: "Enterprise", usdt: 150, desc: "무제한 계정 · 무제한 발송", gradient: "from-teal-500 to-cyan-600" },
];

const STEPS_META = [
  { label: "요금제", desc: "플랜 선택" },
  { label: "결제", desc: "USDT 송금" },
  { label: "확인", desc: "입금 대기" },
  { label: "완료", desc: "키 발급" },
];

export default function GetApiKeyPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<"plan" | "payment" | "waiting" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [paymentRef, setPaymentRef] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);

  // Poll payment status
  useEffect(() => {
    if (step !== "waiting" || !paymentRef) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payment/status/${paymentRef}`);
        const data = await res.json();
        if (data.status === "completed") {
          setApiKey(data.api_key);
          setStep("done");
          toast("success", "🎉 입금 확인! API 키가 발급되었습니다.");
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, paymentRef, toast]);

  // Waiting time counter
  useEffect(() => {
    if (step !== "waiting") { setWaitingTime(0); return; }
    const t = setInterval(() => setWaitingTime((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  async function handleRequestKey() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payment/request-key?plan=${selectedPlan}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.detail || "요청 실패");
      setPaymentRef(data.payment_ref);
      setWalletAddress(data.wallet_address);
      setAmount(data.amount_usdt);
      setStep("payment");
      toast("info", `결제 정보가 생성되었습니다. ${data.amount_usdt} USDT를 송금해주세요.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setLoading(false);
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

  const selectedPlanMeta = PLANS.find((p) => p.id === selectedPlan);

  const stepIdx = ["plan", "payment", "waiting", "done"].indexOf(step);

  return (
    <div className="min-h-screen bg-app-bg bg-grid px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary to-orange-600 text-xl font-bold text-white shadow-lg shadow-app-primary/25 mb-4">
            TM
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="text-app-text">API 키 </span>
            <span className="text-app-primary">발급받기</span>
          </h1>
          <p className="mt-2 text-sm text-app-text-secondary">USDT(TRC20)로 결제하면 즉시 API 키가 발급됩니다</p>
        </div>

        {/* Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-0">
            {STEPS_META.map((s, i) => {
              const isComplete = i < stepIdx;
              const isCurrent = i === stepIdx;
              return (
                <div key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isComplete
                        ? "bg-app-success text-white shadow-sm"
                        : isCurrent
                        ? "bg-app-primary text-white shadow-md shadow-app-primary/30 scale-110"
                        : "bg-app-card border border-app-border text-app-text-muted"
                    }`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${
                      isCurrent ? "text-app-primary" : isComplete ? "text-app-success" : "text-app-text-subtle"
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS_META.length - 1 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 rounded-full transition-all duration-300 ${
                      isComplete ? "bg-app-success" : isCurrent ? "bg-app-primary/40" : "bg-app-border"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-app-border bg-app-card p-6 sm:p-8 animate-scale-in shadow-xl shadow-black/20">
          {error && <InlineError className="mb-4">{error}</InlineError>}

          {/* Step 1: Plan Selection */}
          {step === "plan" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-app-text">요금제 선택</h2>
                <p className="text-sm text-app-text-secondary mt-1">원하는 요금제를 선택하고 API 키 발급을 신청하세요.</p>
              </div>
              <div className="space-y-3">
                {PLANS.map((p) => {
                  const selected = selectedPlan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`relative w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                        selected ? "border-app-primary/50 bg-app-primary/[0.08] shadow-sm shadow-app-primary/10" : "border-app-border hover:border-app-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient} text-xs font-bold text-white`}>
                            {p.name[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-app-text">{p.name}</span>
                            <span className="ml-2 text-sm font-bold text-app-primary">${p.usdt}</span>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-primary">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-app-text-secondary pl-[52px]">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleRequestKey}
                disabled={loading}
                className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 relative z-10 group"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 처리 중...</>
                ) : (
                  <>
                    {selectedPlanMeta?.name} 요금제 신청
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-app-text">USDT 송금</h2>
                <p className="text-sm text-app-text-secondary mt-1">
                  아래 정보로 USDT(TRC20)를 보내주세요. 입금 확인 후 자동으로 API 키가 발급됩니다.
                </p>
              </div>

              {/* Amount */}
              <div className="rounded-xl bg-gradient-to-r from-app-primary/10 to-purple-500/10 border border-app-border p-5 text-center">
                <p className="text-xs text-app-text-muted mb-1">송금 금액</p>
                <p className="text-3xl font-bold gradient-text">{amount} USDT</p>
                <p className="text-xs text-app-text-muted mt-1">네트워크: TRC20 (트론)</p>
              </div>

              {/* Wallet Address */}
              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <p className="text-[11px] font-medium text-app-text-muted mb-2 uppercase tracking-wider">보낼 주소 (TRC20)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all text-xs text-app-text font-mono bg-app-card rounded-lg p-2.5 border border-app-border/50">
                    {walletAddress}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(walletAddress, "wallet")}
                    className="shrink-0 rounded-lg bg-app-primary/20 px-3 py-2 text-xs font-medium text-app-primary hover:bg-app-primary/30 transition-all"
                  >
                    {copiedWallet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Memo (critical) */}
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

              {/* Instructions */}
              <div className="rounded-xl bg-app-surface border border-app-border p-4 text-sm space-y-2">
                <p className="font-medium text-app-text text-xs">📋 송금 순서</p>
                <ol className="space-y-1.5 text-xs text-app-text-secondary">
                  <li className="flex items-start gap-2"><span className="text-app-primary font-bold">1.</span> 바이낸스/업비트에서 USDT(TRC20) 출금</li>
                  <li className="flex items-start gap-2"><span className="text-app-primary font-bold">2.</span> 위 지갑 주소로 <strong className="text-app-text">{amount} USDT</strong> 보내기</li>
                  <li className="flex items-start gap-2"><span className="text-app-primary font-bold">3.</span> 메모에 <strong className="text-app-warning">{paymentRef}</strong> 입력 (필수)</li>
                  <li className="flex items-start gap-2"><span className="text-app-primary font-bold">4.</span> 5~10분 후 자동으로 API 키 발급</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setStep("waiting")}
                className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold relative z-10"
              >
                USDT 보냈어요! 확인 대기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 3: Waiting */}
          {step === "waiting" && (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-primary/20">
                <Loader2 className="h-10 w-10 animate-spin text-app-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-app-text">입금 확인 중...</h2>
                <p className="text-sm text-app-text-secondary mt-1">USDT 입금을 확인하고 있습니다.</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-2xl font-mono text-app-primary font-bold">
                <Clock className="h-5 w-5" />
                {formatTime(waitingTime)}
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-4 text-left text-sm space-y-2">
                <p className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider">송금 정보</p>
                <p className="text-app-text-secondary text-xs">메모: <code className="text-app-warning font-mono">{paymentRef}</code></p>
                <p className="text-app-text-secondary text-xs">금액: <strong className="text-app-primary">{amount} USDT</strong></p>
                <p className="text-app-text-secondary text-xs">네트워크: TRC20 (트론)</p>
              </div>

              <p className="text-xs text-app-text-subtle">
                이 페이지를 닫아도 됩니다. 나중에 같은 payment_ref로 상태를 확인할 수 있습니다.
              </p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && apiKey && (
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
                    className="flex items-center gap-1 rounded-lg bg-app-primary/20 px-2.5 py-1 text-xs font-medium text-app-primary hover:bg-app-primary/30 transition-all"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-all"
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
                <Link
                  href="/pricing"
                  className="flex items-center justify-center gap-1 text-sm text-app-text-muted hover:text-app-text transition-colors"
                >
                  다른 요금제 살펴보기
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-app-text-subtle">
          문의: @telemon_support · 결제 후 7일 이내 환불 가능
        </p>
      </div>
    </div>
  );
}
