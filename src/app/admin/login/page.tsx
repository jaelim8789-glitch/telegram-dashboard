"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, Send } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api";
import { setToken, setSessionToken, getSessionToken, getToken, clearToken, clearSessionToken } from "@/lib/auth";

type AuthMethod = "admin" | "apikey";

// ─── Telegram Login Widget ──────────────────────────────────────────

declare global {
  interface Window {
    onTelegramAuth?: (user: api.TelegramAuthData) => void;
  }
}

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

function TelegramLoginButton({ onSuccess }: { onSuccess: (result: api.TelegramLoginResult) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !widgetRef.current || !TELEGRAM_BOT_USERNAME) return;
    initialized.current = true;

    window.onTelegramAuth = async (user) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.telegramLogin(user);
        onSuccess(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Telegram 로그인에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    widgetRef.current.appendChild(script);
  }, [onSuccess]);

  if (!TELEGRAM_BOT_USERNAME) return null;

  return (
    <div className="space-y-3">
      <div ref={widgetRef} className="flex justify-center min-h-[48px]" />
      {error && <InlineError>{error}</InlineError>}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-app-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Telegram 로그인 확인 중...
        </div>
      )}
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const token = await api.adminLogin(username.trim(), password);
      clearSessionToken();
      setToken(token);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="아이디">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="관리자 아이디" required />
      </Field>
      <Field label="비밀번호">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={submitting} className="flex w-full h-11">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "확인 중..." : "관리자 로그인"}
      </Button>
    </form>
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
    try {
      const token = await api.loginWithApiKey(apiKey.trim());
      clearSessionToken();
      setToken(token);
      router.replace("/app");
    }
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
  { id: "admin", label: "관리자", icon: <KeyRound className="h-4 w-4" />, desc: "아이디/비밀번호로 로그인" },
  { id: "apikey", label: "API 키", icon: <KeyRound className="h-4 w-4" />, desc: "발급받은 키로 바로 로그인" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("admin");
  const [tgSuccess, setTgSuccess] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  useEffect(() => {
    setHasSavedSession(Boolean(getToken() || getSessionToken()));
  }, []);

  function handleForceLogout() {
    clearToken();
    clearSessionToken();
    window.location.reload();
  }

  const handleTelegramSuccess = useCallback(async (result: api.TelegramLoginResult) => {
    clearToken();
    clearSessionToken();
    setToken(result.access_token);
    setSessionToken(result.session_token);
    setTgSuccess(true);
    try {
      const me = await api.fetchAuthMe();
      if (me.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/app");
      }
    } catch {
      router.replace("/app");
    }
  }, [router]);

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
          {hasSavedSession && (
            <button
              type="button"
              onClick={handleForceLogout}
              className="mt-2 text-xs text-app-text-muted underline underline-offset-2 hover:text-app-primary"
            >
              로그인 정보가 꼬였나요? 여기를 눌러 초기화 후 다시 로그인하세요
            </button>
          )}
        </div>

        {TELEGRAM_BOT_USERNAME && (
          <div className="mb-6">
            <div className="rounded-2xl border border-app-border/60 bg-app-card p-5 animate-scale-in">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-app-text mb-0.5">
                  <Send className="h-4 w-4 text-blue-500" />
                  Telegram으로 1초 로그인
                </div>
                <p className="text-xs text-app-text-muted">텔레그램 계정만 있으면 바로 시작할 수 있습니다</p>
              </div>
              {tgSuccess ? (
                <div className="flex items-center justify-center gap-2 text-sm text-app-success">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  로그인 성공! 이동 중...
                </div>
              ) : (
                <TelegramLoginButton onSuccess={handleTelegramSuccess} />
              )}
            </div>
          </div>
        )}

        {TELEGRAM_BOT_USERNAME && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-app-border" />
            <span className="text-xs text-app-text-muted font-medium">또는</span>
            <div className="flex-1 h-px bg-app-border" />
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-app-surface p-1 border border-app-border">
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
            <h2 className="text-base font-semibold text-app-text">{method === "admin" ? "관리자 로그인" : "API 키 로그인"}</h2>
            <p className="text-xs text-app-text-muted mt-0.5">{method === "admin" ? "관리자 계정으로 로그인" : "발급받은 키로 바로 로그인"}</p>
          </div>
          {method === "admin" && <AdminLoginForm />}
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