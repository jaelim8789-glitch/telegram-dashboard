"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, X, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(hasApiKeyProp ?? false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열리면 input 포커스
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // 부모가 hasApiKey를 전달하면 동기화
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
      // 1.5초 후 모달 닫기
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
      {/* 래핑된 컨텐츠 — API 키 없으면 클릭 시 모달 오픈 */}
      <div onClick={() => { if (showGuard) setOpen(true); }}>
        {children}
      </div>

      {/* 오버레이 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!submitting) setOpen(false); }} />

          {/* 모달 */}
          <div className="relative w-full max-w-md rounded-2xl border border-app-border/60 bg-app-card p-6 shadow-2xl animate-scale-in">
            {/* 닫기 */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-app-text-muted hover:text-app-text"
            >
              <X className="h-5 w-5" />
            </button>

            {success ? (
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-app-success-muted">
                  <CheckCircle2 className="h-7 w-7 text-app-success" />
                </div>
                <p className="text-sm font-semibold text-app-text">API 키가 등록되었습니다!</p>
                <p className="text-xs text-app-text-muted">이제 기능을 사용할 수 있습니다</p>
              </div>
            ) : (
              <>
                {/* 아이콘 + 설명 */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
                    <KeyRound className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-app-text">API 키 필요</h3>
                    <p className="text-xs text-app-text-muted mt-1">{description}</p>
                  </div>
                </div>

                {/* 입력 폼 */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    ref={inputRef}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary font-mono"
                  />
                  {error && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !apiKeyInput.trim()}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold bg-app-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "확인 중..." : "API 키 등록"}
                  </button>
                </form>

                <div className="mt-3 pt-3 border-t border-app-border/40 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/get-api-key")}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold border border-app-primary/40 text-app-primary hover:bg-app-primary/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    결제하고 발급받기
                  </button>
                  <p className="text-center text-[10px] text-app-text-subtle">
                    NOWPayments로 안전하게 결제하고 즉시 API 키를 발급받으세요
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}