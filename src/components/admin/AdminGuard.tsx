"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

/** Wrap any page that should require a logged-in admin session. Redirects to
 * /admin/login if there's no token, or if the token turns out to be invalid/expired. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!getToken()) {
        router.replace("/admin/login");
        return;
      }
      try {
        await api.fetchAdminMe();
        if (!cancelled) setChecked(true);
      } catch {
        clearToken();
        router.replace("/admin/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-sm text-neutral-500">인증 확인 중...</p>
      </div>
    );
  }

  return <>{children}</>;
}
