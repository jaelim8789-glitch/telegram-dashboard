"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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

  const isTrialActive = plan === "free" && subscriptionStatus === "active" && trialExpiresAt;
  const isTrialExpired = plan === "free" && subscriptionStatus === "expired";
  const trialLabel = isTrialActive ? formatTrialRemaining(trialExpiresAt) : null;
  const onPaidPlan = plan && plan !== "free";

  function handleLogout() {
    clearToken();
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
              체험 {trialLabel}
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

        <ThemeToggle />

        {role === "admin" && (
          <Link
            href="/admin/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted transition-all"
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
