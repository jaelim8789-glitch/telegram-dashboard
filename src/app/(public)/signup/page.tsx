"use client";

import { useState, useMemo, type FormEvent, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock, UserCheck, RefreshCw, Key, AlertCircle, Send, ArrowLeft, ArrowRight } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { SITE } from "@/lib/site";
import { setToken, setSessionToken } from "@/lib/auth";
import * as freeApiKey from "@/lib/api_free_api_key";
import * as api from "@/lib/api";
import type { VerifyCheckStatus } from "@/lib/api_free_api_key";

declare global {
  interface Window {
    onTelegramAuth?: (user: api.TelegramAuthData) => void;
  }
}

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

function validatePhone(v: string): string | null {
  if (!v.startsWith("+")) return "국가코드(+82)를 포함한 전화번호를 입력해주세요.";
  if (v.length < 8) return "전화번호가 너무 짧습니다.";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "phone" | "channel" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
  const [tgLoggingIn, setTgLoggingIn] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  const tgDeepLink = useMemo(() => token ? `tg://resolve?domain=telemon_verify_bot&start=${token}` : null, [token]);

  // ── Telegram Login Widget (signup shortcut) ──
  const handleTgAuth = useCallback(async (user: api.TelegramAuthData) => {
    setTgLoggingIn(true);
    setError(null);
    try {
      const result = await api.telegramLogin(user);
      setToken(result.access_token);
      setSessionToken(result.session_token);
      if (result.is_new_user) {
        setStep("done");
        setApiKey("Telegram 계정으로 가입 완료!");
      } else {
        router.replace("/app");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram 로그인에 실패했습니다.");
    } finally {
      setTgLoggingIn(false);
    }
  }, [router]);

  useEffect(() => {
    if (!TELEGRAM_BOT_USERNAME) return;
    window.onTelegramAuth = handleTgAuth;
  }, [handleTgAuth]);

  // ── Verification flow ──

  async function handleStartVerification(e: FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    if (!phone.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const start = await freeApiKey.startFreeApiKeyVerification();
      setToken(start.token);
      tokenRef.current = start.token;
      try {
        sessionStorage.setItem("ft_token", start.token);
        sessionStorage.setItem("ft_deeplink", start.botDeepLink);
        sessionStorage.setItem("ft_channel", start.channelUrl);
        sessionStorage.setItem("ft_phone", phone.trim());
      } catch {}
      setBotDeepLink(start.botDeepLink);
      setChannelUrl(start.channelUrl);
      setVerifyStatus("idle");
      setVerifyReason(null);
      setStep("channel");
    } catch { setError("인증 시작에 실패했습니다."); }
    finally { setLoading(false); }
  }

  async function handleCheckVerification() {
    if (!tokenRef.current || checking) return;
    setChecking(true); setError(null);
    try {
      const result = await freeApiKey.checkTelegramVerification(tokenRef.current);
      setVerifyStatus(result.status);
      setVerifyReason(result.reason);
    } catch (err) { setError(err instanceof Error ? err.message : "인증 확인에 실패했습니다."); }
    finally { setChecking(false); }
  }

  async function handleIssueApiKey() {
    if (!tokenRef.current || !phone.trim() || issuing) return;
    setIssuing(true); setError(null);
    try {
      const result = await freeApiKey.issueFreeApiKey(tokenRef.current, phone.trim());
      if (result.apiKey) {
        setApiKey(result.apiKey);
        try { sessionStorage.removeItem("ft_token"); sessionStorage.removeItem("ft_deeplink"); sessionStorage.removeItem("ft_channel"); sessionStorage.removeItem("ft_phone"); } catch {}
        setStep("done");
      } else if (result.alreadyIssued) {
        setAlreadyIssued(true);
        setStep("done");
      } else {
        setError(result.detail || "API 키 발급에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 발급에 실패했습니다. 다시 시도해주세요.");
    }
    finally { setIssuing(false); }
  }

  const steps = ["plan", "phone", "channel", "done"];
  const currentIdx = steps.indexOf(step);

  const botStarted = verifyStatus === "unverified" || verifyStatus === "verified";
  const channelJoined = verifyStatus === "verified";

  const statusItems: { key: string; label: string; done: boolean; active: boolean }[] = [
    { key: "bot", label: "텔레그램 봇 시작 확인", done: botStarted, active: verifyStatus === "idle" || verifyStatus === "pending_bot_start" },
    { key: "joined", label: "채널 가입 확인", done: channelJoined, active: verifyStatus === "unverified" },
    { key: "verified", label: "인증 완료", done: channelJoined, active: false },
    { key: "issuing", label: "API 키 발급 중", done: step === "done", active: issuing },
  ];

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("ft_token");
      if (saved && !tokenRef.current) {
        setToken(saved);
        tokenRef.current = saved;
        setBotDeepLink(sessionStorage.getItem("ft_deeplink"));
        setChannelUrl(sessionStorage.getItem("ft_channel"));
        const savedPhone = sessionStorage.getItem("ft_phone");
        if (savedPhone) setPhone(savedPhone);
        setVerifyStatus("idle");
        setVerifyReason(null);
        setStep("channel");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (step !== "channel" || !tokenRef.current || verifyStatus === "verified") return;

    let cancelled = false;
    let failCount = 0;
    const tick = async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const result = await freeApiKey.checkTelegramVerification(t);
        if (cancelled) return;
        failCount = 0;
        setVerifyStatus(result.status);
        setVerifyReason(result.reason);
        setError(null);
        if (result.status === "verified" && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch (err) {
        if (cancelled) return;
        failCount++;
        if (failCount >= 3) {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          setError("서버와 연결할 수 없습니다. 봇을 열고 인증을 완료한 후 '인증 확인' 버튼을 눌러주세요.");
        }
      }
    };

    tick();
    pollingRef.current = setInterval(tick, 4000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [step, verifyStatus]);

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

        {/* Telegram Login Widget (shown on first step) */}
        {step === "plan" && TELEGRAM_BOT_USERNAME && (
          <div className="mb-8">
            <div className="rounded-2xl border border-app-border/60 bg-app-card p-5 animate-scale-in">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-app-text mb-0.5">
                  <Send className="h-4 w-4 text-blue-500" />
                  Telegram으로 바로 시작
                </div>
                <p className="text-xs text-app-text-muted">별도 입력 없이 텔레그램 계정으로 가입합니다</p>
              </div>
              {tgLoggingIn ? (
                <div className="flex items-center justify-center gap-2 text-sm text-app-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Telegram 로그인 처리 중...
                </div>
              ) : (
                <div className="flex justify-center" id="tg-widget-container" ref={(el) => {
                  if (!el || el.hasChildNodes()) return;
                  window.onTelegramAuth = handleTgAuth;
                  const s = document.createElement("script");
                  s.src = "https://telegram.org/js/telegram-widget.js?22";
                  s.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
                  s.setAttribute("data-auth-url", `${SITE.app}/api/auth/telegram-login`);
                  s.setAttribute("data-size", "large");
                  s.setAttribute("data-onauth", "onTelegramAuth(user)");
                  s.setAttribute("data-request-access", "write");
                  s.async = true;
                  el.appendChild(s);
                }} />
              )}
            </div>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-app-border" />
              <span className="text-xs text-app-text-muted font-medium">또는 이메일로 가입</span>
              <div className="flex-1 h-px bg-app-border" />
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                i <= currentIdx ? "bg-app-primary text-white scale-110" : "bg-app-border text-app-text-secondary"
              }`}>{i + 1}</div>
              {i < 3 && <div className={`h-px w-8 transition-all duration-300 ${i < currentIdx ? "bg-app-primary" : "bg-app-border"}`} />}
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
                  { id: "free", name: "Free Plan", price: "무료", desc: "완전 무료 · 모든 기능 사용 가능" },
                  { id: "pro", name: "Pro", price: "$100/월", desc: "10개 계정, 예약 & 반복 발송, 발송 로그 & 전달 분석" },
                  { id: "team", name: "Team", price: "$199/분기", desc: "20개 계정, 예약 & 반복 발송, 계정 건강 모니터링" },
                ].map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedPlan === p.id ? "border-app-primary/50 bg-app-primary/10" : "border-app-border hover:border-app-primary/30"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div><span className="font-semibold text-app-text">{p.name}</span><span className="ml-2 text-sm text-app-primary">{p.price}</span></div>
                      {selectedPlan === p.id && <CheckCircle2 className="h-5 w-5 text-app-primary" />}
                    </div>
                    <p className="mt-1 text-xs text-app-text-secondary">{p.desc}</p>
                    {p.id === "free" && selectedPlan === p.id && (
                        <p className="mt-2 text-xs text-app-text-subtle">✅ 완전 무료로 모든 기능을 사용할 수 있습니다. 발송 시 워터마크 광고가 포함됩니다.</p>
                    )}
                  </button>
                ))}
              </div>
              <Button onClick={() => {
                if (selectedPlan === "free") {
                  setStep("phone");
                } else {
                  router.push(`/get-api-key?plan=${selectedPlan}`);
                }
              } } className="w-full h-12 rounded-xl text-sm font-semibold">{selectedPlan === "free" ? "1분 인증 시작 · 완전 무료" : "다음"}</Button>
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-app-text">전화번호 입력</h2>
              <form onSubmit={handleStartVerification} className="space-y-4">
                <Field label="전화번호" error={phoneError ?? undefined}>
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                    placeholder="+821012345678"
                    className={phoneError ? "border-red-500" : ""}
                    required
                  />
                </Field>
                {phoneError && <p className="text-xs text-red-500 -mt-2">{phoneError}</p>}
                <p className="text-xs text-app-text-muted">국가코드 포함 (예: +82). SMS 인증 없이 텔레그램 채널 가입으로 인증합니다.</p>
                <Button type="submit" disabled={loading} className="flex w-full h-12">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "시작하는 중..." : "다음"}
                  {!loading && <ArrowRight className="h-4 w-4 ml-1.5" />}
                </Button>
                <button type="button" onClick={() => setStep("plan")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> 이전으로
                </button>
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
                  <>
                    <a href={botDeepLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold">
                      <UserCheck className="mr-2 h-4 w-4" /> 텔레그램 봇 열기 (웹)
                    </a>
                    {tgDeepLink && (
                      <a href={tgDeepLink} target="_blank" rel="noopener noreferrer"
                        className="btn-secondary flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold">
                        <UserCheck className="mr-2 h-4 w-4" /> 텔레그램 봇 열기 (앱)
                      </a>
                    )}
                  </>
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
                    {!checking && <RefreshCw className="h-4 w-4 ml-1.5" />}
                  </Button>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <Button onClick={handleIssueApiKey} disabled={!channelJoined || issuing} loading={issuing} className="flex w-full h-12">
                  <Key className="mr-2 h-4 w-4" /> 🔑 API 키 수동 발급
                </Button>
                <Button onClick={handleCheckVerification} disabled={checking || channelJoined} variant="secondary" className="flex w-full h-12">
                  {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                  {checking ? "인증 확인 중..." : "인증 확인 다시하기"}
                </Button>
                {alreadyIssued && (
                  <InlineError className="mb-0">
                    <AlertCircle className="mr-1.5 h-4 w-4 shrink-0 inline" />
                    이미 발급된 계정입니다. 로그인 페이지에서 API 키로 로그인해주세요.
                  </InlineError>
                )}
              </div>
              <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-app-text-muted hover:text-app-text transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> 이전으로
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-success-muted animate-scale-in">
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
                  {apiKey && !apiKey.startsWith("Telegram") && (
                    <div className="rounded-xl bg-app-surface border border-app-border p-4">
                      <code className="break-all text-sm text-app-text font-mono">{apiKey}</code>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-3 pt-2">
                <Link href={`${SITE.app}/admin/login`} className="btn-primary flex h-12 items-center justify-center rounded-xl text-sm font-semibold relative z-10">
                  대시보드로 이동
                </Link>
                <Link href="/pricing" className="block text-sm text-app-text-muted hover:text-app-text transition-colors">요금제 업그레이드</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
