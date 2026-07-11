"use client";

import { useState, type FormEvent, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Phone,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  Target,
  UserPlus,
  Users,
  ArrowLeft,
} from "lucide-react";
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
  { key: "2fa", label: "2FA", icon: Shield },
  { key: "done", label: "완료", icon: CheckCircle2 },
];

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 11) {
    return `+82 ${digits.slice(2, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith("1") && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return `+${digits}`;
}

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "전화번호를 입력하세요.";
  if (digits.length < 8) return "전화번호가 너무 짧습니다. 국가 코드를 포함해 입력하세요.";
  if (digits.length > 15) return "전화번호가 너무 깁니다. 국가 코드를 확인하세요.";
  return null;
}

function validateCode(code: string): string | null {
  const digits = code.replace(/\D/g, "");
  if (!digits) return "인증번호를 입력하세요.";
  if (digits.length < 4) return "인증번호가 너무 짧습니다.";
  if (digits.length > 10) return "인증번호가 너무 깁니다.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "2단계 인증 비밀번호를 입력하세요.";
  return null;
}

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; code?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resend cooldown timer — always cleaned up on unmount or when cooldown expires
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resendCooldown]);

  // Auto-focus code input when entering code step
  useEffect(() => {
    if (step === "code" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  // Auto-focus password input when entering 2FA step
  useEffect(() => {
    if (step === "2fa" && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [step]);

  const resetAll = useCallback(() => {
    setStep("form");
    setAccountId(null);
    setPhone("");
    setName("");
    setCode("");
    setPassword("");
    setError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    setFieldErrors({});
    setShowPassword(false);
    setResendCooldown(0);
  }, []);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(30);
  }, []);

  async function handleResendCode(id: string) {
    if (resendCooldown > 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.sendCode(id);
      setSuccessMessage("인증번호가 재전송되었습니다.");
      startResendCooldown();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "인증번호 요청에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setFieldErrors({ phone: phoneError });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    try {
      const account = await registerAccount({ phone: phone.trim(), name: name.trim() || undefined });
      setAccountId(account.id);
      setStep("code");
      await api.sendCode(account.id);
      startResendCooldown();
      setSuccessMessage("인증번호가 전송되었습니다. Telegram 앱을 확인하세요.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "계정 등록에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCode(e: FormEvent) {
    e.preventDefault();
    if (!accountId || submitting) return;

    const codeError = validateCode(code);
    if (codeError) {
      setFieldErrors({ code: codeError });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    try {
      const result = await api.verifyCode(accountId, code.replace(/\D/g, ""));
      if (result.requiresTwoFactor) {
        setStep("2fa");
        setInfoMessage("2단계 인증이 필요합니다. 클라우드 비밀번호를 입력하세요.");
      } else {
        await fetchAccounts();
        setStep("done");
        setSuccessMessage("계정 인증이 완료되었습니다.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "인증번호 확인에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit2FA(e: FormEvent) {
    e.preventDefault();
    if (!accountId || submitting) return;

    const pwError = validatePassword(password);
    if (pwError) {
      setFieldErrors({ password: pwError });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    setInfoMessage(null);
    try {
      await api.verifyTwoFactor(accountId, password.trim());
      await fetchAccounts();
      setStep("done");
      setSuccessMessage("2단계 인증이 완료되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "2단계 인증에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted.length >= 4) {
      setCode(pasted);
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setCode(digits);
    setFieldErrors((prev) => ({ ...prev, code: undefined }));
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
                  <Field
                    label="전화번호"
                    hint="국가 코드를 포함해 입력 (예: +821012345678)"
                    error={fieldErrors.phone}
                  >
                    <Input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      placeholder="+821012345678"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      invalid={!!fieldErrors.phone}
                      className="font-mono"
                    />
                  </Field>
                  <Field label="이름 (선택)" hint="계정 식별용 표시 이름">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 연구용 계정 A"
                    />
                  </Field>
                </div>

                {error && <InlineError className="mt-3">{error}</InlineError>}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-success" />
                    <p className="text-xs text-app-success">{successMessage}</p>
                  </motion.div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    초기화
                  </Button>
                  <Button type="submit" variant="primary" loading={submitting}>
                    {submitting ? "계정 등록 중..." : "계정 등록 및 인증번호 요청"}
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
                <div className="rounded-xl border border-app-border bg-app-card-hover px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-app-primary" />
                    <span className="text-app-text-muted">
                      <span className="font-medium text-app-text">{formatPhone(phone)}</span>
                      으로 인증번호를 전송했습니다
                    </span>
                  </div>
                </div>

                <Field
                  label="인증번호"
                  hint="Telegram 앱에서 받은 5-6자리 숫자를 입력하세요"
                  error={fieldErrors.code}
                >
                  <Input
                    ref={codeInputRef}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onPaste={handleCodePaste}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    required
                    autoFocus
                    invalid={!!fieldErrors.code}
                    className="otp-input text-lg tracking-[0.3em]"
                  />
                </Field>

                {error && <InlineError className="mt-3">{error}</InlineError>}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-success" />
                    <p className="text-xs text-app-success">{successMessage}</p>
                  </motion.div>
                )}

                <div className="mt-4 flex justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> 처음으로
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleResendCode(accountId)}
                      disabled={submitting || resendCooldown > 0}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      {resendCooldown > 0 ? `${resendCooldown}초` : "재전송"}
                    </Button>
                    <Button type="submit" variant="primary" loading={submitting}>
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
              title={<div className="flex items-center gap-2"><Shield className="h-4 w-4 text-app-warning" /> 2단계 인증</div>}
              description="이 계정은 2단계 인증(클라우드 비밀번호)이 설정되어 있습니다."
            >
              <form onSubmit={handleSubmit2FA}>
                <div className="rounded-xl border border-app-warning/20 bg-app-warning-muted px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-app-warning" />
                    <span className="text-app-warning font-medium">2단계 인증 필요</span>
                  </div>
                  <p className="mt-1 text-xs text-app-text-muted">
                    이 계정은 Telegram 클라우드 비밀번호(2단계 인증)가 설정되어 있습니다.
                    계속하려면 비밀번호를 입력하세요.
                  </p>
                </div>

                {infoMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 flex items-start gap-2 rounded-xl border border-app-info/20 bg-app-info-muted px-3 py-2.5"
                  >
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-app-info" />
                    <p className="text-xs text-app-info">{infoMessage}</p>
                  </motion.div>
                )}

                <Field label="2단계 인증 비밀번호" error={fieldErrors.password}>
                  <div className="relative">
                    <Input
                      ref={passwordInputRef}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      invalid={!!fieldErrors.password}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text transition-colors"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {error && <InlineError className="mt-3">{error}</InlineError>}

                <div className="mt-4 flex justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> 처음으로
                  </Button>
                  <Button type="submit" variant="primary" loading={submitting}>
                    {submitting ? "확인 중..." : "인증 완료"}
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
              <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-success-muted">
                  <CheckCircle2 className="h-8 w-8 text-app-success" />
                </div>
                <p className="text-sm font-medium text-app-text">계정 인증이 완료되었습니다</p>
                <p className="mt-1 text-xs text-app-text-muted max-w-sm">
                  <span className="font-medium text-app-text">{formatPhone(phone)}</span>
                  {name ? ` (${name})` : ""}
                </p>
              </div>

              {/* ── First-success roadmap ── */}
              <div className="mx-auto max-w-md space-y-2 px-2 pb-4">
                <p className="text-[11px] font-medium text-app-text-muted">첫 발송까지 3단계</p>

                <div className="flex items-start gap-3 rounded-xl border border-app-border bg-app-card p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted">
                    <CheckCircle2 className="h-4 w-4 text-app-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-app-text">계정 연결</p>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">Telegram 계정을 연결했습니다. 이제 그룹을 추가할 수 있습니다.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-app-border bg-app-card p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-card-hover">
                    <Users className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-app-text">그룹 준비</p>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">계정이 참여 중인 그룹을 확인하거나 새 그룹을 검색하세요.</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <button onClick={() => useDashboardStore.getState().setActiveTab("group")}
                        className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text transition-colors">
                        내 그룹 보기
                      </button>
                      <button onClick={() => useDashboardStore.getState().setActiveTab("groupsearch")}
                        className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text transition-colors">
                        그룹 검색
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-app-border bg-app-card p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-card-hover">
                    <Send className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-app-text">첫 발송</p>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">대상을 선택하고 메시지를 입력한 후 발송하세요.</p>
                    <button onClick={() => useDashboardStore.getState().setActiveTab("send")}
                      className="mt-1.5 rounded-lg bg-app-primary/10 px-2 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/20 transition-colors">
                      발송 탭으로 이동
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="primary" onClick={resetAll}>
                  <UserPlus className="mr-1.5 h-4 w-4" /> 새 계정 등록
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => useDashboardStore.getState().setActiveTab("dashboard")}
                >
                  <ChevronRight className="mr-1 h-4 w-4" /> 대시보드로 이동
                </Button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}