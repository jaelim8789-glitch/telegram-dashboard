"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { KeyRound, Loader2, X, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import * as api from "@/lib/api";
import { setToken } from "@/lib/auth";

interface ApiKeyGuardProps {
  /** 설명 (예: "발송 기능을 사용하려면 API 키가 필요합니다") */
  description: string;
  children: ReactNode;
  /** 현재 API 키가 등록되어 있는지 여부. 부모가 알고 있으면 전달 */
  hasApiKey?: boolean;
  /** API 키가 등록됐을 때 호출 */
  onKeySet?: () => void;
}

export default function ApiKeyGuard({ description, children, hasApiKey: hasApiKeyProp, onKeySet }: ApiKeyGuardProps) {
  const [open, setOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(hasApiKeyProp ?? false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (hasApiKeyProp !== undefined) setHasApiKey(hasApiKeyProp);
  }, [hasApiKeyProp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim() || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const token = await api.loginWithApiKey(apiKeyInput.trim());
      setToken(token);
      setHasApiKey(true);
      setSuccess(true);
      onKeySet?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setApiKeyInput("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키가 올바르지 않습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const showGuard = !hasApiKey;

  return (
    <>
      <div onClick={() => { if (showGuard) setOpen(true); }}>
        {children}
      </div>

      {/* Inline gate — visible when no API key is set */}
      {showGuard && open && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          {success ? (
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-success-muted">
                <CheckCircle2 className="h-5 w-5 text-app-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-app-text">API 키가 등록되었습니다!</p>
                <p className="text-xs text-app-text-muted">이제 기능을 사용할 수 있습니다</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <KeyRound className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">API 키가 필요합니다</p>
                  <p className="text-xs text-app-text-muted mt-0.5">{description}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 p-1 text-app-text-muted hover:text-app-text transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-... (API 키를 입력하세요)"
                    className="flex-1 rounded-xl px-3 py-2 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary font-mono min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !apiKeyInput.trim()}
                    className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold bg-app-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "확인 중..." : "등록"}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {error}
                  </p>
                )}
              </form>

              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-app-border/30" />
                <span className="text-[10px] text-app-text-subtle">또는</span>
                <span className="h-px flex-1 bg-app-border/30" />
              </div>

              <button
                type="button"
                onClick={() => window.location.href = "/get-api-key"}
                className="w-full rounded-xl py-2.5 text-sm font-semibold border border-app-primary/40 text-app-primary hover:bg-app-primary/10 flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
              >
                <Plus className="h-3.5 w-3.5" />
                API 키 새로 발급받기
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}