"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Shield, Smartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api";

type Step = "confirm" | "code" | "2fa" | "done";

/**
 * "이미 등록된 전화번호입니다" 셀프서비스 재등록 흐름.
 * 본인 확인(Telegram 인증번호 + 필요시 2FA)이 완료되기 전에는 아무것도 지워지지
 * 않는다 — 삭제는 백엔드가 verify-code/verify-2fa 성공 응답을 준 뒤에만 일어난다.
 */
export function SelfResetModal({
  open,
  phone,
  onClose,
  onResetComplete,
}: {
  open: boolean;
  phone: string;
  onClose: () => void;
  onResetComplete: () => void;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetLocalState() {
    setStep("confirm");
    setCode("");
    setPassword("");
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    resetLocalState();
    onClose();
  }

  async function handleSendCode() {
    setSubmitting(true);
    setError(null);
    try {
      await api.selfResetSendCode(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (submitting || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.selfResetVerifyCode(phone, code.replace(/\D/g, ""));
      if (result.requiresTwoFactor) {
        setStep("2fa");
      } else {
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 확인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify2FA(e: FormEvent) {
    e.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.selfResetVerifyTwoFactor(phone, password);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "2단계 인증 확인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    resetLocalState();
    onResetComplete();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      preventClose={submitting}
      title={
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-app-primary" />
          이 번호로 재등록하기
        </div>
      }
      description={`${phone}이(가) 본인 소유의 Telegram 번호인지 확인한 뒤, 기존에 남아있던 등록 정보를 정리합니다.`}
    >
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-warning" />
            <p className="text-xs text-app-warning">
              본인 확인 없이는 아무 작업도 일어나지 않습니다. 이 번호로 전송되는 Telegram
              인증번호(필요시 2단계 인증 비밀번호까지)를 직접 입력해야만 기존 등록 정보가
              정리됩니다.
            </p>
          </div>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button type="button" variant="primary" loading={submitting} onClick={handleSendCode}>
              인증번호 받기
            </Button>
          </div>
        </div>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="rounded-xl border border-app-border bg-app-card-hover px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-app-text-muted">
              <Smartphone className="h-4 w-4 text-app-primary" />
              <span className="font-medium text-app-text">{phone}</span>으로 인증번호를 전송했습니다
            </div>
          </div>
          <Field label="인증번호" hint="Telegram 앱에서 받은 5-6자리 숫자를 입력하세요">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              autoFocus
              required
              className="otp-input text-lg tracking-[0.3em]"
            />
          </Field>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              확인
            </Button>
          </div>
        </form>
      )}

      {step === "2fa" && (
        <form onSubmit={handleVerify2FA} className="space-y-4">
          <div className="rounded-xl border border-app-border bg-app-card-hover px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-app-text-muted">
              <Shield className="h-4 w-4 text-app-primary" />
              이 계정에는 2단계 인증이 설정되어 있습니다.
            </div>
          </div>
          <Field label="2단계 인증 비밀번호">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </Field>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              확인
            </Button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-success" />
            <p className="text-xs text-app-success">
              본인 확인이 완료되어 기존 등록 정보를 정리했습니다. 이제 이 번호로 다시 등록할 수
              있습니다.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={handleDone}>
              다시 등록하기
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
