"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { MobileDashboard } from "@/components/workspace/MobileDashboard";

export default function MobileDashboardPage() {
  return (
    <AdminGuard>
      <div className="flex min-h-dvh flex-col bg-app-bg">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-app-border/50 bg-app-surface/95 px-4 py-3 backdrop-blur-xl">
          <Link href="/app" className="flex items-center gap-1.5 text-sm text-app-text-muted hover:text-app-text transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>뒤로</span>
          </Link>
          <h1 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>모바일 대시보드</h1>
        </div>
        <div className="flex-1 px-4 pt-4"><MobileDashboard /></div>
      </div>
    </AdminGuard>
  );
}
