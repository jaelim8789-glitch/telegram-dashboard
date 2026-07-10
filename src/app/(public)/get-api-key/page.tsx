"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { InlineError } from "@/components/ui/InlineError";
import { SITE } from "@/lib/site";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const PLANS = [
  { id: "basic", name: "Basic", usdt: 15, desc: "2개 계정, 10개 규칙, 월 1,000회" },
  { id: "pro", name: "Pro", usdt: 38, desc: "5개 계정, 50개 규칙, 월 10,000회" },
  { id: "enterprise", name: "Enterprise", usdt: 150, desc: "무제한 계정, 무제한 발송" },
];

export default function GetApiKeyPage() {
  const [step, setStep] = useState<"plan" | "payment" | "waiting" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [paymentRef, setPaymentRef] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (step !== "waiting" || !paymentRef) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payment/status/${paymentRef}`);
        const data = await res.json();
        if (data.status === "completed") {
          setApiKey(data.api_key);
          setStep("done");
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, paymentRef]);

  async function handleRequestKey() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payment/request-key?plan=${selectedPlan}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.detail || "요청 실패");
      setPaymentRef(data.payment_ref);
      setWalletAddress(data.wallet_address);
      setAmount(data.amount_usdt);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally { setLoading(false); }
  }

  function copyToClipboard(text: string, type: "wallet" | "memo" | "key") {
    navigator.clipboard.writeText(text);
    if (type === "wallet") { setCopiedWallet(true); setTimeout(() => setCopiedWallet(false), 2000); }
    if (type === "memo") { setCopiedMemo(true); setTimeout(() => setCopiedMemo(false), 2000); }
    if (type === "key") { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
  }

  return (
    <div className="min-h-screen bg-app-bg px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-app-text">API 키 발급받기</h1>
          <p className="mt-2 text-sm text-app-text-secondary">USDT(TRC20)로 결제하면 즉시 API 키가 발급됩니다</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {["plan", "payment", "waiting", "done"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                ["plan", "payment", "waiting", "done"].indexOf(step) >= i ? "bg-app-primary text-white" : "bg-app-border text-app-text-secondary"
              }`}>{i + 1}</div>
              {i < 3 && <div className={`h-px w-6 ${["plan", "payment", "waiting", "done"].indexOf(step) > i ? "bg-app-primary" : "bg-app-border"}`} />}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-app-border bg-app-card p-6 sm:p-8">
          {error && <InlineError className="mb-4">{error}</InlineError>}

          {step === "plan" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-app-text">1. 요금제 선택</h2>
              <p className="text-sm text-app-text-secondary">원하는 요금제를 선택하고 API 키 발급을 신청하세요.</p>
              <div className="space-y-3">
                {PLANS.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedPlan === p.id ? "border-app-primary/50 bg-app-primary/10" : "border-app-border hover:border-app-text-secondary"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div><span className="font-semibold text-app-text">{p.name}</span><span className="ml-2 text-sm text-app-primary font-medium">${p.usdt}</span></div>
                      {selectedPlan === p.id && <svg className="h-5 w-5 text-app-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <p className="mt-1 text-xs text-app-text-secondary">{p.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={handleRequestKey} disabled={loading}
                className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "처리 중..." : "API 키 발급 신청"}
              </button>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-app-text">2. USDT 송금</h2>
              <p className="text-sm text-app-text-secondary">아래 정보로 USDT(TRC20)를 보내주세요. 입금 확인 후 자동으로 API 키가 발급됩니다.</p>

              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <p className="text-xs text-app-text-secondary mb-1">보낼 주소 (TRC20)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all text-sm text-app-text font-mono">{walletAddress}</code>
                  <button onClick={() => copyToClipboard(walletAddress, "wallet")}
                    className="shrink-0 rounded-lg bg-app-primary/20 px-3 py-1.5 text-xs text-app-primary hover:bg-app-primary/30">{copiedWallet ? "복사됨" : "복사"}</button>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <p className="text-xs text-app-text-secondary mb-1">보낼 금액</p>
                <p className="text-2xl font-bold text-app-text">{amount} USDT</p>
              </div>

              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-xs text-yellow-400 font-semibold mb-1">메모(Memo) 필수!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-yellow-300 font-mono">{paymentRef}</code>
                  <button onClick={() => copyToClipboard(paymentRef, "memo")}
                    className="shrink-0 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/30">{copiedMemo ? "복사됨" : "복사"}</button>
                </div>
                <p className="mt-2 text-xs text-yellow-400/70">송금 시 메모에 반드시 위 코드를 입력해야 자동으로 API 키가 발급됩니다!</p>
              </div>

              <div className="rounded-xl bg-app-surface p-4 text-sm text-app-text-secondary space-y-2">
                <p><strong className="text-app-text">순서</strong></p>
                <p>1. 바이낸스/업비트에서 USDT(TRC20) 출금</p>
                <p>2. 위 지갑 주소로 <strong className="text-app-primary">{amount} USDT</strong> 보내기</p>
                <p>3. 메모에 <strong className="text-yellow-400">{paymentRef}</strong> 입력 (필수!)</p>
                <p>4. 5~10분 후 자동으로 API 키 발급</p>
              </div>

              <button onClick={() => setStep("waiting")}
                className="btn-primary flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold">USDT 보냈어요! 확인 대기</button>
            </div>
          )}

          {step === "waiting" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-primary/20">
                <Loader2 className="h-10 w-10 animate-spin text-app-primary" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">입금 확인 중...</h2>
              <p className="text-sm text-app-text-secondary">USDT 입금을 확인하고 있습니다. 평균 5~10분 소요됩니다.</p>
              <div className="rounded-xl border border-app-border bg-app-surface p-4 text-left text-sm space-y-2">
                <p className="text-app-text-secondary"><strong className="text-app-text">참고</strong></p>
                <p className="text-app-text-secondary">메모: <code className="text-yellow-400">{paymentRef}</code></p>
                <p className="text-app-text-secondary">금액: <strong className="text-app-primary">{amount} USDT</strong></p>
                <p className="text-app-text-secondary">네트워크: TRC20 (트론)</p>
              </div>
              <p className="text-xs text-app-text-secondary">이 페이지를 닫아도 됩니다. 나중에 같은 payment_ref로 상태를 확인할 수 있습니다.</p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted">
                <svg className="h-10 w-10 text-app-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-app-text">API 키 발급 완료!</h2>
              <p className="text-sm text-app-text-secondary">USDT 입금이 확인되었습니다. 아래 API 키를 안전한 곳에 저장하세요.</p>
              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all text-sm text-app-text font-mono">{apiKey}</code>
                  <button onClick={() => copyToClipboard(apiKey || "", "key")}
                    className="shrink-0 rounded-lg bg-app-primary/20 px-3 py-1.5 text-xs text-app-primary hover:bg-app-primary/30">{copiedKey ? "복사됨" : "복사"}</button>
                </div>
              </div>
              <div className="space-y-3">
                <Link href={`${SITE.app}/admin/login`} className="btn-primary flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold">
                  API 키로 로그인
                </Link>
                <Link href="/pricing" className="block text-sm text-app-text-secondary hover:text-app-text">요금제 업그레이드</Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-app-text-secondary">
          문의: @telemon_support · 결제 후 7일 이내 환불 가능
        </p>
      </div>
    </div>
  );
}