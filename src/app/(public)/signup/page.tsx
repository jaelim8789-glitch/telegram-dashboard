"use client";

import { useState, type FormEvent, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock, UserCheck, RefreshCw, Key, AlertCircle } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { SITE } from "@/lib/site";
import * as freeApiKey from "@/lib/api_free_api_key";
import type { VerifyCheckStatus } from "@/lib/api_free_api_key";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "phone" | "channel" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [channelUrl, setChannelUrl] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyCheckStatus | "idle">("idle");
  const [verifyReason, setVerifyReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [alreadyIssued, setAlreadyIssued] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleStartVerification(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const start = await freeApiKey.startFreeApiKeyVerification();
      setToken(start.token);
      setBotDeepLink(start.botDeepLink);
      setChannelUrl(start.channelUrl);
      setVerifyStatus("idle");
      setVerifyReason(null);
      setStep("channel");
    } catch (err) { setError(err instanceof Error ? err.message : "인증 시작에 실패했습니다."); }
    finally { setLoading(false); }
  }

  async function handleCheckVerification() {
    if (!token || checking) return;
    setChecking(true); setError(null);
    try {
      const result = await freeApiKey.checkTelegramVerification(token);
      setVerifyStatus(result.status);
      setVerifyReason(result.reason);
    } catch (err) { setError(err instanceof Error ? err.message : "인증 확인에 실패했습니다."); }
    finally { setChecking(false); }
  }

  async function handleIssueApiKey() {
    if (!token || !phone.trim() || issuing) return;
    setIssuing(true); setError(null);
    try {
      const result = await freeApiKey.issueFreeApiKey(token, phone.trim());
      setApiKey(result.apiKey);
      setAlreadyIssued(result.alreadyIssued);
      setStep("done");
    } catch (err) { setError(err instanceof Error ? err.message : "API 키 발급에 실패했습니다."); }
    finally { setIssuing(false); }
  }

  const steps = ["plan", "phone", "channel", "done"];
  const currentIdx = steps.indexOf(step);

  // "bot" is only done once the backend confirms the bot chat was started
  // (verifyStatus leaves pending_bot_start) — having a token just means the
  // verification session exists, not that the user opened the bot yet.
  const botStarted = verifyStatus === "unverified" || verifyStatus === "verified";
  const channelJoined = verifyStatus === "verified";

  const statusItems: { key: string; label: string; done: boolean; active: boolean }[] = [
    { key: "bot", label: "텔레그램 봇 시작 확인", done: botStarted, active: verifyStatus === "idle" || verifyStatus === "pending_bot_start" },
    { key: "joined", label: "채널 가입 확인", done: channelJoined, active: verifyStatus === "unverified" },
    { key: "verified", label: "인증 완료", done: channelJoined, active: false },
    { key: "issuing", label: "API 키 발급 중", done: step === "done", active: issuing },
  ];

  // Auto-polls verification status every 4s while the channel step is active.
  // Stops on unmount, step change, verified, or a request error (surfaced via
  // the shared `error` banner) so the user must manually retry with the
  // existing "인증 확인" button rather than retrying forever silently.
  useEffect(() => {
    if (step !== "channel" || !token || verifyStatus === "verified") return;

    let cancelled = false;
    const tick = async () => {
      setChecking(true);
      try {
        const result = await freeApiKey.checkTelegramVerification(token);
        if (cancelled) return;
        setVerifyStatus(result.status);
        setVerifyReason(result.reason);
        setError(null);
        if (result.status === "verified" && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch (err) {
        if (cancelled) return;
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        setError(err instanceof Error ? err.message : "인증 확인에 실패했습니다. 다시 시도해주세요.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    pollingRef.current = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [step, token, verifyStatus]);

  const verifyHint =
    verifyStatus === "idle" || verifyStatus === "pending_bot_start" ? { text: "먼저 텔레그램 봇을 열어 인증을 시작해주세요.", isError: false }
    : verifyStatus === "unverified" ? (verifyReason === "membership_check_unavailable"
        ? { text: "지금은 확인할 수 없습니다. 잠시 후 다시 시도해주세요.", isError: true }
        : { text: "채널 가입이 확인되지 않았습니다. 채널에 가입한 후 다시 시도해주세요.", isError: true })
    : null;

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
                  { id: "free", name: "Free Trial", price: "무료 (24시간)", desc: "1개 계정 연결, 자동 응답 기능, 메시지 발송" },
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
                    {p.id === "free" && selectedPlan === p.id && (
                        <p className="mt-2 text-xs text-app-text-subtle">24시간 후 자동 만료됩니다. 부담 없이 시작하세요.</p>
                    )}
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
              <h2 className="text-lg font-semibold text-app-text">전화번호 입력</h2>
              <form onSubmit={handleStartVerification} className="space-y-4">
                <Field label="전화번호">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+821012345678" required />
                </Field>
                <p className="text-xs text-app-text-muted">국가코드 포함 (예: +82). SMS 인증 없이 텔레그램 채널 가입으로 인증합니다.</p>
                <Button type="submit" disabled={loading} className="flex w-full h-12">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "시작하는 중..." : "다음"}
                </Button>
                <button type="button" onClick={() => setStep("plan")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors">이전으로</button>
              </form>
            </div>
          )}

          {step === "channel" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">텔레그램 채널 인증</h2>

              {/* Step-by-step progress */}
              <div className="space-y-2">
                {statusItems.map((item) => {
                  let icon = <Clock className="h-4 w-4 text-app-text-muted" />;
                  if (item.done) icon = <CheckCircle2 className="h-4 w-4 text-app-success" />;
                  else if (item.active) icon = <Loader2 className="h-4 w-4 animate-spin text-app-primary" />;
                  return (
                    <div key={item.key} className="flex items-center gap-2 text-sm">
                      {icon}
                      <span className={item.done ? "text-app-text-secondary line-through" : item.active ? "text-app-text font-medium" : "text-app-text-secondary"}>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                {botDeepLink && (
                  <a href={botDeepLink} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold">
                    <UserCheck className="mr-2 h-4 w-4" /> 텔레그램 봇 열기
                  </a>
                )}
                {channelUrl && (
                  <a href={channelUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold">
                    <RefreshCw className="mr-2 h-4 w-4" /> 채널 가입하기
                  </a>
                )}
              </div>

              {verifyStatus === "verified" ? (
                <div className="space-y-3">
                  <p className="text-sm text-app-success flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> 채널 가입이 확인되었습니다.</p>
                  <Button onClick={handleIssueApiKey} disabled={issuing} className="flex w-full h-12">
                    {issuing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {issuing ? "발급 중..." : <><Key className="mr-2 h-4 w-4" /> 무료 API 키 받기</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {verifyHint && verifyHint.isError ? (
                    <InlineError className="mb-0"><AlertCircle className="mr-1.5 h-3.5 w-3.5 shrink-0 inline" />{verifyHint.text}</InlineError>
                  ) : verifyHint ? (
                    <div className="flex items-start gap-2 rounded-xl border border-app-border bg-app-card-hover/50 px-3 py-2.5 text-xs text-app-text-muted">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-text-muted" />
                      <span>{verifyHint.text}</span>
                    </div>
                  ) : null}
                  <Button onClick={handleCheckVerification} disabled={checking} className="flex w-full h-12">
                    {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                    {checking ? "인증 확인 중..." : "인증 확인"}
                  </Button>
                </div>
              )}
              <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors">이전으로</button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted">
                <CheckCircle2 className="h-10 w-10 text-app-success" />
              </div>
              {alreadyIssued ? (
                <>
                  <h2 className="text-xl font-bold text-app-text">이미 발급된 계정입니다</h2>
                  <p className="text-sm text-app-text-secondary">이 전화번호로는 이미 무료 API 키가 발급되었습니다. 로그인 페이지에서 계속 진행해주세요.</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-app-text">가입 완료!</h2>
                  <p className="text-sm text-app-text-secondary">아래 API 키를 안전한 곳에 저장하세요. 지금만 확인 가능합니다.</p>
                  <div className="rounded-xl bg-app-surface border border-app-border p-4">
                    <code className="break-all text-sm text-app-text font-mono">{apiKey}</code>
                  </div>
                </>
              )}
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
