"use client";

import { useState, memo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertCircle, RotateCcw, Send, RefreshCw, Loader2, ChevronRight, Filter } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import type { BroadcastStatus } from "@/types";
import { relativeTime } from "@/lib/relativeTime";

const STATUS_FILTERS: { key: "all" | BroadcastStatus; label: string }[] = [
  { key: "all", label: "?„ì²´" },
  { key: "sent", label: "?±ê³µ" },
  { key: "failed", label: "?¤íŒ¨" },
  { key: "pending", label: "?€ê¸? },
  { key: "sending", label: "ë°œì†¡ì¤? },
];

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  sent: { icon: CheckCircle, color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  failed: { icon: XCircle, color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  pending: { icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  sending: { icon: Loader2, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cancelled: { icon: AlertCircle, color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

interface HistoryEntry {
  id: string;
  message: string;
  status: BroadcastStatus;
  sentAt: string;
  accountPhone?: string;
  groupCount?: number;
  recipientCount?: number;
  errorMessage?: string;
}

export const MiniAppHistory = memo(function MiniAppHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | BroadcastStatus>("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 15;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await api.fetchLogs({ limit: 100, ...(statusFilter !== "all" ? { status: statusFilter } : {}) });
      setEntries(logs.map((l: any) => ({
        id: l.id,
        message: l.message || "(?´ìš© ?†ìŒ)",
        status: l.status,
        sentAt: l.scheduledAt || l.createdAt,
        accountPhone: l.accountPhone,
        groupCount: l.groupCount,
        recipientCount: l.recipientCount,
        errorMessage: l.errorMessage,
      })));
    } catch (e) { console.warn('Unhandled error in MiniAppHistory', e) }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleRetry = useCallback(async (id: string) => {
    setRetrying(id);
    try { await api.retryBroadcast(id); hapticFeedback.notificationOccurred("success"); fetchHistory(); } catch (e) { console.warn('Unhandled error in MiniAppHistory', e) }
    setRetrying(null);
  }, [fetchHistory]);

  const displayEntries = entries.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = entries.length > displayEntries.length;

  // IntersectionObserver infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) setPage(p => p + 1);
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  return (
    <div className="pb-4 space-y-3">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--tg-theme-text-color)" }}>
          <Clock className="h-4 w-4" /> ë°œì†¡ ?´ì—­
        </h2>
        <button onClick={fetchHistory} className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 px-4 overflow-x-auto scrollbar-none">
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(0); }}
            className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium active:scale-90"
            style={{
              backgroundColor: statusFilter === f.key ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-secondary-bg-color, #232e3c)",
              color: statusFilter === f.key ? "#fff" : "var(--tg-theme-text-color)",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && entries.length === 0 ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }} />
          ))}
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Clock className="h-10 w-10 mb-2" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>ë°œì†¡ ?´ì—­???†ìŠµ?ˆë‹¤</p>
        </div>
      ) : (
        <div className="px-4 space-y-1.5">
          {displayEntries.map(e => {
            const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-3 py-2.5 flex items-center gap-3 active:scale-[0.98]"
                style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: cfg.bg }}>
                  <Icon className={`h-4 w-4 ${e.status === "sending" ? "animate-spin" : ""}`} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--tg-theme-text-color)" }}>{e.message}</p>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                    <span>{e.recipientCount ? `${e.recipientCount}ëª? : ""}</span>
                    {e.sentAt && <span>{relativeTime(e.sentAt)}</span>}
                    {e.accountPhone && <span className="truncate max-w-[80px]">{e.accountPhone}</span>}
                  </div>
                  {e.status === "failed" && e.errorMessage && (
                    <p className="text-[9px] mt-0.5 truncate" style={{ color: "#ef4444" }}>{e.errorMessage}</p>
                  )}
                </div>
                {e.status === "failed" && (
                  <button onClick={() => handleRetry(e.id)} disabled={retrying === e.id}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90 disabled:opacity-50"
                    style={{ backgroundColor: "rgba(239,68,68,0.15)" }}>
                    {retrying === e.id ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <RotateCcw className="h-4 w-4 text-red-500" />}
                  </button>
                )}
                {e.status === "sent" && (
                  <ChevronRight className="h-4 w-4" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
                )}
              </motion.div>
            );
          })}
          {hasMore && <div ref={sentinelRef} className="h-8" />}
          {loading && entries.length > 0 && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
