"use client";

import type { ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface AiSubTabLayoutProps {
  /** Icon element displayed in the header (e.g. `<Bot className="h-5 w-5" />`) */
  icon: ReactNode;
  /** Title text (e.g. "AI Reply Assistant") */
  title: string;
  /** Optional subtitle / description alongside the title */
  subtitle?: string;
  /** Optional "beta" or "new" badge text */
  badge?: string;
  /** When true, shows a centered spinner */
  loading?: boolean;
  /** When set, shows a centered error banner */
  error?: string;
  /** When true and no children, shows the empty fallback */
  empty?: boolean;
  /** The static fallback shown when the tab has no data / no interaction yet */
  emptyFallback?: ReactNode;
  /** Main tab content */
  children?: ReactNode;
}

/**
 * Standard layout for every AI sub-tab inside MyAiTab.
 *
 * Provides a consistent header region, loading spinner, error banner,
 * empty-state fallback, and a content slot.
 */
export function AiSubTabLayout({
  icon,
  title,
  subtitle,
  badge,
  loading,
  error,
  empty,
  emptyFallback,
  children,
}: AiSubTabLayoutProps) {
  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
        <h2 className="text-sm font-bold text-app-text">{title}</h2>
        {badge && (
          <span className="rounded-full bg-app-primary/10 px-2 py-0.5 text-[10px] font-medium text-app-primary">
            {badge}
          </span>
        )}
        {subtitle && (
          <span className="text-[10px] text-app-text-muted hidden sm:inline">{subtitle}</span>
        )}
      </div>

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-app-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-xs">불러오는 중...</span>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex items-start gap-2 rounded-lg border border-app-danger/30 bg-app-danger-muted/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-app-danger" />
          <p className="text-xs text-app-danger">{error}</p>
        </div>
      )}

      {/* ── Empty / Content ────────────────────────────────────── */}
      {!loading && !error && empty && emptyFallback && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {emptyFallback}
        </div>
      )}

      {!loading && !error && children}
    </div>
  );
}