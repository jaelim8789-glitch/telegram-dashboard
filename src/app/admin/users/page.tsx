"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, RefreshCw, Smartphone, UserCheck, UserX, Users, XCircle } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineError } from "@/components/ui/InlineError";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { DashboardUser } from "@/lib/api";

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

function UsersContent() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reissuedKey, setReissuedKey] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<DashboardUser | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DashboardUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(user: DashboardUser) {
    try {
      await api.toggleUser(user.id, !user.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
    }
  }

  async function handleReissue(user: DashboardUser) { setConfirmUser(user); }

  async function handleConfirmReissue() {
    if (!confirmUser) return;
    try {
      const key = await api.reissueUserApiKey(confirmUser.id);
      setReissuedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 재발급에 실패했습니다.");
    } finally { setConfirmUser(null); }
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">사용자 관리</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">
            {users.length}명 중 {activeCount}명 활성
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 text-xs text-app-primary-hover hover:underline transition-colors">
            <ChevronLeft className="h-3 w-3" /> 관리자 홈
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

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-text tabular-nums">{users.length}</div>
          <div className="text-xs text-app-text-muted mt-0.5">전체</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-success tabular-nums">{activeCount}</div>
          <div className="text-xs text-app-text-muted mt-0.5">활성</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong">
          <div className="text-2xl font-bold text-app-danger tabular-nums">{users.length - activeCount}</div>
          <div className="text-xs text-app-text-muted mt-0.5">비활성</div>
        </div>
      </div>

      {/* Reissued key dialog */}
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

      {/* User list */}
      <Panel
        accent="cyan"
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            전화번호 인증 사용자
          </div>
        }
        description="본인 전화번호를 인증해 API 키를 발급받은 사용자입니다."
      >
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-app-card-hover" />
            ))}
          </div>
        )}
        {error && <InlineError>{error}</InlineError>}
        {!loading && !error && users.length === 0 && (
          <EmptyState icon={Users} title="가입한 사용자 없음" />
        )}
        <div className="divide-y divide-app-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-app-card-hover -mx-4 px-4 first:rounded-t-lg last:rounded-b-lg">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-app-text-muted shrink-0" />
                  <span className="font-medium text-app-text">{u.phone}</span>
                  <Badge tone={u.isActive ? "success" : "neutral"}>
                    {u.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-app-text-subtle">
                  <span>가입 {formatDateTime(u.createdAt)}</span>
                  {u.lastLogin && (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      마지막 로그인 {formatDateTime(u.lastLogin)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleReissue(u)}>
                  <KeyRound className="h-3 w-3" /> 키 재발급
                </Button>
                <Button
                  variant={u.isActive ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => setToggleConfirm(u)}
                >
                  {u.isActive ? "비활성화" : "활성화"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <ConfirmDialog
        open={!!confirmUser}
        title="API 키 재발급"
        description={confirmUser ? `${confirmUser.phone} 사용자의 API 키를 재발급하면 기존 키는 즉시 무효화됩니다. 계속할까요?` : ""}
        variant="danger"
        confirmLabel="재발급"
        onConfirm={handleConfirmReissue}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={!!toggleConfirm}
        title={toggleConfirm?.isActive ? "사용자 비활성화" : "사용자 활성화"}
        description={toggleConfirm ? `"${toggleConfirm.phone}" 사용자를 ${toggleConfirm.isActive ? "비활성화" : "활성화"}하시겠습니까?` : ""}
        variant={toggleConfirm?.isActive ? "danger" : "default"}
        confirmLabel={toggleConfirm?.isActive ? "비활성화" : "활성화"}
        onConfirm={() => { const u = toggleConfirm; setToggleConfirm(null); if (u) handleToggle(u); }}
        onCancel={() => setToggleConfirm(null)}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminGuard requireAdmin>
      <UsersContent />
    </AdminGuard>
  );
}