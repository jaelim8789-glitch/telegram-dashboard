"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import * as api from "@/lib/api";
import { setToken, clearSessionToken } from "@/lib/auth";

// Hidden super-admin login — not linked from the public login page.
// Regular members use Telegram Login Widget at /admin/login; this route is
// for the account owner only, reached by direct URL.
export default function SuperAdminLoginPage() {
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
      clearSessionToken();
      setToken(token);
      router.replace("/admin/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그인 실패";
      setError(message.includes("Invalid credentials") ? "아이디 또는 비밀번호가 올바르지 않습니다." : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-app-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-6">
        <h1 className="text-base font-semibold text-app-text mb-5">관리자 로그인</h1>
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
      </div>
    </div>
  );
}
