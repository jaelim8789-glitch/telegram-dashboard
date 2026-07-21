"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { request, ApiError } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      setSuccess("인증 코드가 전송되었습니다");
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인증 코드 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !newPassword || !confirmPassword || loading) return;
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });
      setSuccess("비밀번호가 재설정되었습니다");
      setTimeout(() => router.push("/admin/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "비밀번호 재설정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-app-bg flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-app-primary to-orange-600 text-2xl font-bold text-white shadow-lg shadow-app-primary/20 mb-4">
            TM
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-app-text">Tele</span>
            <span className="text-app-primary">Mon</span>
          </h1>
          <p className="text-sm text-app-text-muted mt-1">비밀번호 재설정</p>
        </div>

        <div className="rounded-2xl border border-app-border/60 bg-app-card p-6 animate-scale-in">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1 text-xs text-app-text-muted hover:text-app-primary mb-4"
          >
            <ArrowLeft className="h-3 w-3" />
            로그인으로 돌아가기
          </Link>

          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <label className="block text-xs text-app-text-muted">
                가입 시 등록한 전화번호를 입력하세요
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">{success}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-2.5 text-sm font-semibold bg-app-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "전송 중..." : "인증코드 전송"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <label className="block text-xs text-app-text-muted">
                인증코드를 입력하세요
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="인증코드 6자리"
                required
                maxLength={10}
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-app-surface border border-app-border text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">{success}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-2.5 text-sm font-semibold bg-app-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "재설정 중..." : "비밀번호 재설정"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("phone"); setError(null); setSuccess(null); }}
                className="w-full text-xs text-app-text-muted hover:text-app-primary"
              >
                전화번호 다시 입력
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
