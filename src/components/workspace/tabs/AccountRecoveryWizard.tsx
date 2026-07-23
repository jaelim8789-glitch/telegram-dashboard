"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Shield, RefreshCw, CheckCircle2, XCircle, ArrowRight,
  AlertTriangle, Smartphone, Key, UserCheck, Ban,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { Account } from "@/types";

function StepCheck({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-danger-muted">
          <ShieldAlert className="h-4 w-4 text-app-danger" />
        </div>
        <div>
          <p className="text-xs font-medium text-app-text">계정 문제 감지</p>
          <p className="text-[10px] text-app-text-muted">차단된 계정이 발견되었습니다</p>
        </div>
      </div>
      <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-3 text-xs text-app-danger">
        <p className="font-medium">Telegram 계정 차단 또는 인증 필요</p>
        <p className="mt-1 text-app-text-muted">아래 단계를 따라 계정을 복구하세요.</p>
      </div>
      <button onClick={onComplete}
        className="w-full rounded-xl bg-app-primary py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors flex items-center justify-center gap-1.5">
        복구 시작 <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StepAuth() {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setSending(true); setError(null);
    try {
      await api.request("/api/auth/send-code", { method: "POST", body: JSON.stringify({}) });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증코드 전송 실패");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-info-muted">
          <Smartphone className="h-4 w-4 text-app-info" />
        </div>
        <div>
          <p className="text-xs font-medium text-app-text">계정 인증</p>
          <p className="text-[10px] text-app-text-muted">Telegram으로 전송된 코드를 입력하세요</p>
        </div>
      </div>

      {!sent ? (
        <button onClick={handleSendCode} disabled={sending}
          className="w-full rounded-xl bg-app-primary py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
          {sending ? "전송 중..." : "인증 코드 발송"}
        </button>
      ) : (
        <div className="space-y-2">
          <input value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="인증 코드 입력"
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text text-center tracking-[0.3em] outline-none focus:border-app-primary/60 focus-ring"
            maxLength={6}
          />
          {error && <p className="text-[11px] text-app-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

function StepVerify() {
  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-success-muted">
        <CheckCircle2 className="h-6 w-6 text-app-success" />
      </div>
      <p className="text-xs font-medium text-app-text">계정 복구 완료</p>
      <p className="text-[11px] text-app-text-muted">계정이 정상적으로 인증되었습니다. 이제 발송을 재개할 수 있습니다.</p>
    </div>
  );
}

interface WizardStep {
  id: string;
  label: string;
}

const STEPS: WizardStep[] = [
  { id: "check", label: "진단" },
  { id: "auth", label: "인증" },
  { id: "verify", label: "완료" },
];

export function AccountRecoveryWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [currentAccount] = useState<Account | null>(null);
  const accounts = useDashboardStore((s) => s.accounts);

  const hasIssues = useCallback(() => {
    return accounts.some((a) => a.status === "banned" || a.status === "inactive");
  }, [accounts]);

  const startRecovery = () => {
    setStepIdx(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    if (!hasIssues()) return null;
    return (
      <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-3">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-app-danger shrink-0" />
          <span className="text-xs text-app-danger font-medium">복구가 필요한 계정이 있습니다</span>
          <button onClick={startRecovery}
            className="ml-auto rounded-lg bg-app-danger px-3 py-1 text-[10px] font-medium text-white hover:opacity-90 transition-opacity">
            복구하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setIsOpen(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-app-text">계정 복구 위저드</h3>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s.id} className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  i <= stepIdx ? "bg-app-primary" : "bg-app-border"
                )} />
              ))}
            </div>
          </div>

          <div className="min-h-[200px]">
            {stepIdx === 0 && <StepCheck onComplete={() => setStepIdx(1)} />}
            {stepIdx === 1 && <StepAuth />}
            {stepIdx === 2 && <StepVerify />}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-app-border pt-3">
            <button onClick={() => setIsOpen(false)} className="text-[11px] text-app-text-muted hover:text-app-text transition-colors">
              {stepIdx === 2 ? "닫기" : "취소"}
            </button>
            {stepIdx === 1 && (
              <button onClick={() => setStepIdx(2)}
                className="rounded-lg bg-app-primary px-4 py-1.5 text-[11px] font-medium text-white hover:bg-app-primary-hover transition-colors">
                확인
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
