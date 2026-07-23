"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Activity, Search, RefreshCw, Filter } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { fmt, formatRelativeTime } from "@/lib/formatTime";
import { exportCSV } from "@/lib/exportUtils";
import * as api from "@/lib/api";

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  createdAt: string;
}

const ACTION_TONES: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  create: "success",
  update: "info",
  delete: "danger",
  send: "warning",
  login: "neutral",
  logout: "neutral",
};

const ACTION_LABELS: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  send: "발송",
  login: "로그인",
  logout: "로그아웃",
};

export function ActivityAuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.request<AuditEntry[]>("/api/admin/audit-log");
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.userEmail.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.target.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q)
    );
  }, [entries, search]);

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app-text">팀 활동 로그</h2>
          <p className="text-xs text-app-text-muted">모든 팀원의 주요 활동을 추적합니다</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button onClick={() => exportCSV(["ID","사용자","액션","대상","상세","IP","시간"], entries.map(e => [e.id, e.userEmail, ACTION_LABELS[e.action] || e.action, e.target, e.detail, e.ip, e.createdAt]), "audit-log")}
              className="rounded-lg border border-app-border px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
              내보내기
            </button>
          )}
          <button onClick={load} className="rounded-lg p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-app-text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="사용자, 액션, 대상 검색..."
          className="w-full rounded-xl border border-app-border bg-app-card py-2 pl-8 pr-3 text-xs text-app-text outline-none placeholder:text-app-text-subtle focus:border-app-primary/60 focus-ring" />
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={`audit-sk-${i}`} className="h-14 w-full rounded-xl" />)}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-4 text-sm text-app-danger">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={Activity} title={search ? "검색 결과 없음" : "활동 기록 없음"}
          description={search ? "다른 검색어로 시도해보세요." : "아직 기록된 활동이 없습니다."} />
      )}

      {filtered.length > 0 && (
        <div className="space-y-1">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-xl border border-app-border bg-app-card p-3 hover:border-app-border-strong transition-colors">
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                ACTION_TONES[e.action] === "danger" ? "bg-app-danger-muted" :
                ACTION_TONES[e.action] === "warning" ? "bg-app-warning-muted" :
                ACTION_TONES[e.action] === "success" ? "bg-app-success-muted" :
                "bg-app-card-hover"
              )}>
                <Activity className="h-3.5 w-3.5 text-app-text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone={ACTION_TONES[e.action] || "neutral"}>{ACTION_LABELS[e.action] || e.action}</Badge>
                  <span className="text-xs font-medium text-app-text truncate">{e.target}</span>
                  <span className="text-[10px] text-app-text-subtle">{formatRelativeTime(e.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-app-text-muted">
                  {e.detail}
                  <span className="ml-2 text-[10px] text-app-text-subtle">{e.userEmail}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
