"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckCircle2, XCircle, Clock, Send, Trash2,
  Loader2, AlertCircle, RefreshCw, Users, CalendarClock, MessageSquare,
  Eye, X, Zap,
} from "lucide-react";
import * as draftApi from "@/lib/draft-api";
import type { Account } from "@/types";
import { request } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "", label: "전체", icon: FileText },
  { value: "draft", label: "대기", icon: Clock },
  { value: "approved", label: "승인됨", icon: CheckCircle2 },
  { value: "rejected", label: "거절됨", icon: XCircle },
  { value: "scheduled", label: "예약됨", icon: Send },
];

// ─── Recipient Input (그룹/채널 ID 입력) ──────────────────────────

function RecipientInput({
  recipients,
  onChange,
}: {
  recipients: string[];
  onChange: (ids: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      onChange([...recipients, trimmed]);
    }
    setInput("");
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-app-text-secondary">
        발송 대상 (그룹/채널 ID)
      </label>
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="-100123456789"
          className="focus-ring flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle"
        />
        <button
          type="button"
          onClick={add}
          className="focus-ring rounded-lg bg-app-primary px-3 py-2 text-sm text-white hover:bg-app-primary/90"
        >
          추가
        </button>
      </div>
      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recipients.map((r) => (
            <span
              key={r}
              className="flex items-center gap-1 rounded-full bg-app-card border border-app-border px-2.5 py-1 text-[11px] text-app-text-secondary"
            >
              {r}
              <button
                type="button"
                onClick={() => onChange(recipients.filter((x) => x !== r))}
                className="text-app-text-subtle hover:text-app-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Approve Modal ──────────────────────────────────────────────────

function ApproveModal({
  draft,
  accounts,
  onConfirm,
  onClose,
}: {
  draft: draftApi.Draft;
  accounts: Account[];
  onConfirm: (opts: draftApi.ApproveDraftOptions) => void;
  onClose: () => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(draft.account_id || "");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [useSchedule, setUseSchedule] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-app-text">Draft 승인</h3>
            <p className="text-xs text-app-text-muted line-clamp-1">{draft.title || "제목 없음"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-card-hover text-app-text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Draft preview */}
        <div className="mb-4 rounded-xl border border-app-border bg-app-bg p-3">
          <p className="text-xs text-app-text-secondary line-clamp-4 whitespace-pre-wrap">{draft.content}</p>
        </div>

        {/* Account selection */}
        <div className="mb-3 space-y-1.5">
          <label className="text-xs font-medium text-app-text-secondary">발송 계정</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
          >
            <option value="">계정을 선택해주세요</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Recipients */}
        <div className="mb-3">
          <RecipientInput recipients={recipients} onChange={setRecipients} />
        </div>

        {/* Schedule toggle */}
        <div className="mb-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSchedule}
              onChange={(e) => setUseSchedule(e.target.checked)}
              className="rounded border-app-border text-app-primary focus:ring-app-primary"
            />
            <span className="text-xs font-medium text-app-text-secondary">예약 발송</span>
          </label>
          {useSchedule && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            />
          )}
        </div>

        {/* Feedback */}
        <div className="mb-4 space-y-1.5">
          <label className="text-xs font-medium text-app-text-secondary">피드백 (선택)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="수정할 점이나 메모..."
            rows={2}
            className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-app-border py-2.5 text-sm font-medium text-app-text-secondary hover:bg-app-card-hover">
            취소
          </button>
          <button
            onClick={() =>
              onConfirm({
                accountId: selectedAccountId || undefined,
                recipients: recipients.length > 0 ? recipients : undefined,
                scheduledAt: useSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                feedback: feedback || undefined,
              })
            }
            disabled={!selectedAccountId}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-1.5">
              <Send className="h-4 w-4" />
              {recipients.length > 0
                ? `${recipients.length}개 대상 발송`
                : "발송 (수신자 미지정)"}
            </div>
          </button>
        </div>

        {!selectedAccountId && (
          <p className="mt-2 text-[11px] text-amber-500">발송 계정을 선택해야 승인할 수 있습니다.</p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Draft Card ─────────────────────────────────────────────────────

function DraftCard({
  draft,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onDelete,
}: {
  draft: draftApi.Draft;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (d: draftApi.Draft) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-amber-500/10 text-amber-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    rejected: "bg-red-500/10 text-red-600",
    scheduled: "bg-blue-500/10 text-blue-600",
    sent: "bg-purple-500/10 text-purple-600",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group rounded-xl border p-4 transition-all duration-150 hover:shadow-sm ${
        selected
          ? "border-app-primary/40 bg-app-primary/[0.04]"
          : "border-app-border bg-app-card hover:border-app-primary/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(draft.id)}
            className="h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-primary"
          />
        </div>
        <div className="min-w-0 flex-1">
          {/* Badge row */}
          <div className="mb-2 flex items-center gap-2 ml-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[draft.status] || "bg-gray-500/10 text-gray-600"}`}>
              {draft.status}
            </span>
            {draft.account_id && (
              <span className="flex items-center gap-1 text-[10px] text-app-text-subtle">
                <Zap className="h-3 w-3" />
                {draft.account_id.slice(0, 8)}
              </span>
            )}
            <span className="text-[10px] text-app-text-subtle">{draft.content_type}</span>
            {draft.ai_model && (
              <span className="text-[10px] text-app-text-subtle">AI: {draft.ai_model}</span>
            )}
          </div>

          {/* Title */}
          <h4 className="mb-1 text-sm font-semibold text-app-text truncate">
            {draft.title || "제목 없음"}
          </h4>

          <p className="mb-2 text-xs text-app-text-secondary line-clamp-2 whitespace-pre-wrap">
            {draft.content}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-app-text-subtle">
            <span>{new Date(draft.created_at).toLocaleString()}</span>
            {draft.scheduled_at && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(draft.scheduled_at).toLocaleString()}
              </span>
            )}
            {draft.tokens_used > 0 && (
              <span>{draft.tokens_used.toLocaleString()} tokens</span>
            )}
          </div>

          {/* Feedback */}
          {draft.feedback && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-app-bg p-2">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-app-text-subtle" />
              <p className="text-[11px] text-app-text-secondary">{draft.feedback}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          {(draft.status === "draft" || draft.status === "rejected") && (
            <button
              onClick={() => onApprove(draft)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-500 opacity-0 transition-all duration-150 hover:bg-emerald-500/10 group-hover:opacity-100"
              title="승인"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          {draft.status === "draft" && (
            <button
              onClick={() => onReject(draft.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 opacity-0 transition-all duration-150 hover:bg-red-500/10 group-hover:opacity-100"
              title="거절"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(draft.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-subtle hover:bg-app-card-hover hover:text-app-danger"
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Tab ───────────────────────────────────────────────────────

export function DraftsTab() {
  const [drafts, setDrafts] = useState<draftApi.Draft[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<draftApi.DraftSummary | null>(null);
  const [approvingDraft, setApprovingDraft] = useState<draftApi.Draft | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Toggle single selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select all / deselect all
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === drafts.length) return new Set();
      return new Set(drafts.map((d) => d.id));
    });
  }, [drafts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s, accs] = await Promise.all([
        draftApi.fetchDrafts(status || undefined),
        draftApi.fetchDraftSummary(),
        request<{ accounts: Account[] }>("/api/accounts").catch(() => ({ accounts: [] })),
      ]);
      setDrafts(d);
      setSummary(s);
      setAccounts(accs.accounts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(draft: draftApi.Draft) {
    setApprovingDraft(draft);
  }

  async function handleConfirmApprove(opts: draftApi.ApproveDraftOptions) {
    if (!approvingDraft) return;
    try {
      await draftApi.approveDraft(approvingDraft.id, opts);
    } catch { /* ignore */ }
    setApprovingDraft(null);
    load();
  }

  async function handleReject(id: string) {
    try {
      await draftApi.rejectDraft(id);
      load();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await draftApi.deleteDraft(id);
      load();
    } catch { /* ignore */ }
  }

  // ── Bulk operations ────────────────────────────────────────────────

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await draftApi.batchApproveDrafts(Array.from(selectedIds));
      setSelectedIds(new Set());
      load();
    } catch { /* ignore */ }
    setBulkActionLoading(false);
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await draftApi.batchRejectDrafts(Array.from(selectedIds));
      setSelectedIds(new Set());
      load();
    } catch { /* ignore */ }
    setBulkActionLoading(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await draftApi.batchDeleteDrafts(Array.from(selectedIds));
      setSelectedIds(new Set());
      load();
    } catch { /* ignore */ }
    setBulkActionLoading(false);
  }

  // ── Summary badges ──
  const summaryItems = [
    { label: "대기", value: summary?.draft ?? 0, color: "text-amber-500" },
    { label: "승인", value: summary?.approved ?? 0, color: "text-emerald-500" },
    { label: "거절", value: summary?.rejected ?? 0, color: "text-red-500" },
    { label: "예약", value: summary?.scheduled ?? 0, color: "text-blue-500" },
    { label: "발송", value: summary?.sent ?? 0, color: "text-purple-500" },
  ];

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
          <FileText className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-app-text">AI Draft 관리</h2>
          <p className="text-xs text-app-text-muted">검토 후 승인하면 자동 발송됩니다</p>
        </div>
        <button
          onClick={load}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-5 gap-2">
        {summaryItems.map((s) => (
          <div key={s.label} className="rounded-xl border border-app-border bg-app-card p-2.5 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-app-text-subtle">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Select-all + Status filter */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={toggleSelectAll}
          className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
            selectedIds.size > 0
              ? "bg-app-primary/10 text-app-primary border border-app-primary/30"
              : "border border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover"
          }`}
          title={selectedIds.size === drafts.length ? "전체 해제" : "전체 선택"}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {selectedIds.size > 0 ? `${selectedIds.size}개 선택` : "전체선택"}
        </button>
        <div className="h-5 w-px bg-app-border" />
        {STATUS_OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                status === o.value
                  ? "bg-app-primary text-white shadow-sm"
                  : "border border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          );
        }          )}
        </div>

      {/* Draft list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
            <p className="text-xs text-app-text-muted">로딩 중...</p>
          </div>
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-app-text-muted gap-3">
          <FileText className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium text-app-text-secondary">
            {status ? `${STATUS_OPTIONS.find((o) => o.value === status)?.label || status} 상태의 Draft가 없습니다` : "아직 Draft가 없습니다"}
          </p>
          <p className="text-xs">AI 콘텐츠 스튜디오에서 생성하거나 직접 작성하세요.</p>
        </div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {drafts.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  selected={selectedIds.has(d.id)}
                  onToggleSelect={toggleSelect}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </AnimatePresence>

          {/* Bulk action bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
              >
                <div className="flex items-center gap-2 rounded-2xl border border-app-border bg-app-card px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <span className="mr-1 text-sm font-medium text-app-text">
                    {selectedIds.size}개 선택됨
                  </span>
                  <div className="h-5 w-px bg-app-border" />
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    승인
                  </button>
                  <button
                    onClick={handleBulkReject}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    거절
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-text-secondary hover:bg-app-card-hover disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-app-text-muted hover:text-app-text"
                  >
                    <X className="h-3.5 w-3.5" />
                    취소
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Approve modal */}
      <AnimatePresence>
        {approvingDraft && (
          <ApproveModal
            draft={approvingDraft}
            accounts={accounts}
            onConfirm={handleConfirmApprove}
            onClose={() => setApprovingDraft(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
