"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Phone, KeyRound, ShieldCheck, UserPlus, RefreshCw, ArrowLeft, Smartphone } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";

type Step = "form" | "code" | "2fa" | "done";

const STEPS = [
  { key: "form", label: "계정 정보", icon: Phone },
  { key: "code", label: "인증번호", icon: Smartphone },
  { key: "2fa", label: "2FA", icon: ShieldCheck },
  { key: "done", label: "완료", icon: CheckCircle2 },
];

export function AccountRegisterTab() {
  const registerAccount = useDashboardStore((s) => s.registerAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const [step, setStep] = useState<Step>("form");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAll() {
    setStep("form");
    setAccountId(null);
    setPhone("");
    setName("");
    setCode("");
    setPassword("");
    setError(null);
  }

  async function handleResendCode(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      await api.sendCode(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 요청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const account = await registerAccount({ phone: phone.trim(), name: name.trim() || undefined });
      setAccountId(account.id);
      setStep("code");
      await api.sendCode(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "계정 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCode(e: FormEvent) {
    e.preventDefault();
    if (!accountId || !code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.verifyCode(accountId, code.trim());
      if (result.requiresTwoFactor) {
        setStep("2fa");
      } else {
        await fetchAccounts();
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 확인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit2FA(e: FormEvent) {
    e.preventDefault();
    if (!accountId || !password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.verifyTwoFactor(accountId, password.trim());
      await fetchAccounts();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "2단계 인증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-5 pb-8">
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i <= currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-br from-app-primary to-orange-500 text-white shadow-md"
                    : "bg-app-card-hover text-app-text-muted border border-app-border"
                )}>
                  <Icon className={cn("h-4 w-4", isCurrent && "animate-pulse")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  isActive ? "text-app-text" : "text-app-text-subtle"
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "mx-2 h-px w-12 sm:w-20 transition-colors duration-300",
                  i < currentStepIndex ? "bg-app-primary" : "bg-app-border"
                )} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Panel
              title={<div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-app-primary" /> 새 계정 등록</div>}
              description="전화번호로 실제 Telegram 인증을 진행합니다. API ID/Hash는 서버(.env)에 앱 단위로 한 번만 설정하면 됩니다."
            >
              <form onSubmit={handleSubmitForm}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="전화번호" hint="국가 코드를 포함해 입력">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+82 10-0000-0000"
                      required
                    />
                  </Field>
                  <Field label="이름 (선택)">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 연구용 계정 A"
                    />
                  </Field>
                </div>

                {error && <InlineError className="mt-3">{error}</InlineError>}

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    초기화
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting || !phone.trim()}>
                    {submitting ? (
                      <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> 처리 중...</>
                    ) : (
                      <><KeyRound className="mr-1.5 h-4 w-4" /> 계정 등록 및 인증번호 요청</>
                    )}
                  </Button>
                </div>
              </form>
            </Panel>
          </motion.div>
        )}

        {step === "code" && accountId && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Panel
              title={<div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-app-primary" /> 인증번호 입력</div>}
              description={`${phone}(으)로 전송된 Telegram 인증번호를 입력하세요.`}
            >
              <form onSubmit={handleSubmitCode}>
                <Field label="인증번호">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="12345"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    required
                    autoFocus
                  />
                </Field>

                {error && <InlineError className="mt-3">{error}</InlineError>}

                <div className="mt-4 flex justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> 처음으로
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleResendCode(accountId)}
                      disabled={submitting}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" /> 재전송
                    </Button>
                    <Button type="submit" variant="primary" disabled={submitting || !code.trim()}>
                      {submitting ? "확인 중..." : "확인"}
                    </Button>
                  </div>
                </div>
              </form>
            </Panel>
          </motion.div>
        )}

        {step === "2fa" && accountId && (
          <motion.div
            key="2fa"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Panel
              title={<div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-app-warning" /> 2단계 인증</div>}
              description="이 계정은 2단계 인증(클라우드 비밀번호)이 설정되어 있습니다."
            >
              <form onSubmit={handleSubmit2FA}>
                <Field label="2단계 인증 비밀번호">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    autoFocus
                  />
                </Field>

                {error && <InlineError className="mt-3">{error}</InlineError>}

                <div className="mt-4 flex justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> 처음으로
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting || !password.trim()}>
                    {submitting ? "확인 중..." : "확인"}
                  </Button>
                </div>
              </form>
            </Panel>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Panel
              title={<div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-app-success" /> 등록 완료</div>}
            >
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-success-muted">
                  <CheckCircle2 className="h-8 w-8 text-app-success" />
                </div>
                <p className="text-sm font-medium text-app-text">계정 인증이 완료되었습니다</p>
                <p className="mt-1 text-xs text-app-text-muted">사이드바에 활성 상태로 표시됩니다.</p>
              </div>
              <div className="flex justify-center">
                <Button variant="primary" onClick={resetAll}>
                  <UserPlus className="mr-1.5 h-4 w-4" /> 새 계정 등록
                </Button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}