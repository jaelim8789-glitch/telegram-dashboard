"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Ban, ChevronLeft, ChevronRight, Clock, XCircle,
  KeyRound, MessageSquare, RefreshCw, Search, ShieldOff, Smartphone,
  Users,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Account, AccountHealthItem } from "@/types";
import type { DashboardUser } from "@/lib/api";

import { formatDateTime } from "@/lib/formatTime";

function healthTone(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "healthy": return "success";
    case "unknown": return "neutral";
    case "banned":
    case "unauthorized":
    case "error": return "danger";
    case "rate_limited": return "warning";
    default: return "neutral";
  }
}

function healthLabel(status: string): string {
  const labels: Record<string, string> = {
    healthy: "정상",
    unauthorized: "인증 필요",
    banned: "차단",
    rate_limited: "제한",
    error: "오류",
    unknown: "알 수 없음",
    not_configured: "미설정",
  };
  return labels[status] ?? status;
}

const HEALTH_COLOR: Record<string, string> = {
  healthy: "bg-emerald-500",
  unauthorized: "bg-amber-500",
  banned: "bg-rose-500",
  rate_limited: "bg-orange-500",
  error: "bg-red-500",
  unknown: "bg-app-text-subtle",
  not_configured: "bg-app-text-subtle",
};

function StatusDot({ status }: { status: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", HEALTH_COLOR[status] ?? "bg-app-text-subtle")} />;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "banned": return <Ban className="h-3.5 w-3.5" />;
    case "unauthorized": return <ShieldOff className="h-3.5 w-3.5" />;
    case "rate_limited": return <Clock className="h-3.5 w-3.5" />;
    case "error": return <AlertTriangle className="h-3.5 w-3.5" />;
    default: return <Activity className="h-3.5 w-3.5" />;
  }
}

function HealthBadge({ status }: { status: string }) {
  return (
    <Badge tone={healthTone(status)}>
      <StatusDot status={status} />
      <StatusIcon status={status} />
      {healthLabel(status)}
    </Badge>
  );
}

function DeliveryRateMeter({ successCount, total }: { successCount: number; total: number }) {
  const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const segments = [
    { pct: rate, color: "bg-emerald-500" },
    { pct: 100 - rate, color: "bg-app-border" },
  ].filter((s) => s.pct > 0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-app-border">
        {segments.map((s, i) => (
          <div key={`seg-${i}`} className={s.color} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          rate >= 90 ? "text-app-success" : rate >= 70 ? "text-app-warning" : "text-app-danger"
        )}
      >
        {rate}%
      </span>
    </div>
  );
}

function SupportConsoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("userId");

  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [health, setHealth] = useState<AccountHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [reissuedKey, setReissuedKey] = useState<string | null>(null);
  const [confirmReissue, setConfirmReissue] = useState<DashboardUser | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<DashboardUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a, h] = await Promise.all([
        api.fetchUsers(),
        api.fetchAccounts(),
        api.fetchAccountHealth(),
      ]);
      setUsers(u);
      setAccounts(a);
      setHealth(h);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const userAccounts = selectedUser
    ? accounts.filter((a) => a.phone === selectedUser.phone)
    : [];
  const userHealthItems = selectedUser
    ? health.filter((h) => userAccounts.some((a) => a.id === h.accountId))
    : [];
  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.phone.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  });

  function selectUser(userId: string) {
    router.push(`/admin/support?userId=${userId}`);
  }

  function goBack() { router.push("/admin/support"); }

  // ─── Detail View ───────────────────────────────────────────────
  if (selectedUser && !loading) {
    const hasDelivery = userHealthItems.some((h) => h.totalDeliveryAttempts > 0);
    const errorCount = userHealthItems.filter((h) => h.status !== "healthy" && h.status !== "unknown" && h.status !== "not_configured").length;

    return (
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> 목록
            </button>
            <h1 className="text-lg font-semibold text-app-text">고객 상세</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
            >
              <RefreshCw className="h-3 w-3" /> 새로고침
            </button>
          </div>
        </div>

        {/* Customer Identity Card */}
        <div className="relative overflow-hidden rounded-2xl border border-app-border bg-gradient-to-br from-app-card via-app-card to-app-bg p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/5 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-app-text">{selectedUser.phone}</span>
                  <Badge tone={selectedUser.isActive ? "success" : "neutral"}>
                    {selectedUser.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                  <span>가입 {formatDateTime(selectedUser.createdAt)}</span>
                  {selectedUser.lastLogin && <span>· 마지막 로그인 {formatDateTime(selectedUser.lastLogin)}</span>}
                  {userAccounts.length > 0 && <span>· {userAccounts.length}개 계정</span>}
                  {errorCount > 0 && <span className="text-app-danger">· {errorCount}개 문제</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmReissue(selectedUser)}>
                <KeyRound className="h-3.5 w-3.5" /> 키 재발급
              </Button>
              <Button
                variant={selectedUser.isActive ? "danger" : "secondary"}
                size="sm"
                onClick={() => setConfirmToggle(selectedUser)}
              >
                {selectedUser.isActive ? "비활성화" : "활성화"}
              </Button>
            </div>
          </div>
        </div>

        {/* Telegram Accounts */}
        <Panel
          accent={errorCount > 0 ? "rose" : "emerald"}
          title={
            <div className="flex items-center gap-2">
              <MessageSquare className={cn("h-4 w-4", errorCount > 0 ? "text-rose-400" : "text-emerald-400")} />
              Telegram 계정
            </div>
          }
          description={`${userAccounts.length}개 계정 · ${errorCount}개 문제`}
        >
          {userAccounts.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="연결된 계정 없음"
              description="이 사용자가 등록한 Telegram 계정이 없습니다."
            />
          ) : (
            <div className="divide-y divide-app-border">
              {userAccounts.map((a) => {
                const ah = userHealthItems.find((h) => h.accountId === a.id);
                return (
                  <div key={a.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-app-text">{a.name || a.phone}</span>
                        {ah && <HealthBadge status={ah.status} />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                        <span className="font-mono">{a.phone}</span>
                        {ah && ah.hasSession !== undefined && (
                          <span className={ah.hasSession ? "text-app-success" : "text-app-warning"}>
                            · {ah.hasSession ? "세션 활성" : "인증 필요"}
                          </span>
                        )}
                      </div>
                    </div>
                    {ah?.lastError && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-app-danger/10 bg-app-danger-muted px-2.5 py-1.5 text-xs text-app-danger">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[240px]" title={ah.lastError}>
                          {ah.lastError}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Delivery Analytics Summary */}
        {userAccounts.length > 0 && (
          <Panel
            accent={hasDelivery ? "amber" : undefined}
            title={
              <div className="flex items-center gap-2">
                <Activity className={cn("h-4 w-4", hasDelivery ? "text-amber-400" : "text-app-text-muted")} />
                전달 분석 요약
              </div>
            }
            description="최근 7일간 계정별 전달 현황"
          >
            {!hasDelivery ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="mb-2 h-8 w-8 text-app-text-muted" />
                <p className="text-sm text-app-text-muted">전달 기록 없음</p>
                <p className="mt-1 text-xs text-app-text-subtle">최근 7일간 발송 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userHealthItems.filter((h) => h.totalDeliveryAttempts > 0).map((h) => (
                  <div key={h.accountId} className="rounded-xl border border-app-border bg-app-bg p-3 transition-colors hover:bg-app-card-hover">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-app-text">{h.phone}</span>
                      <div className="flex items-center gap-2 text-app-text-muted">
                        <span className="tabular-nums">{h.totalDeliveryAttempts}회 전송</span>
                        <span className="text-app-success tabular-nums">{h.recentSuccessCount}회 성공</span>
                        {h.recentFailureCount > 0 && (
                          <span className="text-app-danger tabular-nums">{h.recentFailureCount}회 실패</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <DeliveryRateMeter successCount={h.recentSuccessCount} total={h.totalDeliveryAttempts} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Reissued key snackbar */}
        {reissuedKey && (
          <Panel
            accent="amber"
            title={
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                재발급된 API 키
              </div>
            }
          >
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.</p>
              <code className="mt-2 block break-all rounded-lg border border-amber-500/10 bg-app-card px-3 py-2 text-sm text-app-text font-mono">
                {reissuedKey}
              </code>
            </div>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setReissuedKey(null)}>
              닫기
            </Button>
          </Panel>
        )}

        <ConfirmDialog
          open={!!confirmReissue}
          title="API 키 재발급"
          description={confirmReissue ? `${confirmReissue.phone} 사용자의 API 키를 재발급하면 기존 키는 즉시 무효화됩니다. 계속할까요?` : ""}
          variant="danger"
          confirmLabel="재발급"
          onConfirm={async () => {
            if (!confirmReissue) return;
            try {
              const key = await api.reissueUserApiKey(confirmReissue.id);
              setReissuedKey(key);
            } catch (err) {
              setError(err instanceof Error ? err.message : "키 재발급 실패");
            } finally { setConfirmReissue(null); }
          }}
          onCancel={() => setConfirmReissue(null)}
        />
        <ConfirmDialog
          open={!!confirmToggle}
          title={confirmToggle?.isActive ? "사용자 비활성화" : "사용자 활성화"}
          description={confirmToggle ? `"${confirmToggle.phone}" 사용자를 ${confirmToggle.isActive ? "비활성화" : "활성화"}하시겠습니까?` : ""}
          variant={confirmToggle?.isActive ? "danger" : "default"}
          confirmLabel={confirmToggle?.isActive ? "비활성화" : "활성화"}
          onConfirm={async () => {
            const u = confirmToggle;
            setConfirmToggle(null);
            if (!u) return;
            try {
              await api.toggleUser(u.id, !u.isActive);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "상태 변경 실패");
            }
          }}
          onCancel={() => setConfirmToggle(null)}
        />
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">고객 지원</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">사용자 상태, 계정, 전달 현황 진단</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-xs text-app-primary-hover hover:underline transition-colors">
            관리자 홈
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> 새로고침
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <p className="text-[11px] text-app-text-subtle">
          마지막 업데이트: {lastRefreshed.toLocaleString("ko-KR", { hour12: false })}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-sm text-app-danger shadow-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-medium underline hover:no-underline transition-colors">재시도</button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="전화번호 또는 ID로 검색..."
          className="w-full rounded-xl border border-app-border bg-app-card py-2.5 pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-subtle transition-all duration-150 focus:border-app-primary focus:outline-none focus:ring-2 focus:ring-app-primary/20 focus:shadow-sm"
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`ad-supp-sk-${i}`} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon={Users} title="등록된 사용자 없음" description="아직 가입한 사용자가 없습니다." />
      )}

      {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
        <EmptyState icon={Search} title="검색 결과 없음" description="일치하는 사용자가 없습니다." />
      )}

      {!loading && (
        <div className="divide-y divide-app-border overflow-hidden rounded-xl border border-app-border bg-app-card shadow-sm">
          {filteredUsers.map((u, idx) => {
            const userAcc = accounts.filter((a) => a.phone === u.phone);
            const userHlth = health.filter((h) => userAcc.some((a) => a.id === h.accountId));
            const unhealthyCount = userHlth.filter(
              (h) => h.status !== "healthy" && h.status !== "unknown" && h.status !== "not_configured"
            ).length;
            return (
              <button
                key={u.id}
                onClick={() => selectUser(u.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm transition-all duration-150 hover:bg-app-card-hover active:bg-app-card-hover/80 group"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-app-text">{u.phone}</span>
                    <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "활성" : "비활성"}</Badge>
                    {unhealthyCount > 0 && (
                      <Badge tone="danger">{unhealthyCount}건 문제</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {userAcc.length}개 계정
                    </span>
                    {u.lastLogin && (
                      <span>· 마지막 로그인 {formatDateTime(u.lastLogin)}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-app-text-muted transition-all duration-150 group-hover:text-app-text group-hover:translate-x-0.5">
                  <span className="text-xs hidden sm:inline">상세</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupportConsolePage() {
  return (
    <AdminGuard requireAdmin>
      <SupportConsoleContent />
    </AdminGuard>
  );
}
