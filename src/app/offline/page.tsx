"use client";

import { WifiOff, RefreshCw, Download } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-6">
      <div className="max-w-md text-center space-y-6 rounded-3xl border border-app-border/50 bg-app-card/85 p-6 shadow-2xl">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-primary/12 border border-app-primary/20">
            <WifiOff className="h-8 w-8 text-app-primary" />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-45" />

        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          오프라인 상태
        </h1>
        <p className="text-sm text-app-text-muted leading-relaxed">
          인터넷 연결이 끊어졌습니다. 연결이 복구되면 TeleMon이 자동으로 동기화됩니다.
        </p>

        <div className="rounded-2xl border border-app-border/60 bg-app-bg px-3 py-2 text-left text-xs text-app-text-muted">
          <p className="font-semibold text-app-text mb-1">오프라인에서 가능한 작업</p>
          <p>• 최근에 열어둔 화면은 캐시로 다시 열릴 수 있습니다.</p>
          <p>• 새 발송/수정 작업은 온라인 복귀 후 재시도해 주세요.</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-luxury btn-luxury-primary justify-center"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
          <Link
            href="/"
            className="btn-luxury btn-luxury-secondary justify-center"
          >
            홈으로
          </Link>
          <Link
            href="/app"
            className="btn-luxury btn-luxury-secondary justify-center"
          >
            <Download className="h-4 w-4" />
            앱 대시보드 열기
          </Link>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center bg-gradient-to-br from-violet-500 to-blue-500 text-white text-[8px] font-bold rounded-lg">
              TM
            </div>
            <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              Tele<span className="text-violet-400">Mon</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
