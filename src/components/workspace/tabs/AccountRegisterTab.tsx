"use client";

import { useState, type FormEvent, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Phone,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  Upload,
  UserPlus,
  Users,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { BulkAccountImport } from "@/components/workspace/tabs/register/BulkAccountImport";
import { AccountRecoveryWizard } from "@/components/workspace/tabs/AccountRecoveryWizard";
import { SelfResetModal } from "@/components/workspace/tabs/register/SelfResetModal";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { AuthFlowMode, AccountHealthItem } from "@/types";
import * as api from "@/lib/api";
import { PlanUpgradeModal } from "@/components/workspace/tabs/register/PlanUpgradeModal";

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

export function AccountRegisterTab({ healthItems }: { healthItems?: AccountHealthItem[] }) {
  const registerAccount = useDashboardStore((s) => s.registerAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const [flowMode, setFlowMode] = useState<AuthFlowMode>("register");
  const [reAuthAccountId, setReAuthAccountId] = useState<string | null>(null);
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
  const [phoneConflict, setPhoneConflict] = useState(false);
  const [showSelfReset, setShowSelfReset] = useState(false);
  const [showPlanUpgrade, setShowPlanUpgrade] = useState(false);
  const [planUpgradeMsg, setPlanUpgradeMsg] = useState("");

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
    setFlowMode("register");
    setReAuthAccountId(null);
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

  async function handleStartReAuth(selectedAccountId: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    try {
      const result = await api.reAuthAccount(selectedAccountId);
      setFlowMode("re-auth");
      setReAuthAccountId(selectedAccountId);
      setAccountId(selectedAccountId);
      const acc = healthItems?.find((h) => h.accountId === selectedAccountId);
      if (acc) {
        setPhone(acc.phone);
      }
      setStep("code");
      startResendCooldown();
      setSuccessMessage("인증번호가 전송되었습니다. Telegram 앱을 확인하세요.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "재인증 요청에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRegistration() {
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    setPhoneConflict(false);
    try {
      const account = await registerAccount({ phone: phone.trim(), name: name.trim() || undefined });
      setAccountId(account.id);
      setStep("code");
      await api.sendCode(account.id);
      startResendCooldown();
      setSuccessMessage("인증번호가 전송되었습니다. Telegram 앱을 확인하세요.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "계정 등록에 실패했습니다.";
      
      // 계정 한도 초과 → 업그레이드 모달 표시
      if (msg.includes("계정 한도") || msg.includes("업그레이드") || msg.includes("max_accounts")) {
        setPlanUpgradeMsg(msg);
        setShowPlanUpgrade(true);
        setError(null); // 모달에서 설명하므로 인라인 에러는 숨김
      } else {
        setError(msg);
        if (err instanceof api.ApiError && err.status === 409) {
          setPhoneConflict(true);
        }
      }
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
    await submitRegistration();
  }

  function handleSelfResetComplete() {
    setShowSelfReset(false);
    void submitRegistration();
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
        setSuccessMessage(flowMode === "re-auth" ? "계정 재인증이 완료되었습니다." : "계정 인증이 완료되었습니다.");
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
      setSuccessMessage(flowMode === "re-auth" ? "2단계 인증이 완료되었습니다. 계정이 재인증되었습니다." : "2단계 인증이 완료되었습니다.");
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

  if (step === "form" && flowMode === "register") {
    // Show both new registration and re-auth panels side by side
    return (
      <div className="space-y-5 pb-8">
        <AccountRecoveryWizard />
        <ReAuthPanel
          healthItems={healthItems ?? []}
          onStartReAuth={handleStartReAuth}
          submitting={submitting}
        />
        <div className="border-t border-app-border pt-5">
          <NewRegistrationForm
            phone={phone}
            name={name}
            submitting={submitting}
            error={error}
            successMessage={successMessage}
            fieldErrors={fieldErrors}
            phoneConflict={phoneConflict}
            onRequestSelfReset={() => setShowSelfReset(true)}
            onPhoneChange={(v) => { setPhone(v); setFieldErrors((p) => ({ ...p, phone: undefined })); setPhoneConflict(false); }}
            onNameChange={(v) => setName(v)}
            onSubmit={handleSubmitForm}
            onReset={resetAll}
          />
        </div>
        <div className="border-t border-app-border pt-5">
          <CsvImportPanel />
        </div>
        <SelfResetModal
          open={showSelfReset}
          phone={phone.trim()}
          onClose={() => setShowSelfReset(false)}
          onResetComplete={handleSelfResetComplete}
        />
        <PlanUpgradeModal
          open={showPlanUpgrade}
          onClose={() => setShowPlanUpgrade(false)}
          currentPlan="free"
          currentAccountCount={healthItems?.length ?? 0}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <AccountRecoveryWizard />
      {/* Step Progress — only visible during ongoing auth flow (code/2fa/done) */}
      {step !== "form" && (
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
      )}

      <AnimatePresence mode="wait">
        {step === "form" && flowMode === "re-auth" && reAuthAccountId && (
          <motion.div
            key="re-auth-summary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Panel
              title={<div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-app-warning" /> 계정 재인증</div>}
              description="세션이 만료된 계정을 다시 인증합니다."
            >
              <div className="rounded-xl border border-app-warning/20 bg-app-warning-muted px-4 py-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-app-warning" />
                  <span className="text-app-warning font-medium">재인증 필요</span>
                </div>
                <p className="mt-1 text-xs text-app-text-muted">
                  {formatPhone(phone)} 계정의 Telegram 세션이 만료되었습니다.
                  아래 버튼을 눌러 재인증을 시작하세요.
                </p>
              </div>

              <div className="flex justify-between gap-2">
                <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> 취소
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={submitting}
                  onClick={() => handleStartReAuth(reAuthAccountId)}
                >
                  {submitting ? "재인증 요청 중..." : "재인증 시작"}
                </Button>
              </div>
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
              title={<div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-app-success" /> {flowMode === "re-auth" ? "재인증 완료" : "등록 완료"}</div>}
            >
              <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-success-muted">
                  <CheckCircle2 className="h-8 w-8 text-app-success" />
                </div>
                <p className="text-sm font-medium text-app-text">{flowMode === "re-auth" ? "계정 재인증이 완료되었습니다" : "계정 인증이 완료되었습니다"}</p>
                <p className="mt-1 text-xs text-app-text-muted max-w-sm">
                  <span className="font-medium text-app-text">{formatPhone(phone)}</span>
                  {name ? ` (${name})` : ""}
                </p>
              </div>

              {flowMode === "re-auth" ? (
                <div className="flex justify-center gap-3 pt-2 pb-4">
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
              ) : (
              <>
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
              </>)}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ReAuthPanel (계정 선택 → 재인증) ─────────────────────────────

interface ReAuthPanelProps {
  healthItems: AccountHealthItem[];
  onStartReAuth: (accountId: string) => void;
  submitting: boolean;
}

const UNAUTHORIZED_STATUSES: AccountHealthItem["status"][] = ["unauthorized", "error", "unknown", "not_configured"];

export function ReAuthPanel({ healthItems, onStartReAuth, submitting }: ReAuthPanelProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  const expiredAccounts = healthItems.filter(
    (h) => UNAUTHORIZED_STATUSES.includes(h.status) || !h.hasSession
  );

  const selectedAccount = expiredAccounts.find((a) => a.accountId === selectedId);

  return (
    <Panel
      title={<div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-app-warning" /> 세션 재인증</div>}
      description="세션이 만료된 계정을 선택하고 재인증을 진행하세요."
    >
      {expiredAccounts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-app-success shrink-0" />
          <div>
            <p className="text-sm font-medium text-app-text">모든 계정이 정상입니다</p>
            <p className="text-xs text-app-text-muted">재인증이 필요한 계정이 없습니다.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text outline-none focus:border-app-primary transition-colors appearance-none"
            >
              <option value="">계정을 선택하세요</option>
              {expiredAccounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.name ?? a.phone} ({a.phone})
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted rotate-90 pointer-events-none" />
          </div>

          {selectedAccount && (
            <div className="rounded-xl border border-app-warning/20 bg-app-warning-muted px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-app-warning shrink-0" />
                <span className="font-medium text-app-text">
                  {selectedAccount.name ?? selectedAccount.phone}
                </span>
              </div>
              <p className="mt-1 text-xs text-app-text-muted">
                상태: {selectedAccount.status}
                {selectedAccount.lastError && ` · ${selectedAccount.lastError}`}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={!selectedId || submitting}
              loading={submitting}
              onClick={() => { if (selectedId) onStartReAuth(selectedId); }}
            >
              {submitting ? "재인증 요청 중..." : "재인증 시작"}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── CSV Import Panel ────────────────────────────────────────────────

interface CsvRow {
  phone: string;
  name: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  const re = /("(?:[^"]|"")*"|[^,]*)/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    let field = match[1].trim();
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1).replace(/""/g, '"');
    }
    fields.push(field);
  }
  return fields;
}

function CsvImportPanel() {
  const registerAccount = useDashboardStore((s) => s.registerAccount);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState<{ phone: string; name: string; success: boolean; error?: string }[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || importing) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target?.result as string;
      // Strip BOM character (Excel adds this for UTF-8 CSV)
      text = text.replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setRows([]);
        return;
      }
      // Always treat col 0 = phone, col 1 = name (regardless of header text)
      const parsed: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const phone = cols[0]?.trim().replace(/[^\d+]/g, "") ?? "";
        const name = cols.length > 1 ? (cols[1]?.trim() ?? "") : "";
        if (phone) parsed.push({ phone, name });
      }
      setRows(parsed);
      setResults([]);
      setCurrentIndex(-1);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (importing || rows.length === 0) return;
    setImporting(true);
    setCurrentIndex(0);
    setResults([]);

    const outcomes: { phone: string; name: string; success: boolean; error?: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      setCurrentIndex(i);
      const row = rows[i];
      try {
        await registerAccount({ phone: row.phone, name: row.name || undefined });
        outcomes.push({ phone: row.phone, name: row.name, success: true });
      } catch (err) {
        outcomes.push({ phone: row.phone, name: row.name, success: false, error: err instanceof Error ? err.message : "실패" });
      }
    }
    setResults(outcomes);
    setCurrentIndex(-1);
    setImporting(false);
  }

  function handleReset() {
    setRows([]);
    setResults([]);
    setCurrentIndex(-1);
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Panel
      title={<div className="flex items-center gap-2"><Upload className="h-4 w-4 text-app-primary" /> CSV 일괄 계정 가져오기</div>}
      description="CSV 파일(phone, name)로 여러 계정을 한 번에 등록합니다."
    >
      {rows.length === 0 && results.length === 0 && (
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-dashed border-app-border bg-app-card/30 px-4 py-6 text-center transition-colors hover:border-app-primary/40">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer">
              <FileText className="mx-auto h-8 w-8 text-app-text-muted" />
              <p className="mt-2 text-sm font-medium text-app-text">CSV 파일 선택</p>
              <p className="mt-0.5 text-xs text-app-text-muted">
                첫 번째 열: 전화번호, 두 번째 열: 이름(선택)
              </p>
              <p className="text-xs text-app-text-subtle">예: +821012345678,연구용 계정</p>
            </label>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card/50 px-4 py-3">
            <p className="text-xs font-medium text-app-text-muted">CSV 형식 안내</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-app-text-muted">
              <li>• 첫 번째 열: 전화번호 (국가코드 포함, 예: +821012345678)</li>
              <li>• 두 번째 열: 계정 이름 (선택, 컬럼명이 name/이름/별칭 중 하나면 자동 인식)</li>
              <li>• 헤더 행이 필요합니다 (예: phone,name / 전화번호,이름)</li>
              <li>• 인코딩: UTF-8 (Excel 저장 시 &quot;CSV UTF-8&quot; 선택)</li>
            </ul>
          </div>
        </div>
      )}

      {rows.length > 0 && results.length === 0 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-app-border bg-app-card/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-app-primary" />
              <span className="text-sm font-medium text-app-text">{rows.length}개 계정</span>
            </div>
            <div className="mt-2 max-h-32 overflow-y-auto text-xs text-app-text-muted">
              {rows.slice(0, 10).map((r, i) => (
                <div key={i} className="flex gap-2 py-0.5">
                  <span className="font-mono text-app-text">{r.phone}</span>
                  {r.name && <span className="text-app-text-subtle">({r.name})</span>}
                </div>
              ))}
              {rows.length > 10 && (
                <p className="pt-1 text-app-text-subtle">...외 {rows.length - 10}개</p>
              )}
            </div>
          </div>

          {importing && currentIndex >= 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-text-muted">
                  등록 중... ({currentIndex + 1}/{rows.length})
                </span>
                <span className="font-medium text-app-text">
                  {Math.round(((currentIndex + 1) / rows.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-app-border">
                <div
                  className="h-full rounded-full bg-app-primary transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / rows.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-app-text-muted">
                {rows[currentIndex].phone} 등록 중...
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleReset} disabled={importing}>
              <XCircle className="mr-1 h-4 w-4" /> 취소
            </Button>
            <Button type="button" variant="primary" onClick={handleImport} loading={importing}>
              <Upload className="mr-1 h-4 w-4" /> 일괄 등록 시작
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-app-success" />
              <span className="text-xs font-medium text-app-success">{successCount}개 성공</span>
            </div>
            {failCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-app-danger" />
                <span className="text-xs font-medium text-app-danger">{failCount}개 실패</span>
              </div>
            )}
          </div>

          {failCount > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {results.filter((r) => !r.success).map((r, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-app-danger/10 bg-app-danger-muted/20 px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-app-danger" />
                  <div className="min-w-0">
                    <span className="font-mono text-app-text">{r.phone}</span>
                    {r.name && <span className="text-app-text-muted"> ({r.name})</span>}
                    <p className="text-app-danger">{r.error}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="primary" onClick={handleReset}>
              <Upload className="mr-1 h-4 w-4" /> 새 파일 가져오기
            </Button>
            {failCount > 0 && (
              <Button type="button" variant="ghost" onClick={() => {
                const failedRows = rows.filter((r, i) => !results[i]?.success);
                setRows(failedRows);
                setResults([]);
              }}>
                <RefreshCw className="mr-1 h-4 w-4" /> 실패한 계정만 재시도
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── NewRegistrationForm (신규 계정 등록) ──────────────────────────

interface NewRegistrationFormProps {
  phone: string;
  name: string;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
  fieldErrors: { phone?: string; code?: string; password?: string };
  phoneConflict?: boolean;
  onRequestSelfReset?: () => void;
  onPhoneChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onReset: () => void;
}

export function NewRegistrationForm({
  phone, name, submitting, error, successMessage, fieldErrors, phoneConflict, onRequestSelfReset,
  onPhoneChange, onNameChange, onSubmit, onReset,
}: NewRegistrationFormProps) {
  return (
    <Panel
      title={<div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-app-primary" /> 새 계정 등록</div>}
      description="전화번호로 실제 Telegram 인증을 진행합니다. API ID/Hash는 서버(.env)에 앱 단위로 한 번만 설정하면 됩니다."
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="전화번호"
            hint="국가 코드를 포함해 입력 (예: +821012345678)"
            error={fieldErrors.phone}
          >
            <Input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
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
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="예: 연구용 계정 A"
            />
          </Field>
        </div>

        {error && <InlineError className="mt-3">{error}</InlineError>}
        {phoneConflict && onRequestSelfReset && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted px-3 py-2.5">
            <p className="text-xs text-app-warning">
              이 번호가 본인 소유라면 인증 후 직접 초기화할 수 있습니다.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={onRequestSelfReset} disabled={submitting}>
              이 번호로 재등록하기
            </Button>
          </div>
        )}
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
          <Button type="button" variant="ghost" onClick={onReset} disabled={submitting}>
            초기화
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? "계정 등록 중..." : "계정 등록 및 인증번호 요청"}
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-app-border/50">
        <BulkAccountImport />
      </div>
    </Panel>
  );
}