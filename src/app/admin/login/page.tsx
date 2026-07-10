"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api";
import { setToken } from "@/lib/auth";

type AuthMethod = "admin" | "phone" | "apikey";

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      const token = await api.adminLogin(username, password);
      setToken(token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="아이디">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
      </Field>
      <Field label="비밀번호">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={submitting} className="w-full h-11">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "로그인 중..." : "로그인"}
      </Button>
    </form>
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
    setSending(true); setError(null);
    try { await api.sendVerificationCode(phone.trim()); setCodeSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : "발송 실패"); }
    finally { setSending(false); }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || verifying) return;
    setVerifying(true); setError(null);
    try { const key = await api.verifyLoginCode(phone.trim(), code.trim()); setIssuedKey(key); }
    catch (err) { setError(err instanceof Error ? err.message : "인증 실패"); }
    finally { setVerifying(false); }
  }

  function reset() { setPhone(""); setCode(""); setCodeSent(false); setIssuedKey(null); setError(null); }

  if (issuedKey) return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-app-success-muted">
        <svg className="h-7 w-7 text-app-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm text-app-text-secondary">API 키가 발급되었습니다</p>
      <div className="rounded-xl bg-app-surface border border-app-border p-3">
        <code className="break-all text-xs text-app-text font-mono">{issuedKey}</code>
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className="btn-secondary flex-1 h-10 rounded-xl text-sm">처음으로</button>
        <Link href="/admin/login" className="btn-primary flex-1 flex items-center justify-center h-10 rounded-xl text-sm">로그인</Link>
      </div>
    </div>
  );

  if (codeSent) return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-app-text-muted">인증번호</label>
        <input
          value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000"
          maxLength={6} inputMode="numeric"
          className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-app-text placeholder:text-app-text-subtle focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-colors" required autoFocus
        />
      </div>
      {error && <InlineError>{error}</InlineError>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setCodeSent(false)} disabled={verifying} className="flex-1 h-11">
          뒤로
        </Button>
        <Button type="submit" variant="primary" disabled={verifying} className="flex-1 h-11">
          {verifying ? "확인 중..." : "API 키 발급"}
        </Button>
      </div>
    </form>
  );

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <Field label="전화번호">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+821012345678" required autoFocus />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={sending} className="flex w-full h-11">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
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
    setSubmitting(true); setError(null);
    try { const token = await api.loginWithApiKey(apiKey.trim()); setToken(token); router.replace("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "로그인 실패"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="API 키">
        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="font-mono" required />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <Button type="submit" disabled={submitting} className="flex w-full h-11">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "확인 중..." : "로그인"}
      </Button>
    </form>
  );
}

const METHODS: { id: AuthMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "admin", label: "관리자", icon: <ShieldCheck className="h-4 w-4" />, desc: "아이디와 비밀번호로 로그인" },
  { id: "phone", label: "전화번호", icon: <Phone className="h-4 w-4" />, desc: "SMS 인증으로 API 키 발급" },
  { id: "apikey", label: "API 키", icon: <KeyRound className="h-4 w-4" />, desc: "발급받은 키로 바로 로그인" },
];

export default function AdminLoginPage() {
  const [method, setMethod] = useState<AuthMethod>("admin");

  return (
    <div className="relative min-h-screen bg-app-bg flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary to-orange-600 text-xl font-bold text-white shadow-lg shadow-app-primary/20 mb-4">
            TM
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-app-text">Tele</span>
            <span className="text-app-primary">Mon</span>
          </h1>
          <p className="text-sm text-app-text-muted mt-1">텔레그램 자동화 대시보드</p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-app-surface p-1 border border-app-border">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-all ${
                method === m.id
                  ? "bg-app-card text-app-text shadow-sm"
                  : "text-app-text-muted hover:text-app-text-secondary"
              }`}
            >
              {m.icon}
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-app-border bg-app-card p-6 animate-scale-in">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-app-text">
              {method === "admin" ? "관리자 로그인" : method === "phone" ? "전화번호 인증" : "API 키 로그인"}
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              {METHODS.find((m) => m.id === method)?.desc}
            </p>
          </div>
          {method === "admin" && <AdminLoginForm />}
          {method === "phone" && <PhoneVerificationForm />}
          {method === "apikey" && <ApiKeyLoginForm />}
        </div>

        <p className="mt-5 text-center text-xs text-app-text-muted">
          아직 API 키가 없으신가요?{" "}
          <Link href="/get-api-key" className="text-app-primary hover:text-app-primary-hover transition-colors">USDT로 발급받기</Link>
        </p>
      </div>
    </div>
  );
}