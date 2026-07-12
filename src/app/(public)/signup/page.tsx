"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { SITE } from "@/lib/site";

export default function SignupPage() {
  const router = useRouter();
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
          {error && <InlineError className="mb-4">{error}</InlineError>}

          {step === "plan" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">요금제 선택</h2>
              <div className="space-y-3">
                {[
                  { id: "free", name: "Free Trial", price: "무료", desc: "1개 계정 연결, 자동 응답 기능, 메시지 발송" },
                  { id: "pro", name: "Pro", price: "$100/월", desc: "10개 계정, 예약 & 반복 발송, 발송 로그 & 전달 분석" },
                  { id: "team", name: "Team", price: "$199/분기", desc: "20개 계정, 예약 & 반복 발송, 계정 건강 모니터링" },
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
              <button onClick={() => {
                if (selectedPlan === "free") {
                  setStep("phone");
                } else {
                  router.push("/get-api-key");
                }
              }} className="btn-primary w-full h-12 rounded-xl text-sm font-semibold relative z-10">다음</button>
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">전화번호 인증</h2>
              <form onSubmit={handleSendCode} className="space-y-4">
                <Field label="전화번호">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+821012345678" required />
                </Field>
                <p className="text-xs text-app-text-muted">국가코드 포함 (예: +82)</p>
                <Button type="submit" disabled={loading} className="flex w-full h-12">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "발송 중..." : "인증번호 요청"}
                </Button>
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
                <Button type="submit" disabled={loading} className="flex w-full h-12">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "확인 중..." : "API 키 발급"}
                </Button>
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
                <Link href={`${SITE.app}/admin/login`} className="btn-primary flex h-12 items-center justify-center rounded-xl text-sm font-semibold relative z-10">대시보드로 이동</Link>
                <Link href="/pricing" className="block text-sm text-app-text-muted hover:text-app-text transition-colors">요금제 업그레이드</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}