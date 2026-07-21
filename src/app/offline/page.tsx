"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-6">
      <div className="max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-app-primary/10">
            <WifiOff className="h-8 w-8 text-app-primary" />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-30" />

        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          오프라인 상태
        </h1>
        <p className="text-sm text-app-text-muted leading-relaxed">
          인터넷 연결이 끊어졌습니다. 연결을 확인한 후 다시 시도해주세요.
        </p>

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
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] text-[8px] font-bold">
              TM
            </div>
            <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              Tele<span className="text-[var(--color-accent)]">Mon</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
