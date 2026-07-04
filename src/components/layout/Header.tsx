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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/15 text-sky-400">
          <Radio className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-neutral-100">
          Management Dashboard
        </span>
        <span className="ml-2 rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] font-medium text-neutral-400">
          연구용 · 개인 프로젝트
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Sprint 5.5 · Admin Auth
        </span>
        {role === "admin" && (
          <Link
            href="/admin/dashboard"
            title="관리자"
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
