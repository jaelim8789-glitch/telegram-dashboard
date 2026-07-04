"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(user: DashboardUser) {
    try {
      await api.toggleUser(user.id, !user.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
    }
  }

  async function handleReissue(user: DashboardUser) {
    if (!window.confirm(`${user.phone} 사용자의 API 키를 재발급하면 기존 키는 즉시 무효화됩니다. 계속할까요?`)) return;
    try {
      const key = await api.reissueUserApiKey(user.id);
      setReissuedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API 키 재발급에 실패했습니다.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-app-text">사용자 관리</h1>
        <Link href="/admin/dashboard" className="text-xs text-app-primary-hover hover:underline">
          관리자 홈으로
        </Link>
      </div>

      {reissuedKey && (
        <Panel title="재발급된 API 키">
          <p className="text-xs text-app-success">지금만 전체가 표시됩니다. 안전한 곳에 복사해두세요.</p>
          <code className="mt-1 block break-all text-sm text-app-text">{reissuedKey}</code>
          <Button variant="ghost" className="mt-2 text-xs" onClick={() => setReissuedKey(null)}>
            닫기
          </Button>
        </Panel>
      )}

      <Panel title="전화번호 인증 사용자" description="본인 전화번호를 인증해 API 키를 발급받은 사용자 목록입니다.">
        {loading && <p className="text-xs text-app-text-muted">불러오는 중...</p>}
        {error && <p className="text-xs text-app-danger">{error}</p>}
        {!loading && !error && users.length === 0 && (
          <p className="text-xs text-app-text-muted">가입한 사용자가 없습니다.</p>
        )}
        <div className="divide-y divide-app-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-app-text">{u.phone}</span>
                  <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "활성" : "비활성"}</Badge>
                </div>
                <div className="text-xs text-app-text-subtle">
                  가입 {formatDateTime(u.createdAt)}
                  {u.lastLogin && <> · 마지막 로그인 {formatDateTime(u.lastLogin)}</>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" className="text-xs" onClick={() => handleReissue(u)}>
                  키 재발급
                </Button>
                <Button
                  variant={u.isActive ? "danger" : "secondary"}
                  className="px-2 py-1 text-xs"
                  onClick={() => handleToggle(u)}
                >
                  {u.isActive ? "비활성화" : "활성화"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
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
