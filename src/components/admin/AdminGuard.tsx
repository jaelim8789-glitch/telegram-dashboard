"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { clearToken, getToken, clearSessionToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";

interface AdminGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

async function fetchPendingPayoutCount(): Promise<number> {
  try {
    const token = getToken();
    if (!token) return 0;
    const res = await fetch(`/api/referral/admin/payouts/pending-count`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch { return 0; }
}

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const router = useRouter();
  const setRole = useDashboardStore((s) => s.setRole);
  const setSubscription = useDashboardStore((s) => s.setSubscription);
  const [checked, setChecked] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!getToken()) {
        router.replace("/admin/login");
        return;
      }
      try {
        const me = await api.fetchAuthMe();
        if (cancelled) return;
        setRole(me.role);
        setSubscription(me.subscription_status, me.plan, me.trial_expires_at);
        if (requireAdmin && me.role !== "admin") {
          router.replace("/app");
          return;
        }
        setChecked(true);

        if (me.role === "admin") {
          const count = await fetchPendingPayoutCount();
          if (!cancelled) setPendingCount(count);
        }
      } catch {
        clearToken();
        clearSessionToken();
        router.replace("/admin/login");
      }
    }

    check();
    return () => { cancelled = true; };
  }, [router, requireAdmin, setRole, setSubscription]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <p className="text-sm text-app-text-muted">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <>
      {pendingCount > 0 && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">{pendingCount}</span>
          <span>건의 지급 대기 항목이 있습니다 — <a href="/admin/distributors" className="underline font-medium hover:text-amber-800">총판 관리</a></span>
        </div>
      )}
      {children}
    </>
  );
}
