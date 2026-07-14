"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ShieldCheck, Loader2, ExternalLink, CheckCircle2, Copy, UserCheck, AlertCircle } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api";
import * as freeApiKey from "@/lib/api_free_api_key";
import { setToken, getSessionToken, clearSessionToken } from "@/lib/auth";
import type { VerifyCheckStatus } from "@/lib/api_free_api_key";

type AuthMethod = "admin" | "trial" | "apikey";

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      const token = await api.adminLogin(username, password);
      setToken(token);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="아이디">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
      </Field>
      <Field label="비밀번호">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={submitting} className="w-full h-11">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

function FreeTrialForm({ onGoToApiKey }: { onGoToApiKey: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [channelUrl, setChannelUrl] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyCheckStatus | "idle">("idle");
  const [verifyReason, setVerifyReason] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [alreadyIssued, setAlreadyIssued] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  async function handleStart() {
    if (starting) return;
    setStarting(true); setError(null); setAlreadyIssued(false);
    try {
      const start = await freeApiKey.startFreeApiKeyVerification();
      setToken(start.token);
      tokenRef.current = start.token;
      try { sessionStorage.setItem("ft_token", start.token); sessionStorage.setItem("ft_deeplink", start.botDeepLink); sessionStorage.setItem("ft_channel", start.channelUrl); } catch {}
      setBotDeepLink(start.botDeepLink);
      setChannelUrl(start.channelUrl);
      setVerifyStatus("idle");
      setVerifyReason(null);
    } catch (err) { setError(err instanceof Error ? err.message : "인증 시작에 실패했습니다."); }
    finally { setStarting(false); }
  }

  async function handleCopy() {
    if (apiKey) {
      try { await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      catch {}
    }
  }

  async function handleClaimApiKey() {
    if (!token || issuing || apiKey) return;
    setIssuing(true); setError(null); setAlreadyIssued(false);
    try {
      const result = await freeApiKey.issueFreeApiKey(token);
      if (result.apiKey) {
        setApiKey(result.apiKey);
        try { sessionStorage.removeItem("ft_token"); sessionStorage.removeItem("ft_deeplink"); sessionStorage.removeItem("ft_channel"); } catch {}
      } else if (result.alreadyIssued) {
        setAlreadyIssued(true);
      } else {
        setError(result.detail || "API 키 발급에 실패했습니다. 관리자에게 문의해주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 발급에 실패했습니다. 관리자에게 문의해주세요.");
    }
    finally { setIssuing(false); }
  }

  const botStarted = verifyStatus === "unverified" || verifyStatus === "verified";
  const channelJoined = verifyStatus === "verified";

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("ft_token");
      if (saved && !tokenRef.current) {
        setToken(saved);
        tokenRef.current = saved;
        setBotDeepLink(sessionStorage.getItem("ft_deeplink"));
        setChannelUrl(sessionStorage.getItem("ft_channel"));
        setVerifyStatus("idle");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!tokenRef.current || verifyStatus === "verified") return;
    let cancelled = false;
    const tick = async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const result = await freeApiKey.checkTelegramVerification(t);
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
      }
    };
    pollingRef.current = setInterval(tick, 4000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [verifyStatus]);

  if (apiKey) return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-app-success-muted">
        <CheckCircle2 className="h-7 w-7 text-app-success" />
      </div>
      <p className="text-sm text-app-text-secondary">무료 API 키가 발급되었습니다</p>
      <p className="text-xs text-app-text-muted">24시간 동안 유효합니다. 아래 키를 복사하여 로그인해주세요.</p>
      <div className="rounded-xl bg-app-surface border border-app-border p-3 relative">
        <code className="break-all text-xs text-app-text font-mono">{apiKey}</code>
      </div>
      <button onClick={handleCopy}
        className="btn-secondary w-full h-10 rounded-xl text-sm flex items-center justify-center gap-1.5">
        <Copy className="h-4 w-4" />{copied ? "복사됨" : "API 키 복사"}
      </button>
      <button onClick={onGoToApiKey}
        className="btn-primary w-full h-10 rounded-xl text-sm flex items-center justify-center gap-1.5">
        <KeyRound className="h-4 w-4" /> API 키로 로그인
      </button>
    </div>
  );

  if (!token) return (
    <div className="space-y-4">
      <p className="text-xs text-app-text-muted leading-relaxed">
        텔레그램 채널 <strong className="text-app-text">@TeleMon_2</strong>에 가입하고
        봇 인증을 완료하면 <strong className="text-app-text">24시간</strong> 동안 사용 가능한
        무료 API 키가 발급됩니다.
      </p>
      {error && <InlineError>{error}</InlineError>}
      <Button onClick={handleStart} disabled={starting} className="flex w-full h-11">
        {starting && <Loader2 className="h-4 w-4 animate-spin" />}
        {starting ? "시작하는 중..." : "무료체험 시작"}
      </Button>
    </div>
  );

  const canClaim = channelJoined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          {botStarted ? <CheckCircle2 className="h-4 w-4 text-app-success shrink-0" /> : <Loader2 className="h-4 w-4 animate-spin text-app-primary shrink-0" />}
          <span className={botStarted ? "text-app-text-secondary" : "text-app-text font-medium"}>텔레그램 봇 시작 확인</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {channelJoined ? <CheckCircle2 className="h-4 w-4 text-app-success shrink-0" /> : <Loader2 className="h-4 w-4 animate-spin text-app-primary shrink-0" />}
          <span className={channelJoined ? "text-app-text-secondary" : "text-app-text font-medium"}>채널 가입 확인</span>
        </div>
      </div>

      <div className="space-y-2">
        {botDeepLink && !channelJoined && (
          <a href={botDeepLink} target="_blank" rel="noopener noreferrer"
            className="btn-secondary flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold gap-1.5">
            <UserCheck className="h-4 w-4" /> 텔레그램 봇 열기
          </a>
        )}
        {channelUrl && !channelJoined && (
          <a href={channelUrl} target="_blank" rel="noopener noreferrer"
            className="btn-secondary flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold gap-1.5">
            <ExternalLink className="h-4 w-4" /> 채널 가입하기
          </a>
        )}
      </div>

      {channelJoined && (
        <p className="text-xs text-app-success flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> 채널 가입이 확인되었습니다.</p>
      )}

      <div className="pt-1">
        <Button onClick={handleClaimApiKey} disabled={!canClaim || issuing || !!apiKey} loading={issuing} className="flex w-full h-11">
          🔑 API 키 수동 발급
        </Button>
        {!canClaim && (
          <p className="text-xs text-app-text-muted mt-1.5 text-center">
            위 단계를 완료하면 버튼이 활성화됩니다
          </p>
        )}
      </div>

      {alreadyIssued && (
        <InlineError className="mb-0">
          <AlertCircle className="mr-1.5 h-3.5 w-3.5 shrink-0 inline" />
          이미 발급된 계정입니다. {" "}
          <button type="button" onClick={onGoToApiKey} className="underline text-app-primary hover:text-app-primary-hover">API 키로 로그인</button>
          하거나 관리자에게 문의해주세요.
        </InlineError>
      )}

      {!channelJoined && verifyStatus === "unverified" && verifyReason === "not_a_member" && (
        <InlineError><AlertCircle className="mr-1.5 h-3.5 w-3.5 shrink-0 inline" />채널 가입이 확인되지 않았습니다. 채널에 가입한 후 다시 시도해주세요.</InlineError>
      )}
      {!channelJoined && verifyStatus === "unverified" && verifyReason === "membership_check_unavailable" && (
        <InlineError><AlertCircle className="mr-1.5 h-3.5 w-3.5 shrink-0 inline" />지금은 확인할 수 없습니다. 잠시 후 다시 시도해주세요.</InlineError>
      )}
      {error && !alreadyIssued && <InlineError>{error}</InlineError>}
    </div>
  );
}

function ApiKeyLoginForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getSessionToken();
    if (saved) {
      setSubmitting(true);
      api.fetchAuthMe().then((me) => {
        if (me.role === "user" || me.role === "api_key") {
          router.replace("/app");
        } else {
          clearSessionToken();
          setSubmitting(false);
        }
      }).catch(() => {
        clearSessionToken();
        setSubmitting(false);
      });
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || submitting) return;
    setSubmitting(true); setError(null);
    try { const token = await api.loginWithApiKey(apiKey.trim()); setToken(token); clearSessionToken(); router.replace("/app"); }
    catch (err) { setError(err instanceof Error ? err.message : "로그인 실패"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="API 키">
        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="font-mono" required />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={submitting} className="flex w-full h-11">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "확인 중..." : "로그인"}
      </Button>
    </form>
  );
}

const METHODS: { id: AuthMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "admin", label: "관리자", icon: <ShieldCheck className="h-4 w-4" />, desc: "아이디와 비밀번호로 로그인" },
  { id: "trial", label: "무료체험", icon: <CheckCircle2 className="h-4 w-4" />, desc: "채널 가입하고 무료 API 키 받기" },
  { id: "apikey", label: "API 키", icon: <KeyRound className="h-4 w-4" />, desc: "발급받은 키로 바로 로그인" },
];

export default function AdminLoginPage() {
  const [method, setMethod] = useState<AuthMethod>("admin");

  return (
    <div className="relative min-h-screen bg-app-bg flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary to-orange-600 text-xl font-bold text-white shadow-lg shadow-app-primary/20 mb-4">
            TM
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-app-text">Tele</span>
            <span className="text-app-primary">Mon</span>
          </h1>
          <p className="text-sm text-app-text-muted mt-1">텔레그램 자동화 대시보드</p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-app-surface p-1 border border-app-border">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-all ${
                method === m.id
                  ? "bg-app-card text-app-text shadow-sm"
                  : "text-app-text-muted hover:text-app-text-secondary"
              }`}
            >
              {m.icon}
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-app-border bg-app-card p-6 animate-scale-in">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-app-text">
              {method === "admin" ? "관리자 로그인" : method === "trial" ? "무료체험" : "API 키 로그인"}
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              {METHODS.find((m) => m.id === method)?.desc}
            </p>
          </div>
          {method === "admin" && <AdminLoginForm />}
          {method === "trial" && <FreeTrialForm onGoToApiKey={() => setMethod("apikey")} />}
          {method === "apikey" && <ApiKeyLoginForm />}
        </div>

        <p className="mt-5 text-center text-xs text-app-text-muted">
          아직 API 키가 없으신가요?{" "}
          <Link href="/get-api-key" className="text-app-primary hover:text-app-primary-hover transition-colors">USDT로 발급받기</Link>
        </p>
      </div>
    </div>
  );
}