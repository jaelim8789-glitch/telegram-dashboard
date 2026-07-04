"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import * as api from "@/lib/api";
import { setToken } from "@/lib/auth";

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = await api.adminLogin(username, password);
      setToken(token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="관리자 로그인" description="Management Dashboard 관리자 계정으로 로그인하세요.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="아이디">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </Field>
        <Field label="비밀번호">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-xs text-app-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </Panel>
  );
}

function PhoneVerificationForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await api.sendVerificationCode(phone.trim());
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || verifying) return;

    setVerifying(true);
    setError(null);
    try {
      const apiKey = await api.verifyLoginCode(phone.trim(), code.trim());
      setIssuedKey(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호가 올바르지 않습니다.");
    } finally {
      setVerifying(false);
    }
  }

  function reset() {
    setPhone("");
    setCode("");
    setCodeSent(false);
    setIssuedKey(null);
    setError(null);
  }

  if (issuedKey) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-app-success/30 bg-app-success-muted p-3">
          <p className="text-xs text-app-success">
            API 키가 발급되었습니다. 지금만 전체가 표시되니 안전한 곳에 복사해두세요.
          </p>
          <code className="mt-1 block break-all text-sm text-app-text">{issuedKey}</code>
        </div>
        <Button variant="secondary" className="w-full" onClick={reset}>
          처음으로
        </Button>
      </div>
    );
  }

  if (codeSent) {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <Field label="인증번호" hint="문자로 받은 6자리 숫자를 입력하세요.">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
          />
        </Field>
        {error && <p className="text-xs text-app-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setCodeSent(false)} disabled={verifying}>
            뒤로
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={verifying}>
            {verifying ? "확인 중..." : "API 키 발급"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <Field label="전화번호" hint="예: +821012345678">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} required autoFocus />
      </Field>
      {error && <p className="text-xs text-app-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={sending}>
        {sending ? "발송 중..." : "인증번호 요청"}
      </Button>
    </form>
  );
}

function ApiKeyLoginForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = await api.loginWithApiKey(apiKey.trim());
      setToken(token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <Field label="API 키">
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." required />
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "확인 중..." : "API 키로 로그인"}
      </Button>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <AdminLoginForm />
        <Panel title="일반 사용자 로그인" description="본인 전화번호를 인증하면 API 키가 발급됩니다.">
          <PhoneVerificationForm />
        </Panel>
        <Panel title="이미 API 키가 있다면">
          <ApiKeyLoginForm />
        </Panel>
      </div>
    </div>
  );
}
