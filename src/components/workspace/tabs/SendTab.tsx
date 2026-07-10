"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Send as SendIcon, Users2, XCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupSelectCard } from "@/components/workspace/tabs/send/GroupSelectCard";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useFavoriteGroups, useGroupTags, useRecentGroups } from "@/lib/groupPreferences";
import * as api from "@/lib/api";
import { MAX_BROADCAST_RECIPIENTS, isBroadcastInFlight, type Broadcast, type BroadcastStatus } from "@/types";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
};

const POLL_INTERVAL_MS = 3000;
type SortMode = "default" | "members" | "favorites";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

export function SendTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const groups = useDashboardStore((s) => s.sendGroups);
  const groupsLoading = useDashboardStore((s) => s.sendGroupsLoading);
  const setGroups = useDashboardStore((s) => s.setSendGroups);
  const setGroupsLoading = useDashboardStore((s) => s.setSendGroupsLoading);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const toggleGroup = useDashboardStore((s) => s.toggleSendGroupId);
  const message = useDashboardStore((s) => s.sendMessage);
  const setMessage = useDashboardStore((s) => s.setSendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const setImageFile = useDashboardStore((s) => s.setSendImageFile);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);

  const { isFavorite, toggleFavorite } = useFavoriteGroups();
  const { recent, markUsed } = useRecentGroups();
  const { tagsByGroup, addTag } = useGroupTags();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadGroups(accountId: string) {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      setGroups(await api.fetchGroups(accountId));
    } catch (err) {
      setGroups([]);
      setGroupsError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setGroupsLoading(false);
    }
  }

  async function loadHistory(accountId: string) {
    setHistoryLoading(true);
    try {
      const logs = await api.fetchLogs({ accountId });
      setHistory(logs);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Poll while anything is pending/sending — real-time-ish status without a websocket.
  useEffect(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    if (!selectedAccountId || !history.some(isBroadcastInFlight)) return;

    pollTimer.current = setTimeout(() => {
      loadHistory(selectedAccountId);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [history, selectedAccountId]);

  useEffect(() => {
    clearSendDraft();
    setSubmitError(null);
    setSubmitNotice(null);
    if (selectedAccountId) {
      loadGroups(selectedAccountId);
      loadHistory(selectedAccountId);
    } else {
      setGroups([]);
      setHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  function handleAddTag(groupId: string) {
    const tag = window.prompt("이 그룹에 붙일 태그를 입력하세요.");
    if (tag) addTag(groupId, tag);
  }

  const visibleGroups = useMemo(() => {
    const filtered = groups.filter((g) => g.title.toLowerCase().includes(search.trim().toLowerCase()));
    const sorted = [...filtered];
    if (sortMode === "members") {
      sorted.sort((a, b) => (b.participantsCount ?? 0) - (a.participantsCount ?? 0));
    } else if (sortMode === "favorites") {
      sorted.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    }
    return sorted;
  }, [groups, search, sortMode, isFavorite]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || selectedIds.length === 0 || !message.trim() || submitting) return;
    if (isScheduled && !scheduledAtLocal) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const scheduledAtIso =
        isScheduled && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;

      await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: selectedIds,
        image: imageFile ?? undefined,
        scheduledAt: scheduledAtIso,
      });
      markUsed(selectedIds);
      setSubmitNotice(
        scheduledAtIso
          ? "발송이 예약되었습니다. 아래 발송 이력에서 확인하세요."
          : "발송 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요."
      );
      clearSendDraft();
      setIsScheduled(false);
      setScheduledAtLocal("");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "발송 요청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!account) {
    return (
      <Panel title="메시지 작성" description="발송을 시작하려면 계정을 선택하세요.">
        <EmptyState icon={Users2} title="선택된 계정이 없습니다" description="왼쪽 사이드바에서 계정을 선택한 후 메시지를 발송할 수 있습니다." />
      </Panel>
    );
  }

  const canSubmit = !submitting && selectedIds.length > 0 && message.trim().length > 0 && (!isScheduled || !!scheduledAtLocal);

  return (
    <div className="space-y-4 pb-20">
      <Panel
        title="메시지 작성"
        description={`선택된 계정: ${account.name ?? account.phone} · 최대 ${MAX_BROADCAST_RECIPIENTS}명, 계정당 1분에 1회로 제한됩니다.`}
      >
        <form id="send-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-app-text-muted">
                  발송 대상 ({selectedIds.length}/{MAX_BROADCAST_RECIPIENTS})
                </span>
                <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-auto">
                  <option value="default">기본 정렬</option>
                  <option value="members">멤버 많은순</option>
                  <option value="favorites">즐겨찾기 우선</option>
                </Select>
              </div>
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="그룹/채널 이름 검색"
                className="mb-2"
              />
              {selectedIds.length >= MAX_BROADCAST_RECIPIENTS && (
                <p className="mb-2 text-xs text-app-warning">
                  최대 {MAX_BROADCAST_RECIPIENTS}개까지 선택할 수 있습니다. 선택을 해제하려면 이미 선택한 항목을 클릭하세요.
                </p>
              )}

              {groupsLoading && (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              )}
              {groupsError && <p className="text-xs text-app-danger">{groupsError}</p>}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <EmptyState icon={Users2} title="참여 중인 그룹/채널이 없습니다" />
              )}
              {!groupsLoading && visibleGroups.length > 0 && (
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {visibleGroups.map((g) => {
                    const selected = selectedIds.includes(g.id);
                    const disabled = !selected && selectedIds.length >= MAX_BROADCAST_RECIPIENTS;
                    return (
                      <GroupSelectCard
                        key={g.id}
                        group={g}
                        selected={selected}
                        disabled={disabled}
                        isFavorite={isFavorite(g.id)}
                        isRecent={recent.includes(g.id)}
                        tags={tagsByGroup[g.id] ?? []}
                        onToggleSelect={toggleGroup}
                        onToggleFavorite={toggleFavorite}
                        onAddTag={handleAddTag}
                      />
                    );
                  })}
                </div>
              )}
              {!groupsLoading && !groupsError && groups.length > 0 && visibleGroups.length === 0 && (
                <p className="text-xs text-app-text-subtle">검색 결과가 없습니다.</p>
              )}
            </div>

            <Field label="메시지 내용">
              <Textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="발송할 메시지를 입력하세요."
                required
              />
            </Field>

            <Field label="이미지 (선택)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text"
              />
            </Field>

            <div>
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                />
                예약 발송
              </label>
              {isScheduled && (
                <div className="mt-2">
                  <Field label="발송 시각">
                    <input
                      type="datetime-local"
                      value={scheduledAtLocal}
                      onChange={(e) => setScheduledAtLocal(e.target.value)}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)}
                      required={isScheduled}
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2.5 text-xs text-app-danger">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          {submitNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5 text-xs text-app-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitNotice}</span>
            </div>
          )}
        </form>
      </Panel>

      <Panel title="발송 이력" description="이 계정의 최근 발송 작업 목록입니다. 진행 중인 작업은 자동으로 갱신됩니다.">

        {historyLoading && (
          <div className="space-y-1.5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {!historyLoading && history.length > 0 && (() => {
          const sentCount = history.filter((h) => h.status === "sent").length;
          const failedCount = history.filter((h) => h.status === "failed").length;
          const inFlight = history.filter(isBroadcastInFlight).length;
          return (
            <div className="mb-3 flex flex-wrap gap-2">
              {inFlight > 0 && (
                <Badge tone="info">
                  <Clock className="mr-1 inline h-3 w-3" />
                  진행 중 {inFlight}건
                </Badge>
              )}
              {sentCount > 0 && (
                <Badge tone="success">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  완료 {sentCount}건
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge tone="danger">
                  <XCircle className="mr-1 inline h-3 w-3" />
                  실패 {failedCount}건
                </Badge>
              )}
              <Badge tone="neutral">총 {history.length}건</Badge>
            </div>
          );
        })()}

        {!historyLoading && history.length === 0 && (
          <p className="text-xs text-app-text-muted">아직 발송 이력이 없습니다.</p>
        )}
        {history.length > 0 && (
          <div className="divide-y divide-app-border">
            {history.map((h) => {
              const meta = STATUS_TONE[h.status];
              const isFutureSchedule = h.status === "pending" && h.scheduledAt && new Date(`${h.scheduledAt}Z`) > new Date();
              return (
                <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="truncate text-app-text">{h.message}</div>
                    <div className="text-xs text-app-text-subtle">
                      {isFutureSchedule && h.scheduledAt
                        ? `${formatDateTime(h.scheduledAt)} 예약`
                        : formatRelativeTime(h.createdAt)}{" "}
                      · 수신자 {h.recipients.length}명
                      {h.errorMessage && <span className="text-app-danger"> · {h.errorMessage}</span>}
                    </div>
                  </div>
                  <Badge tone={isFutureSchedule ? "info" : meta.tone}>
                    {isFutureSchedule ? "예약됨" : meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <motion.div
        initial={false}
        animate={canSubmit ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="sticky bottom-4 ml-auto flex w-fit"
        style={{ pointerEvents: canSubmit ? "auto" : "none" }}
      >
        <Button
          type="submit"
          form="send-form"
          variant="primary"
          className="rounded-full px-5 py-3 text-sm shadow-lg shadow-app-primary/30"
          disabled={!canSubmit}
        >
          <SendIcon className="h-4 w-4" />
          {submitting ? "처리 중..." : isScheduled ? "예약하기" : "발송"}
        </Button>
      </motion.div>
    </div>
  );
}
