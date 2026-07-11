"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, AlertCircle, Ban, CalendarClock, CheckCircle2, Clock, Info,
  PauseCircle, PlayCircle, Plus, RefreshCw, SendHorizonal, Trash2, X, XCircle,
} from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Broadcast, BroadcastChild, BroadcastStatus, Account } from "@/types";
import { isRecurringBroadcast, getRecurringState, RECURRING_INTERVALS } from "@/types";

type RState = ReturnType<typeof getRecurringState>;
type RFilter = RState | "all";

const STATE_META: Record<RState, { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string; icon: React.ReactNode }> = {
  active: { tone: "success", label: "활성", icon: <PlayCircle className="h-3.5 w-3.5" /> },
  paused: { tone: "warning", label: "일시중지", icon: <PauseCircle className="h-3.5 w-3.5" /> },
  cancelled: { tone: "neutral", label: "취소", icon: <Ban className="h-3.5 w-3.5" /> },
  error: { tone: "danger", label: "오류", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const CHILD_META: Record<string, { tone: string; label: string }> = {
  pending: { tone: "neutral", label: "대기" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소" },
};

function fmtRel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso + "Z").getTime()) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return m + "분 전";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "시간 전";
  return Math.floor(h / 24) + "일 전";
}

function fmtDT(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso + "Z").toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function ConfirmDialog({ open, title, message, confirmLabel, tone, loading, onConfirm, onCancel }:
  { open: boolean; title: string; message: string; confirmLabel: string; tone: "danger" | "warning" | "info"; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone === "danger" && "bg-app-danger-muted text-app-danger",
            tone === "warning" && "bg-app-warning-muted text-app-warning",
            tone === "info" && "bg-app-info-muted text-app-info")}>
            {tone === "danger" && <AlertTriangle className="h-5 w-5" />}
            {tone === "warning" && <AlertCircle className="h-5 w-5" />}
            {tone === "info" && <Info className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-app-text">{title}</p><p className="mt-0.5 text-xs text-app-text-muted">{message}</p></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl px-3 py-1.5 text-xs font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">취소</button>
          <button onClick={onConfirm} disabled={loading} className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition-colors", tone === "danger" && "bg-app-danger hover:bg-app-danger/80", tone === "warning" && "bg-app-warning hover:bg-app-warning/80", tone === "info" && "bg-app-primary hover:bg-app-primary-hover", loading && "opacity-60")}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}{confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ExecutionPanel({ parent, onClose }: { parent: Broadcast; onClose: () => void }) {
  const [children, setChildren] = useState<BroadcastChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.fetchRecurringChildren(parent.id, 50).then(setChildren).catch((e: Error) => setError(e.message ?? "오류")).finally(() => setLoading(false));
  }, [parent.id]);

  const stats = useMemo(() => {
    if (children.length === 0) return null;
    const s = children.filter(c => c.status === "sent").length;
    const f = children.filter(c => c.status === "failed").length;
    const p = children.filter(c => c.status === "pending" || c.status === "sending").length;
    const r = children.length > 0 ? Math.round((s / children.length) * 100) : 0;
    return { total: children.length, sent: s, failed: f, pending: p, rate: r };
  }, [children]);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-3 rounded-2xl border border-app-border bg-app-bg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-card-hover"><RefreshCw className="h-3.5 w-3.5 text-app-text-muted" /></div>
            <div><p className="text-sm font-medium text-app-text">실행 기록</p><p className="text-[11px] text-app-text-muted">{parent.message}</p></div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text"><X className="h-4 w-4" /></button>
        </div>
        {stats && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-app-card px-3 py-2 text-xs">
            <span className="text-app-text-muted">총 <strong className="text-app-text">{stats.total}</strong>회</span><span className="h-3 w-px bg-app-border" />
            <span className="text-app-success">성공 <strong>{stats.sent}</strong></span><span className="h-3 w-px bg-app-border" />
            <span className="text-app-danger">실패 <strong>{stats.failed}</strong></span>
            {stats.pending > 0 && <><span className="h-3 w-px bg-app-border" /><span className="text-app-warning">대기 <strong>{stats.pending}</strong></span></>}
            <span className="ml-auto font-medium tabular-nums" style={{ color: stats.rate >= 90 ? "var(--app-success)" : stats.rate >= 70 ? "var(--app-warning)" : "var(--app-danger)" }}>{stats.rate}%</span>
          </div>
        )}
        {loading ? <div className="space-y-2"><Skeleton className="h-8 w-full rounded-xl" /><Skeleton className="h-8 w-full rounded-xl" /></div>
        : error ? <div className="flex flex-col items-center py-6 text-center"><AlertTriangle className="mb-2 h-5 w-5 text-app-danger" /><p className="text-xs text-app-danger">{error}</p></div>
        : children.length === 0 ? <div className="flex flex-col items-center py-6 text-center"><RefreshCw className="mb-2 h-5 w-5 text-app-text-subtle" /><p className="text-xs text-app-text-muted">아직 실행 기록이 없습니다</p></div>
        : <div className="max-h-64 overflow-y-auto -mx-1"><Table><TableHeader><TableRow><TableHead className="text-[11px]">시간</TableHead><TableHead className="text-[11px]">상태</TableHead><TableHead className="text-[11px]">메시지</TableHead><TableHead className="text-[11px]">오류</TableHead></TableRow></TableHeader><TableBody>{children.map(c => <TableRow key={c.id}>
          <TableCell className="font-mono text-[11px] text-app-text-muted whitespace-nowrap">{fmtDT(c.createdAt)}</TableCell>
          <TableCell><Badge tone={(CHILD_META[c.status]?.tone ?? "neutral") as "neutral" | "success" | "warning" | "danger" | "info"}>{CHILD_META[c.status]?.label ?? c.status}</Badge></TableCell>
          <TableCell className="text-xs text-app-text max-w-[140px] truncate">{c.message}</TableCell>
          <TableCell className="text-[11px] text-app-danger max-w-[100px] truncate">{c.errorMessage ?? "-"}</TableCell>
        </TableRow>)}</TableBody></Table></div>}
      </div>
    </motion.div>
  );
}

function ScheduleCard({
  b, state, meta, childInfo, accounts,
  onPause, onResume, onCancel, onToggleHistory, historyOpen,
}: {
  b: Broadcast; state: RState; meta: typeof STATE_META[RState];
  childInfo: { count: number; last: BroadcastChild | null } | undefined;
  accounts: Account[];
  onPause: () => void; onResume: () => void; onCancel: () => void;
  onToggleHistory: () => void; historyOpen: boolean;
}) {
  const cd = useCountdown(b.nextScheduledAt);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border p-4 transition-all duration-200",
        state === "active" && "border-app-border bg-app-card hover:border-app-border-strong hover:shadow-md",
        state === "paused" && "border-app-warning/20 bg-app-warning-muted/10",
        state === "cancelled" && "border-app-border bg-app-bg opacity-60",
        state === "error" && "border-app-danger/20 bg-app-danger-muted/10",
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} className="shrink-0 gap-1">{meta.icon}{meta.label}</Badge>
            <span className="truncate text-[11px] text-app-text-subtle">{(accounts.find(a => a.id === b.accountId)?.name?.trim() || b.accountId.slice(0, 8))}</span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-app-text leading-snug line-clamp-2">{b.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-app-text-muted">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{intervalLabel(b.recurringIntervalMinutes)}</span>
            <span className="inline-flex items-center gap-1"><SendHorizonal className="h-3 w-3" />{b.recipients.length}개 대상</span>
            {childInfo && childInfo.count > 0 && <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />{childInfo.count}회 발송</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {state === "active" && <button onClick={onPause} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-warning hover:bg-app-warning-muted/30"><PauseCircle className="h-3.5 w-3.5" /> 중지</button>}
          {state === "paused" && <button onClick={onResume} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-success hover:bg-app-success-muted/30"><PlayCircle className="h-3.5 w-3.5" /> 재개</button>}
          {state !== "cancelled" && <button onClick={onCancel} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted/30"><Ban className="h-3.5 w-3.5" /> 취소</button>}
          <button onClick={onToggleHistory} className="rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover">{historyOpen ? "닫기" : "기록"}</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-app-border pt-2.5 text-[11px]">
        {(state === "active" || state === "paused") && <><span className="inline-flex items-center gap-1 text-app-text-muted"><CalendarClock className="h-3 w-3" />다음 실행:</span>
          {b.nextScheduledAt ? <span className={cn("font-mono font-medium", cd ? "text-app-info" : "text-app-text-muted")}>{fmtDT(b.nextScheduledAt)}{cd && <span className="ml-1.5 text-app-info">({cd})</span>}</span> : <span className="text-app-text-muted">-</span>}</>}
        {state === "cancelled" && <span className="text-app-text-muted">취소됨 {b.cancelledAt ? fmtDT(b.cancelledAt) : ""}</span>}
        {childInfo?.last && <span className="inline-flex items-center gap-1 ml-auto"><span className="text-app-text-muted">마지막:</span><span className={cn("font-mono", childInfo.last.status === "sent" && "text-app-success", childInfo.last.status === "failed" && "text-app-danger")}>{CHILD_META[childInfo.last.status]?.label ?? childInfo.last.status}</span><span className="text-app-text-subtle">{fmtRel(childInfo.last.createdAt)}</span></span>}
      </div>
    </motion.div>
  );
}

export function RecurringScheduleTab() {
  const accounts = useDashboardStore(s => s.accounts);
  const selectedAccountId = useDashboardStore(s => s.selectedAccountId);

  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ b: Broadcast; action: "cancel" | "pause" } | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [childData, setChildData] = useState<Record<string, { count: number; last: BroadcastChild | null }>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [formAccountId, setFormAccountId] = useState("");
  const [formRecipients, setFormRecipients] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formInterval, setFormInterval] = useState(60);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecurring = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await api.fetchRecurringBroadcasts();
      setRecurring(list);
      const data: Record<string, { count: number; last: BroadcastChild | null }> = {};
      const results = await Promise.allSettled(list.map(async (b) => {
        const children = await api.fetchRecurringChildren(b.id, 1);
        return { id: b.id, children };
      }));
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { id, children } = result.value;
          data[id] = { count: children.length + (childData[id]?.count ?? 0), last: children[0] ?? childData[id]?.last ?? null };
        } else {
          const failedId = list.find(b => !data[b.id])?.id;
          if (failedId) data[failedId] = { count: childData[failedId]?.count ?? 0, last: childData[failedId]?.last ?? null };
        }
      }
      setChildData(data);
    } catch (e) { setError(e instanceof Error ? e.message : "로드 실패"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecurring(); }, [loadRecurring]);

  const handleCancel = async () => {
    if (!confirm) return;
    setActionLoading(confirm.b.id);
    try { await api.cancelRecurringBroadcast(confirm.b.id); setRecurring(prev => prev.filter(b => b.id !== confirm!.b.id)); setConfirm(null); }
    catch (e) { alert(e instanceof Error ? e.message : "취소 실패"); }
    finally { setActionLoading(null); }
  };

  const handlePause = async (b: Broadcast) => {
    setActionLoading(b.id);
    try { const updated = await api.pauseRecurringBroadcast(b.id); setRecurring(prev => prev.map(p => p.id === b.id ? { ...p, ...updated } : p)); setConfirm(null); }
    catch (e) { alert(e instanceof Error ? e.message : "일시중지 실패"); }
    finally { setActionLoading(null); }
  };

  const handleResume = async (b: Broadcast) => {
    setActionLoading(b.id);
    try { const updated = await api.unpauseRecurringBroadcast(b.id); setRecurring(prev => prev.map(p => p.id === b.id ? { ...p, ...updated } : p)); }
    catch (e) { alert(e instanceof Error ? e.message : "재개 실패"); }
    finally { setActionLoading(null); }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formAccountId || !formRecipients.trim() || !formMessage.trim() || formSubmitting) return;
    setFormSubmitting(true); setFormError(null);
    const recipients = formRecipients.split("\n").map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) { setFormError("최소 1개 대상이 필요합니다."); setFormSubmitting(false); return; }
    try {
      await api.createBroadcast({
        accountId: formAccountId, message: formMessage.trim(), recipients, recurringIntervalMinutes: formInterval,
      });
      setShowCreate(false); setFormAccountId(""); setFormRecipients(""); setFormMessage(""); setFormInterval(60);
      await loadRecurring();
    } catch (e) { setFormError(e instanceof Error ? e.message : "생성 실패"); }
    finally { setFormSubmitting(false); }
  };

  const stats = useMemo(() => {
    if (recurring.length === 0) return null;
    const a = recurring.filter(b => getRecurringState(b) === "active").length;
    const p = recurring.filter(b => getRecurringState(b) === "paused").length;
    const e = recurring.filter(b => getRecurringState(b) === "error").length;
    return { total: recurring.length, active: a, paused: p, error: e };
  }, [recurring]);

  const [filter, setFilter] = useState<RFilter>("all");
  const [sortBy, setSortBy] = useState<"created" | "next_run">("created");

  const visible = useMemo(() => {
    let items = [...recurring];
    if (filter !== "all") items = items.filter(b => getRecurringState(b) === filter);
    if (sortBy === "next_run") {
      items.sort((a, b) => { if (!a.nextScheduledAt) return 1; if (!b.nextScheduledAt) return -1; return new Date(a.nextScheduledAt + "Z").getTime() - new Date(b.nextScheduledAt + "Z").getTime(); });
    } else {
      items.sort((a, b) => new Date(b.createdAt + "Z").getTime() - new Date(a.createdAt + "Z").getTime());
    }
    return items;
  }, [recurring, filter, sortBy]);

  const needsAttention = recurring.some(b => getRecurringState(b) === "error");

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-base font-bold text-app-text">반복 스케줄러</h1><p className="text-xs text-app-text-muted">반복 발송 일정을 관리하고 실행 현황을 모니터링합니다</p></div>
        <div className="flex items-center gap-2">
          {needsAttention && <div className="flex items-center gap-1.5 rounded-lg bg-app-danger-muted/30 px-2.5 py-1.5"><AlertTriangle className="h-3.5 w-3.5 text-app-danger" /><span className="text-[11px] font-medium text-app-danger">주의 필요</span></div>}
          <button onClick={() => { setShowCreate(true); setFormAccountId(selectedAccountId ?? accounts[0]?.id ?? ""); }} className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover"><Plus className="h-3.5 w-3.5" /> 새 반복 발송</button>
          <button onClick={loadRecurring} className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text hover:border-app-border-strong"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /></button>
        </div>
      </div>

      {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ label: "전체", value: stats.total }, { label: "활성", value: stats.active }, { label: "일시중지", value: stats.paused }, { label: "오류", value: stats.error, hl: stats.error > 0 }].map(s => (
        <div key={s.label} className={cn("rounded-2xl border p-3", s.hl ? "border-app-danger/20 bg-app-danger-muted/10" : "border-app-border bg-app-card")}>
          <div className={cn("text-2xl font-bold tracking-tight tabular-nums", s.hl ? "text-app-danger" : "text-app-text")}>{loading ? "-" : s.value}</div>
          <div className="mt-0.5 text-[11px] text-app-text-muted">{s.label}</div>
        </div>
      ))}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-app-border bg-app-card p-0.5">
          {(["all", "active", "paused", "error"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors", filter === f ? "bg-app-primary text-white shadow-sm" : "text-app-text-muted hover:text-app-text")}>
              {f === "all" ? "전체" : STATE_META[f].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-app-border bg-app-card p-0.5 ml-auto">
          <button onClick={() => setSortBy("created")} className={cn("rounded-lg px-2 py-1 text-[11px] font-medium", sortBy === "created" ? "text-app-text" : "text-app-text-muted hover:text-app-text")}>생성순</button>
          <button onClick={() => setSortBy("next_run")} className={cn("rounded-lg px-2 py-1 text-[11px] font-medium", sortBy === "next_run" ? "text-app-text" : "text-app-text-muted hover:text-app-text")}>실행순</button>
        </div>
      </div>

      {loading && recurring.length === 0 ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      : error && recurring.length === 0 ? <Panel><div className="flex flex-col items-center py-10 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-app-danger-muted"><XCircle className="h-7 w-7 text-app-danger" /></div><p className="text-sm font-semibold text-app-danger">데이터 로드 실패</p><p className="mt-1 text-xs text-app-text-muted">{error}</p><button onClick={loadRecurring} className="mt-4 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white"><RefreshCw className="h-3.5 w-3.5 mr-1 inline" /> 다시 시도</button></div></Panel>
      : visible.length === 0 ? <Panel><div className="flex flex-col items-center py-12 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-card-hover"><CalendarClock className="h-8 w-8 text-app-text-subtle" /></div>
        <p className="text-sm font-semibold text-app-text">{filter !== "all" ? "조건에 맞는 일정이 없습니다" : "반복 발송 일정이 없습니다"}</p>
        <p className="mt-1 max-w-xs text-xs text-app-text-muted">{filter !== "all" ? "필터를 변경해보세요" : "새 반복 발송을 생성하여 정기 메시지를 자동화하세요"}</p>
        {filter !== "all" && <button onClick={() => setFilter("all")} className="mt-3 rounded-xl border border-app-border px-3 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text">전체 보기</button>}
        {filter === "all" && <button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5 mr-1 inline" /> 새 반복 발송 만들기</button>}
      </div></Panel>
      : <div className="space-y-2">{visible.map(b => {
        const state = getRecurringState(b);
        const meta = STATE_META[state];
        const childInfo = childData[b.id];
        return <div key={b.id}>
          <ScheduleCard b={b} state={state} meta={meta} childInfo={childInfo} accounts={accounts}
            onPause={() => setConfirm({ b, action: "pause" })}
            onResume={() => handleResume(b)}
            onCancel={() => setConfirm({ b, action: "cancel" })}
            onToggleHistory={() => setHistoryId(historyId === b.id ? null : b.id)}
            historyOpen={historyId === b.id}
          />
          <AnimatePresence>{historyId === b.id && <ExecutionPanel parent={b} onClose={() => setHistoryId(null)} />}</AnimatePresence>
        </div>;
      })}</div>}

      <AnimatePresence>
        {showCreate && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
          <Panel title="새 반복 발송 생성">
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <Field label="계정"><select value={formAccountId} onChange={e => setFormAccountId(e.target.value)} required className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60">
                  <option value="">계정 선택</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name?.trim() || a.phone}</option>)}
                </select></Field>
                <Field label="메시지 내용"><Textarea rows={4} value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder="보낼 메시지를 입력하세요" required /></Field>
                <Field label="대상 채팅 ID (줄바꿈 구분)" hint="@username 또는 chat ID"><Textarea rows={3} value={formRecipients} onChange={e => setFormRecipients(e.target.value)} placeholder="-100123456789" required /></Field>
                <Field label="반복 간격"><select value={formInterval} onChange={e => setFormInterval(Number(e.target.value))} className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60">
                  {RECURRING_INTERVALS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select></Field>
                {formError && <p className="text-xs text-app-danger">{formError}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>취소</Button>
                  <Button type="submit" variant="primary" disabled={formSubmitting}>{formSubmitting ? "생성 중..." : "생성"}</Button>
                </div>
              </div>
            </form>
          </Panel>
        </motion.div>}
      </AnimatePresence>

      <ConfirmDialog open={confirm?.action === "cancel"} title="반복 발송 취소" message={`"${confirm?.b.message.slice(0, 50)}" 반복 발송을 영구 취소합니다.`} confirmLabel="취소하기" tone="danger" loading={actionLoading === confirm?.b.id} onConfirm={handleCancel} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm?.action === "pause"} title="반복 발송 일시중지" message={`"${confirm?.b.message.slice(0, 50)}" 반복 발송을 일시중지합니다. 일정은 유지됩니다.`} confirmLabel="일시중지" tone="warning" loading={actionLoading === confirm?.b.id} onConfirm={() => { if (confirm) handlePause(confirm.b); }} onCancel={() => setConfirm(null)} />
    </div>
  );
}
