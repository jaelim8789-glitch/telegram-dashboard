"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, HeadphonesIcon, KeyRound, LogOut, RefreshCw,
  Shield, Users, XCircle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { clearToken } from "@/lib/auth";
import * as api from "@/lib/api";

function AdminDashboardContent() {
  const router = useRouter();

  const [users, setUsers] = useState<api.DashboardUser[]>([]);
  const [keys, setKeys] = useState<api.ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [u, k] = await Promise.all([api.fetchUsers(), api.fetchApiKeys()]);
      setUsers(u);
      setKeys(k);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  const activeUsers = users.filter((u) => u.isActive);
  const activeKeys = keys.filter((k) => k.isActive ?? true);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">관리자</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">TeleMon 운영 콘솔</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-xs text-app-primary-hover hover:underline transition-colors">
            사용자 대시보드
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text"
          >
            <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            새로고침
          </button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> 로그아웃
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-sm text-app-danger shadow-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="font-medium underline hover:no-underline transition-colors">
            재시도
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="전체 사용자"
              value={users.length}
              accent="indigo"
            />
            <StatCard
              icon={<Activity className="h-5 w-5" />}
              label="활성 사용자"
              value={activeUsers.length}
              sub={`${users.length > 0 ? Math.round((activeUsers.length / users.length) * 100) : 0}%`}
              trend={activeUsers.length > 0 ? "up" : "neutral"}
              accent="emerald"
            />
            <StatCard
              icon={<KeyRound className="h-5 w-5" />}
              label="API 키"
              value={keys.length}
              accent="violet"
            />
            <StatCard
              icon={<Shield className="h-5 w-5" />}
              label="비활성 사용자"
              value={users.length - activeUsers.length}
              accent="rose"
            />
          </>
        )}
      </div>

      {/* Quick actions + system info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel
          accent="indigo"
          title={
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              API 키 관리
            </div>
          }
          description="외부 연동용 키 발급·삭제"
          action={<span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">{activeKeys.length}개 활성</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>외부 프로그램 또는 스크립트에서 사용할 X-API-Key를 관리합니다.</p>
            <Link href="/admin/api-keys">
              <Button variant="primary" className="w-full">API 키 관리</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="cyan"
          title={
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              사용자 관리
            </div>
          }
          description="전화번호 인증 사용자 관리"
          action={<span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-400">{users.length}명</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>전화번호 인증으로 가입한 일반 사용자의 활성화 상태를 관리합니다.</p>
            <Link href="/admin/users">
              <Button variant="primary" className="w-full">사용자 관리</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="amber"
          title={
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="h-4 w-4 text-amber-400" />
              고객 지원
            </div>
          }
          description="사용자 상태·계정·전달 현황 진단"
          action={
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              새 기능
            </span>
          }
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>사용자별 Telegram 계정 상태, 전달 분석, 계정 건강 상태를 진단합니다.</p>
            <Link href="/admin/support">
              <Button variant="primary" className="w-full">고객 지원 콘솔</Button>
            </Link>
          </div>
        </Panel>
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
