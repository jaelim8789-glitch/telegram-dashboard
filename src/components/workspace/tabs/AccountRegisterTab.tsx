"use client";

import { useState, type FormEvent } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";

type Step = "form" | "code" | "2fa" | "done";

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

  return (
    <div className="space-y-4">
      {step === "form" && (
        <Panel
          title="새 계정 등록"
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
              <Field label="이름">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 연구용 계정 A"
                />
              </Field>
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                초기화
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "처리 중..." : "계정 등록 및 인증번호 요청"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {step === "code" && accountId && (
        <Panel
          title="인증번호 입력"
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

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                처음으로
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleResendCode(accountId)}
                  disabled={submitting}
                >
                  인증번호 재전송
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "확인 중..." : "확인"}
                </Button>
              </div>
            </div>
          </form>
        </Panel>
      )}

      {step === "2fa" && accountId && (
        <Panel title="2단계 인증" description="이 계정은 2단계 인증(클라우드 비밀번호)이 설정되어 있습니다.">
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

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={resetAll} disabled={submitting}>
                처음으로
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "확인 중..." : "확인"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {step === "done" && (
        <Panel title="등록 완료">
          <p className="text-sm text-neutral-300">
            계정 인증이 완료되어 사이드바에 활성 상태로 표시됩니다.
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={resetAll}>
              새 계정 등록
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
