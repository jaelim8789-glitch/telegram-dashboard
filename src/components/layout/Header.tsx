"use client";

import { ExternalLink, LogOut, Settings, HelpCircle, Mail, MessageCircle, BookOpen, FileText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, clearSessionToken } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FullscreenToggle } from "@/components/ui/FullscreenToggle";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useState, useRef, useEffect } from "react";

function formatTrialRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const remaining = expiry - now;
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}일 남음`;
  return `${hours}시간 ${minutes}분`;
}

export function Header() {
  const router = useRouter();
  const role = useDashboardStore((s) => s.role);
  const subscriptionStatus = useDashboardStore((s) => s.subscriptionStatus);
  const plan = useDashboardStore((s) => s.plan);
  const trialExpiresAt = useDashboardStore((s) => s.trialExpiresAt);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelpPanel(false);
      }
    }
    if (showHelpPanel) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHelpPanel]);

  const isTrialActive = plan === "free" && subscriptionStatus === "active" && trialExpiresAt;
  const isTrialExpired = plan === "free" && subscriptionStatus === "expired";
  const trialLabel = isTrialActive ? formatTrialRemaining(trialExpiresAt) : null;
  const onPaidPlan = plan && plan !== "free";

  function handleLogout() {
    clearToken();
    clearSessionToken();
    useDashboardStore.getState().resetStore();
    router.replace("/admin/login");
  }

  return (
    <header className="dashboard-header flex h-14 shrink-0 items-center justify-between px-4 sm:px-5">
      <Link href="/app" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-app-primary to-orange-600 text-xs font-bold text-white shadow-lg shadow-app-primary/30">
          TM
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-app-text">
            Tele<span className="text-app-primary">Mon</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-app-border bg-app-card px-2 py-0.5 text-[10px] font-medium text-app-text-muted">
            v2.0
          </span>
          {isTrialActive && trialLabel && (
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              Free Plan
            </span>
          )}
          {isTrialExpired && (
            <Link href="/pricing" className="inline-flex items-center rounded-full border border-app-danger/30 bg-app-danger/10 px-2 py-0.5 text-[10px] font-medium text-app-danger hover:bg-app-danger/20 transition-colors">
              체험 만료
            </Link>
          )}
          {onPaidPlan && (
            <span className="inline-flex items-center rounded-full bg-app-primary/10 px-2 py-0.5 text-[10px] font-medium text-app-primary">
              {plan}
            </span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-1.5">
          <span className="status-dot online" />
          <span className="text-xs text-app-text-muted hidden sm:inline">Online</span>
        </div>

        <Link
          href="/changelog"
          className="hidden sm:flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
          title="변경 사항"
        >
          <ExternalLink className="h-3 w-3" />
          변경사항
        </Link>

        <FullscreenToggle />

        <ThemeToggle />

        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setShowHelpPanel(!showHelpPanel)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
            title="도움말"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {showHelpPanel && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-app-border bg-app-card shadow-lg p-4 space-y-3 z-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-app-text">도움말</span>
                <button
                  type="button"
                  onClick={() => setShowHelpPanel(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:text-app-text transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <a href="mailto:support@telemon.online" className="flex items-center gap-2 text-app-text-muted hover:text-app-text transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>지원 이메일: support@telemon.online</span>
                </a>
                <a href="https://t.me/telemon_support" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-app-text-muted hover:text-app-text transition-colors">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>텔레그램: @telemon_support</span>
                </a>
                <Link href="/guide" className="flex items-center gap-2 text-app-text-muted hover:text-app-text transition-colors">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>이용 가이드</span>
                </Link>
                <a href="https://api.telemon.online/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-app-text-muted hover:text-app-text transition-colors">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>API 문서</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {role === "admin" && (
          <Link
            href="/admin/dashboard"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all sm:min-h-8 sm:min-w-8"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted transition-all sm:min-h-8 sm:min-w-8"
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}