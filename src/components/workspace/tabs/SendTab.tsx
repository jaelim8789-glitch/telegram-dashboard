"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import {
  MAX_BROADCAST_RECIPIENTS,
  isBroadcastInFlight,
  type Broadcast,
  type BroadcastStatus,
  type Group,
} from "@/types";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
};

const POLL_INTERVAL_MS = 3000;

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

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      const result = await api.fetchGroups(accountId);
      setGroups(result);
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

  useEffect(() => {
    setSelectedIds([]);
    setSubmitError(null);
    setSubmitNotice(null);
    if (selectedAccountId) {
      loadGroups(selectedAccountId);
      loadHistory(selectedAccountId);
    } else {
      setGroups([]);
      setHistory([]);
    }
  }, [selectedAccountId]);

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

  function toggleGroup(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_BROADCAST_RECIPIENTS) return prev;
      return [...prev, id];
    });
  }

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
      setSubmitNotice(
        scheduledAtIso
          ? "발송이 예약되었습니다. 아래 발송 이력에서 확인하세요."
          : "발송 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요."
      );
      setMessage("");
      setImageFile(null);
      setSelectedIds([]);
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
      <Panel title="메시지 작성">
        <p className="text-sm text-neutral-500">먼저 사이드바에서 계정을 선택해주세요.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="메시지 작성"
        description={`선택된 계정: ${account.name ?? account.phone} · 최대 ${MAX_BROADCAST_RECIPIENTS}명, 계정당 1분에 1회로 제한됩니다.`}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">
                발송 대상 ({selectedIds.length}/{MAX_BROADCAST_RECIPIENTS})
              </span>
              {groupsLoading && <p className="text-xs text-neutral-500">그룹 목록을 불러오는 중...</p>}
              {groupsError && <p className="text-xs text-red-400">{groupsError}</p>}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <p className="text-xs text-neutral-500">참여 중인 그룹/채널이 없습니다.</p>
              )}
              {groups.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-700 p-2">
                  {groups.map((g) => {
                    const checked = selectedIds.includes(g.id);
                    const disabled = !checked && selectedIds.length >= MAX_BROADCAST_RECIPIENTS;
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${disabled ? "text-neutral-600" : "text-neutral-200 hover:bg-neutral-800/60"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleGroup(g.id)}
                        />
                        <span className="flex-1 truncate">{g.title}</span>
                        {g.participantsCount != null && (
                          <span className="text-xs text-neutral-500">{g.participantsCount}명</span>
                        )}
                      </label>
                    );
                  })}
                </div>
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
                className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-md file:border file:border-neutral-700 file:bg-neutral-800 file:px-2.5 file:py-1.5 file:text-neutral-200"
              />
            </Field>

            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-200">
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
                      className="w-full rounded-md border border-neutral-700 bg-neutral-800/60 px-2.5 py-1.5 text-sm text-neutral-100 outline-none focus:border-sky-500/60"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {submitError && <p className="mt-3 text-xs text-red-400">{submitError}</p>}
          {submitNotice && <p className="mt-3 text-xs text-emerald-400">{submitNotice}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={
                submitting || selectedIds.length === 0 || !message.trim() || (isScheduled && !scheduledAtLocal)
              }
            >
              {submitting ? "처리 중..." : isScheduled ? "예약하기" : "발송"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="발송 이력" description="이 계정의 최근 발송 작업 목록입니다. 진행 중인 작업은 자동으로 갱신됩니다.">
        {historyLoading && <p className="text-xs text-neutral-500">불러오는 중...</p>}
        {!historyLoading && history.length === 0 && (
          <p className="text-xs text-neutral-500">아직 발송 이력이 없습니다.</p>
        )}
        <div className="divide-y divide-neutral-800">
          {history.map((h) => {
            const meta = STATUS_TONE[h.status];
            const isFutureSchedule = h.status === "pending" && h.scheduledAt && new Date(`${h.scheduledAt}Z`) > new Date();
            return (
              <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="truncate text-neutral-300">{h.message}</div>
                  <div className="text-xs text-neutral-600">
                    {isFutureSchedule && h.scheduledAt
                      ? `${formatDateTime(h.scheduledAt)} 예약`
                      : formatRelativeTime(h.createdAt)}{" "}
                    · 수신자 {h.recipients.length}명
                    {h.errorMessage && <span className="text-red-400"> · {h.errorMessage}</span>}
                  </div>
                </div>
                <Badge tone={isFutureSchedule ? "info" : meta.tone}>
                  {isFutureSchedule ? "예약됨" : meta.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
