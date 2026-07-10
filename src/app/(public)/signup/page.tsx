"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [step, setStep] = useState<"plan" | "phone" | "code" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/auth/send-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "발송 실패"); }
      setStep("code");
    } catch (err) { setError(err instanceof Error ? err.message : "발송 실패"); }
    finally { setLoading(false); }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/auth/verify-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "인증 실패"); }
      const data = await res.json();
      setApiKey(data.api_key); setStep("done");
    } catch (err) { setError(err instanceof Error ? err.message : "인증 실패"); }
    finally { setLoading(false); }
  }

  const steps = ["plan", "phone", "code", "done"];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-app-bg bg-grid px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-app-text">
            <span className="text-app-primary">회원가입</span>
          </h1>
          <p className="mt-2 text-app-text-secondary">1분만에 시작하세요</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i <= currentIdx ? "bg-app-primary text-white" : "bg-app-border text-app-text-secondary"
              }`}>{i + 1}</div>
              {i < 3 && <div className={`h-px w-8 ${i < currentIdx ? "bg-app-primary" : "bg-app-border"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-app-border bg-app-card p-6 sm:p-8 animate-scale-in">
          {error && (
            <div className="mb-4 rounded-lg border border-app-danger/20 bg-app-danger-muted px-3 py-2 text-sm text-app-danger">
              {error}
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">요금제 선택</h2>
              <div className="space-y-3">
                {[
                  { id: "free", name: "Free", price: "무료", desc: "1개 계정, 3개 규칙, 월 100회" },
                  { id: "basic", name: "Basic", price: "$15/월", desc: "2개 계정, 10개 규칙, 월 1,000회" },
                  { id: "pro", name: "Pro", price: "$38/월", desc: "5개 계정, 50개 규칙, 월 10,000회" },
                ].map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedPlan === p.id ? "border-app-primary/50 bg-app-primary/10" : "border-app-border hover:border-app-primary/30"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div><span className="font-semibold text-app-text">{p.name}</span><span className="ml-2 text-sm text-app-primary">{p.price}</span></div>
                      {selectedPlan === p.id && <svg className="h-5 w-5 text-app-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <p className="mt-1 text-xs text-app-text-secondary">{p.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("phone")} className="btn-primary w-full h-12 rounded-xl text-sm font-semibold relative z-10">다음</button>
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">전화번호 인증</h2>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1.5">전화번호</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+821012345678"
                    className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text placeholder:text-app-text-subtle focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-colors" required />
                  <p className="mt-1.5 text-xs text-app-text-muted">국가코드 포함 (예: +82)</p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary flex w-full h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold relative z-10 disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "발송 중..." : "인증번호 요청"}
                </button>
                <button type="button" onClick={() => setStep("plan")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors">이전으로</button>
              </form>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">인증번호 입력</h2>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1.5">인증번호</label>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" maxLength={6} inputMode="numeric"
                    className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-center text-2xl tracking-[0.5em] text-app-text placeholder:text-app-text-subtle focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-colors" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary flex w-full h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold relative z-10 disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "확인 중..." : "API 키 발급"}
                </button>
                <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors">이전으로</button>
              </form>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted">
                <svg className="h-10 w-10 text-app-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-app-text">가입 완료!</h2>
              <p className="text-sm text-app-text-secondary">아래 API 키를 안전한 곳에 저장하세요. 지금만 확인 가능합니다.</p>
              <div className="rounded-xl bg-app-surface border border-app-border p-4">
                <code className="break-all text-sm text-app-text font-mono">{apiKey}</code>
              </div>
              <div className="space-y-3 pt-2">
                <Link href="/admin/login" className="btn-primary flex h-12 items-center justify-center rounded-xl text-sm font-semibold relative z-10">대시보드로 이동</Link>
                <Link href="/pricing" className="block text-sm text-app-text-muted hover:text-app-text transition-colors">요금제 업그레이드</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}