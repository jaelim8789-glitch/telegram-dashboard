"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Ban, ChevronLeft, Clock, ExternalLink,
  KeyRound, MessageSquare, RefreshCw, Search, ShieldOff,
  Users, XCircle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Account, AccountHealthItem } from "@/types";
import type { DashboardUser } from "@/lib/api";

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "banned": return <Ban className="h-3.5 w-3.5" />;
    case "unauthorized": return <ShieldOff className="h-3.5 w-3.5" />;
    case "rate_limited": return <Clock className="h-3.5 w-3.5" />;
    case "error": return <AlertTriangle className="h-3.5 w-3.5" />;
    default: return <Activity className="h-3.5 w-3.5" />;
  }
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

  function goBack() {
    router.push("/admin/support");
  }

  if (selectedUser && !loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="flex items-center gap-1 text-xs text-app-text-muted hover:text-app-text transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> 목록
            </button>
            <h1 className="text-lg font-semibold text-app-text">고객 상세</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> 새로고침
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-app-border bg-app-card p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-app-text">{selectedUser.phone}</span>
              <Badge tone={selectedUser.isActive ? "success" : "neutral"}>
                {selectedUser.isActive ? "활성" : "비활성"}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-app-text-subtle">
              가입 {formatDateTime(selectedUser.createdAt)}
              {selectedUser.lastLogin && <> · 마지막 로그인 {formatDateTime(selectedUser.lastLogin)}</>}
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

        <Panel
          title={
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Telegram 계정 ({userAccounts.length})
            </div>
          }
          description="계정 상태 및 전달 현황"
        >
          {userAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-app-text-muted" />
              <p className="text-sm text-app-text-muted">연결된 계정 없음</p>
              <p className="text-xs text-app-text-subtle mt-1">
                이 사용자가 등록한 Telegram 계정이 없습니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-app-border">
              {userAccounts.map((a) => {
                const ah = userHealthItems.find((h) => h.accountId === a.id);
                return (
                  <div key={a.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-app-text">{a.name || a.phone}</span>
                        {ah && (
                          <Badge tone={healthTone(ah.status)}>
                            <StatusIcon status={ah.status} />
                            {healthLabel(ah.status)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                        <span>{a.phone}</span>
                        {a.status && <span>· {a.status}</span>}
                        {ah && ah.hasSession && <span>· 세션 있음</span>}
                        {ah && !ah.hasSession && <span>· 인증 필요</span>}
                        {ah && ah.totalDeliveryAttempts > 0 && (
                          <span>· 최근 {ah.totalDeliveryAttempts}회 중 {ah.recentSuccessCount}회 성공</span>
                        )}
                      </div>
                    </div>
                    {ah?.lastError && (
                      <div className="max-w-[180px] truncate text-xs text-app-danger" title={ah.lastError}>
                        {ah.lastError}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {userAccounts.length > 0 && (
          <Panel
            title={
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                전달 분석 요약
              </div>
            }
          >
            {userHealthItems.filter((h) => h.totalDeliveryAttempts > 0).length === 0 ? (
              <p className="text-xs text-app-text-subtle">최근 7일간 전달 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {userHealthItems.filter((h) => h.totalDeliveryAttempts > 0).map((h) => {
                  const rate = h.totalDeliveryAttempts > 0
                    ? Math.round((h.recentSuccessCount / h.totalDeliveryAttempts) * 100)
                    : 0;
                  return (
                    <div key={h.accountId} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2">
                      <span className="text-xs text-app-text">{h.phone}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="tabular-nums text-app-text-muted">{h.totalDeliveryAttempts}회 시도</span>
                        <span className="tabular-nums text-app-success">{h.recentSuccessCount}회 성공</span>
                        {h.recentFailureCount > 0 && (
                          <span className="tabular-nums text-app-danger">{h.recentFailureCount}회 실패</span>
                        )}
                        <Badge tone={rate >= 90 ? "success" : rate >= 70 ? "warning" : "danger"}>
                          {rate}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {reissuedKey && (
          <Panel title="재발급된 API 키">
            <p className="text-xs text-app-success">지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.</p>
            <code className="mt-1 block break-all text-sm text-app-text">{reissuedKey}</code>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setReissuedKey(null)}>
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
            } finally {
              setConfirmReissue(null);
            }
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

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-app-text">고객 지원</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-xs text-app-primary-hover hover:underline">
            관리자 홈
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
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
        <div className="flex items-center gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2.5 text-xs text-app-danger">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="underline hover:no-underline">재시도</button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="전화번호 또는 ID로 검색..."
          className="w-full rounded-xl border border-app-border bg-app-card py-2.5 pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-subtle focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-colors"
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-app-text-muted" />
          <p className="text-sm font-medium text-app-text-muted">등록된 사용자 없음</p>
          <p className="mt-1 text-xs text-app-text-subtle">아직 가입한 사용자가 없습니다.</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-3 h-10 w-10 text-app-text-muted" />
          <p className="text-sm font-medium text-app-text-muted">검색 결과 없음</p>
          <p className="mt-1 text-xs text-app-text-subtle">일치하는 사용자가 없습니다.</p>
        </div>
      )}

      {!loading && (
        <div className="divide-y divide-app-border rounded-xl border border-app-border bg-app-card">
          {filteredUsers.map((u) => {
            const userAcc = accounts.filter((a) => a.phone === u.phone);
            const userHlth = health.filter((h) => userAcc.some((a) => a.id === h.accountId));
            const unhealthyCount = userHlth.filter(
              (h) => h.status !== "healthy" && h.status !== "unknown" && h.status !== "not_configured"
            ).length;
            return (
              <button
                key={u.id}
                onClick={() => selectUser(u.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-app-card-hover"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-app-text">{u.phone}</span>
                    <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "활성" : "비활성"}</Badge>
                    {unhealthyCount > 0 && (
                      <Badge tone="danger">{unhealthyCount}건 문제</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                    <span>{userAcc.length}개 계정</span>
                    {u.lastLogin && <span> · 마지막 로그인 {formatDateTime(u.lastLogin)}</span>}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-app-text-muted" />
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
