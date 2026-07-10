"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, KeyRound, RefreshCw, Users, XCircle } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { clearToken } from "@/lib/auth";
import * as api from "@/lib/api";

function AdminDashboardContent() {
  const router = useRouter();

  const [users, setUsers] = useState<api.DashboardUser[]>([]);
  const [keys, setKeys] = useState<api.ApiKey[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoadingUsers(true);
    try {
      const [u, k] = await Promise.all([api.fetchUsers(), api.fetchApiKeys()]);
      setUsers(u);
      setKeys(k);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-app-text">관리자</h1>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-xs text-app-primary-hover hover:underline">
            사용자 대시보드
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
          <Button variant="ghost" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2.5 text-xs text-app-danger">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              시스템 현황
            </div>
          }
        >
          {loadingUsers ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">전체 사용자</span>
                <span className="font-semibold tabular-nums">{users.length}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">활성 사용자</span>
                <span className="font-semibold tabular-nums text-app-success">{users.filter((u) => u.isActive).length}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">API 키</span>
                <span className="font-semibold tabular-nums">{keys.length}</span>
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title={
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                API 키 관리
              </div>
            }
            description="외부 연동용 키 발급·삭제"
          >
            <Link href="/admin/api-keys">
              <Button variant="primary" className="w-full">API 키 관리</Button>
            </Link>
          </Panel>

          <Panel
            title={
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                사용자 관리
              </div>
            }
            description="전화번호 인증 사용자 관리"
          >
            <Link href="/admin/users">
              <Button variant="primary" className="w-full">사용자 관리</Button>
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard requireAdmin>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
