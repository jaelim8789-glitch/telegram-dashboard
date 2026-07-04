"use client";

import { LogOut, Radio, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";

export function Header() {
  const router = useRouter();
  const role = useDashboardStore((s) => s.role);

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-card/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-primary-muted text-app-primary-hover">
          <Radio className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-app-text">Management Dashboard</span>
        <span className="ml-1 rounded-full border border-app-border px-2 py-0.5 text-[11px] font-medium text-app-text-muted">
          연구용 · 개인 프로젝트
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-xs text-app-text-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-app-success" />
          Online
        </span>
        {role === "admin" && (
          <Link
            href="/admin/dashboard"
            title="관리자"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors duration-150 hover:bg-app-card-hover hover:text-app-text"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors duration-150 hover:bg-app-danger-muted hover:text-app-danger"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
