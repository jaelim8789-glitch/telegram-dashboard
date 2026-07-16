"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { clearToken, getToken, clearSessionToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";

interface AdminGuardProps {
  children: ReactNode;
  /** Set on pages that are strictly admin-only (dashboard, API keys, user management).
   * A valid but non-admin session (a phone-verified user, or a raw API key) is sent
   * back to the main dashboard instead of the login page — it's a real session, just
   * not one allowed on this particular page. */
  requireAdmin?: boolean;
}

/** Wrap any page that should require a logged-in session (admin, phone-verified user,
 * or API key). Redirects to /admin/login if there's no token or it's invalid/expired. */
export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const router = useRouter();
  const setRole = useDashboardStore((s) => s.setRole);
  const setSubscription = useDashboardStore((s) => s.setSubscription);
  const [checked, setChecked] = useState(false);

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
      } catch {
        clearToken();
        clearSessionToken();
        router.replace("/admin/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router, requireAdmin, setRole, setSubscription]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <p className="text-sm text-app-text-muted">인증 확인 중...</p>
      </div>
    );
  }

  return <>{children}</>;
}
