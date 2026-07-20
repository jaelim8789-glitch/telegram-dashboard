"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import * as api from "@/lib/api";
import { setToken, setSessionToken, getSessionToken, getToken, clearToken, clearSessionToken } from "@/lib/auth";

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
      <div ref={widgetRef} className="flex justify-center min-h-[60px]" />
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-app-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          로그인 확인 중...
        </div>
      )}
    </div>
  );
}

// ── 관리자 로그인 폼 ──────────────────────────────────────────────

function AdminLoginForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="rounded-2xl border border-app-border/60 bg-app-card p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-app-text flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-app-primary" />
          관리자 로그인
        </h2>
        <button onClick={onBack} className="text-xs text-app-text-muted hover:text-app-primary underline underline-offset-2">
          ← 돌아가기
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="관리자 아이디"
          required
          className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl py-2.5 text-sm font-semibold bg-app-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const router = useRouter();
  const [tgSuccess, setTgSuccess] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary to-orange-600 text-2xl font-bold text-white shadow-lg shadow-app-primary/20 mb-4">
            TM
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
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
              로그인 정보 초기화
            </button>
          )}
        </div>

        {/* Telegram 로그인 - 메인 */}
        {TELEGRAM_BOT_USERNAME && !showAdmin && (
          <div className="mb-6">
            <div className="rounded-2xl border border-app-border/60 bg-app-card p-8 animate-scale-in text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center gap-1.5 text-base font-semibold text-app-text mb-1">
                  <Send className="h-5 w-5 text-blue-500" />
                  Telegram으로 시작하기
                </div>
                <p className="text-xs text-app-text-muted">텔레그램 계정만 있으면 바로 대시보드를 사용할 수 있습니다</p>
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

        {/* 관리자 로그인 폼 */}
        {showAdmin && <AdminLoginForm onBack={() => setShowAdmin(false)} />}

        {/* 관리자 로그인 링크 (화면 하단 구석) */}
        {!showAdmin && (
          <p className="mt-8 text-center">
            <button
              onClick={() => setShowAdmin(true)}
              className="text-xs text-app-text-muted hover:text-app-primary underline underline-offset-2 transition-colors"
            >
              관리자 로그인
            </button>
          </p>
        )}
      </div>
    </div>
  );
}