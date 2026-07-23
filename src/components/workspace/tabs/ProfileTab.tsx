"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock,
  Key, MessageSquare, RefreshCw, Send, Shield, Smartphone, User, XCircle,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { getAccountDisplayName, getAccountInitials } from "@/types";
import { formatRelativeTime } from "@/lib/formatTime";
import { backupData, restoreData } from "@/lib/exportUtils";
import type { Account, Broadcast } from "@/types";

export function ProfileTab() {
  const { toast } = useToast();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);
  const account = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // Auth session info
  const [authMe, setAuthMe] = useState<api.AuthMe | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile editing
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Activity timeline
  const [activityTimeline, setActivityTimeline] = useState<Broadcast[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (!account?.id) { setActivityTimeline([]); return; }
    let cancelled = false;
    setTimelineLoading(true);
    api.fetchLogs({ accountId: account.id })
      .then((logs) => { if (!cancelled) setActivityTimeline(logs.slice(0, 20)); })
      .catch(() => { if (!cancelled) setActivityTimeline([]); })
      .finally(() => { if (!cancelled) setTimelineLoading(false); });
    return () => { cancelled = true; };
  }, [account?.id]);

  const recentActivity = useMemo(() => {
    return activityTimeline.filter((b) => b.status !== "pending").slice(0, 10);
  }, [activityTimeline]);

  // Confirm dialogs
  const [resetSessionOpen, setResetSessionOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [resetSessionAccountId, setResetSessionAccountId] = useState<string | null>(null);
  const [deactivateAccountId, setDeactivateAccountId] = useState<string | null>(null);

  // Fetch auth info on mount
  useEffect(() => {
    let cancelled = false;
    setAuthLoading(true);
    setAuthError(null);
    api
      .fetchAuthMe()
      .then((me) => {
        if (!cancelled) {
          setAuthMe(me);
          setAuthLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAuthError(err instanceof Error ? err.message : "인증 정보를 불러오지 못했습니다.");
          setAuthLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync editName when selected account changes
  useEffect(() => {
    if (account) {
      setEditName(getAccountDisplayName(account));
      setDirty(false);
    }
  }, [account?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameChange = useCallback(
    (value: string) => {
      setEditName(value);
      setDirty(value !== (account ? getAccountDisplayName(account) : ""));
      setSaveError(null);
    },
    [account]
  );

  const handleSave = useCallback(async () => {
    if (!account || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.request<{ id: string; name: string | null }>(`/api/accounts/${account.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() || null }),
      });
      await fetchAccounts();
      setDirty(false);
      toast("success", "프로필이 저장되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      setSaveError(msg);
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  }, [account, dirty, editName, fetchAccounts, toast]);

  const handleCancel = useCallback(() => {
    if (account) {
      setEditName(getAccountDisplayName(account));
      setDirty(false);
      setSaveError(null);
    }
  }, [account]);

  // Reset session
  const handleResetSession = useCallback(async () => {
    if (!resetSessionAccountId) return;
    try {
      await api.request<{ total_processed: number; total_failed: number }>("/api/accounts/bulk", {
        method: "POST",
        body: JSON.stringify({ account_ids: [resetSessionAccountId], action: "reset_session" }),
      });
      await fetchAccounts();
      toast("success", "세션이 초기화되었습니다. 계정이 다시 로그인해야 합니다.");
      setResetSessionOpen(false);
      setResetSessionAccountId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "세션 초기화에 실패했습니다.";
      toast("error", msg);
    }
  }, [resetSessionAccountId, fetchAccounts, toast]);

  // Deactivate account
  const handleDeactivate = useCallback(async () => {
    if (!deactivateAccountId) return;
    try {
      await api.request<{ total_processed: number; total_failed: number }>("/api/accounts/bulk", {
        method: "POST",
        body: JSON.stringify({ account_ids: [deactivateAccountId], action: "deactivate" }),
      });
      await fetchAccounts();
      toast("success", "계정이 비활성화되었습니다. 더 이상 메시지를 보낼 수 없습니다.");
      setDeactivateOpen(false);
      setDeactivateAccountId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "비활성화에 실패했습니다.";
      toast("error", msg);
    }
  }, [deactivateAccountId, fetchAccounts, toast]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await api.request<{ message: string }>("/api/users/me", { method: "DELETE" });
      import("@/lib/auth").then(({ clearAll }) => clearAll());
      toast("success", "계정이 삭제되었습니다.");
      setDeleteAccountOpen(false);
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "계정 삭제에 실패했습니다.";
      toast("error", msg);
    }
  }, [toast]);

  const triggerDeactivate = useCallback((acc: Account) => {
    setDeactivateAccountId(acc.id);
    setDeactivateOpen(true);
  }, []);

  const triggerResetSession = useCallback((acc: Account) => {
    setResetSessionAccountId(acc.id);
    setResetSessionOpen(true);
  }, []);

  // ── Empty state ──
  if (!account) {
    return (
      <Panel title="프로필 및 설정" description="계정 설정과 보안 관리">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-app-border px-6 py-12 text-center">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-app-card-hover text-app-text-subtle"
          >
            <User className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-app-text">선택된 계정이 없습니다</p>
          <p className="text-xs text-app-text-muted">
            먼저 &ldquo;계정 등록&rdquo; 탭에서 계정을 추가하고 선택해주세요.
          </p>
        </div>
      </Panel>
    );
  }

  const initials = getAccountInitials(account);
  const displayName = getAccountDisplayName(account);
  const isActive = account.status === "active";

  return (
    <div className="space-y-6">
      {/* ── Profile Information ── */}
      <Panel title="프로필 정보" description={displayName}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 self-center sm:self-start">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-app-card-hover text-xl font-semibold text-app-text ring-2 ring-app-border">
              {initials}
            </div>
          </div>

          {/* Editable fields */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="계정 이름" hint="TeleMon에 표시될 이름">
                <Input
                  value={editName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={account.phone}
                  maxLength={100}
                />
              </Field>
              <Field label="전화번호">
                <Input value={account.phone} disabled className="text-app-text-muted" />
              </Field>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isActive ? "success" : "neutral"}>
                {isActive ? "활성" : "비활성"}
              </Badge>
              {account.autoReplyEnabled && <Badge tone="info">자동응답 켜짐</Badge>}
              {account.lastActivity && (
                <span className="flex items-center gap-1 text-[11px] text-app-text-subtle">
                  <Clock className="h-3 w-3" />
                  마지막 활동: {new Date(account.lastActivity).toLocaleDateString("ko-KR")}
                </span>
              )}
            </div>

            {/* Save/Cancel */}
            <div className="flex items-center gap-2 border-t border-app-border pt-4">
              {saveError && <p className="flex-1 text-xs text-app-danger">{saveError}</p>}
              <div className="ml-auto flex gap-2">
                {dirty && (
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                    취소
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  loading={saving}
                  disabled={!dirty}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Session & Authentication ── */}
      <Panel title="세션 및 인증" description="로그인 상태와 인증 정보">
        {authLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : authError ? (
          <InlineError title="인증 정보를 불러올 수 없습니다">{authError}</InlineError>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card-hover/50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-primary-muted text-app-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-app-text-muted">인증 방식</p>
                  <p className="text-sm font-medium text-app-text">
                    {authMe?.role === "admin"
                      ? "관리자"
                      : authMe?.role === "api_key"
                        ? "API 키"
                        : "사용자"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card-hover/50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-info-muted text-app-info">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-app-text-muted">연결된 전화번호</p>
                  <p className="text-sm font-medium text-app-text">{authMe?.phone ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card-hover/50 px-4 py-3 sm:col-span-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-warning-muted text-app-warning">
                  <Key className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-app-text-muted">API 키 상태</p>
                  <p className="text-sm font-medium text-app-text">
                    API 키는 발급 시 한 번만 표시되며, 다시 확인할 수 없습니다.
                  </p>
                  <p className="mt-1 text-[11px] text-app-text-subtle">
                    키를 분실한 경우 관리자에게 재발급을 요청하세요.
                  </p>
                </div>
              </div>
            </div>

            {account.lastActivity && (
              <div className="flex items-center gap-2 rounded-lg bg-app-card-hover/30 px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-app-text-subtle" aria-hidden="true" />
                <span className="text-xs text-app-text-muted">
                  계정 마지막 활동: {new Date(account.lastActivity).toLocaleString("ko-KR")}
                </span>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ── Activity Timeline ── */}
      <Panel
        title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" aria-hidden="true" /> 최근 활동</div>}
        description={account.id && activityTimeline.length > 0 ? `최근 ${recentActivity.length}건` : undefined}
      >
        {timelineLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`prof-sk-${i}`} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyState icon={Activity} title="최근 활동 없음" description="이 계정의 활동 기록이 아직 없습니다." />
        ) : (
          <div className="relative space-y-0">
            {/* Timeline vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-app-border" aria-hidden="true" />

            <div className="space-y-3">
              {recentActivity.map((b, idx) => {
                const isSent = b.status === "sent";
                const isFailed = b.status === "failed";
                const isSending = b.status === "sending";
                const Icon = isSent ? CheckCircle2 : isFailed ? XCircle : isSending ? RefreshCw : Send;
                const iconColor = isSent ? "text-app-success" : isFailed ? "text-app-danger" : isSending ? "text-app-info" : "text-app-text-subtle";
                const bgColor = isSent ? "bg-app-success-muted" : isFailed ? "bg-app-danger-muted" : isSending ? "bg-app-info-muted" : "bg-app-card-hover";
                return (
                  <div key={b.id} className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-app-bg",
                      bgColor
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", iconColor, isSending && "animate-spin")} aria-hidden="true" />
                    </div>

                    {/* Content card */}
                    <div className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-card/60 px-3 py-2.5 transition-colors hover:bg-app-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-app-text">
                            {b.message || "(내용 없음)"}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-app-text-muted">
                            <span className="inline-flex items-center gap-0.5">
                              <MessageSquare className="h-2.5 w-2.5" aria-hidden="true" />
                              {b.recipients.length}명
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                              {formatRelativeTime(b.createdAt)}
                            </span>
                            {b.scheduledAt && (
                              <>
                                <span>·</span>
                                <Badge tone="info" className="text-[9px] px-1 py-0">예약</Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge tone={isSent ? "success" : isFailed ? "danger" : isSending ? "info" : "neutral"} className="shrink-0 text-[10px]">
                          {b.status === "sent" ? "완료" : b.status === "failed" ? "실패" : b.status === "sending" ? "진행" : b.status === "pending" ? "대기" : b.status}
                        </Badge>
                      </div>
                      {b.errorMessage && (
                        <p className="mt-1 text-[10px] text-app-danger line-clamp-1">{b.errorMessage}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* ── Account Security Actions ── */}
      <Panel title="계정 보안" description="세션 및 계정 상태 관리">
        <div className="space-y-3">
          {/* Reset Session */}
          <div className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-card-hover/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-app-warning" aria-hidden="true" />
                <p className="text-sm font-medium text-app-text">세션 초기화</p>
              </div>
              <p className="mt-0.5 text-xs text-app-text-muted">
                계정의 Telegram 세션을 초기화합니다. 다음 메시지 발송 시 재로그인이 필요합니다.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => triggerResetSession(account)}
              className="shrink-0"
            >
              세션 초기화
            </Button>
          </div>

          {/* Deactivate Account */}
          <div className="flex flex-col gap-3 rounded-xl border border-app-danger/20 bg-app-danger-muted/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-app-danger" aria-hidden="true" />
                <p className="text-sm font-medium text-app-text">계정 비활성화</p>
              </div>
              <p className="mt-0.5 text-xs text-app-text-muted">
                계정을 비활성화하면 메시지 발송이 중단됩니다. 다시 활성화할 수 있습니다.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => triggerDeactivate(account)}
              className="shrink-0"
            >
              비활성화
            </Button>
          </div>
        </div>
      </Panel>

      {/* ── Account Deletion ── */}
      {authMe?.role === "user" && (
        <Panel title="계정 삭제" description="모든 데이터가 영구적으로 삭제됩니다">
          <div className="flex flex-col gap-3 rounded-xl border border-app-danger/20 bg-app-danger-muted/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-app-danger" aria-hidden="true" />
                <p className="text-sm font-medium text-app-text">계정 영구 삭제</p>
              </div>
              <p className="mt-0.5 text-xs text-app-text-muted">
                계정을 삭제하면 모든 데이터(계정, API 키, 발송 내역, 메시지 로그 등)가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteAccountOpen(true)}
              className="shrink-0"
            >
              계정 삭제
            </Button>
          </div>
        </Panel>
      )}

      {/* ── Data Backup ── */}
      <Panel title="데이터 백업" description="로컬 저장 데이터를 백업하고 복원합니다">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const count = await backupData("telemon-", "telemon-backup");
              toast("success", `백업 완료 (${count}개 항목)`);
            }}
          >
            백업 다운로드
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const count = await restoreData("telemon-");
              toast("success", `복원 완료 (${count}개 항목)`);
            }}
          >
            복원
          </Button>
          <p className="text-xs text-app-text-subtle">
            텔레그램 계정 데이터, 발송그룹, 템플릿 등이 포함됩니다.
          </p>
        </div>
      </Panel>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={resetSessionOpen}
        title="세션을 초기화할까요?"
        description={`${getAccountDisplayName(account)} 계정의 Telegram 세션이 초기화됩니다. 이 계정으로 메시지를 보내려면 다시 로그인해야 합니다.`}
        confirmLabel="초기화"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleResetSession}
        onCancel={() => {
          setResetSessionOpen(false);
          setResetSessionAccountId(null);
        }}
      />

      <ConfirmDialog
        open={deactivateOpen}
        title="계정을 비활성화할까요?"
        description={`${getAccountDisplayName(account)} 계정이 비활성화됩니다. 메시지 발송이 중단되며, 다시 활성화하려면 계정 목록에서 재활성화할 수 있습니다.`}
        confirmLabel="비활성화"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => {
          setDeactivateOpen(false);
          setDeactivateAccountId(null);
        }}
      />

      <ConfirmDialog
        open={deleteAccountOpen}
        title="계정을 삭제할까요?"
        description="정말로 계정을 삭제하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다."
        confirmLabel="계정 삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountOpen(false)}
      />
    </div>
  );
}