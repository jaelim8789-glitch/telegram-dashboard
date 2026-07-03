"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { clearToken } from "@/lib/auth";

function AdminDashboardContent() {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">관리자</h1>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-sky-400 hover:underline">
            대시보드로 돌아가기
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </div>

      <Panel title="API 키 관리" description="외부 프로그램/스크립트가 X-API-Key로 사용할 키를 발급·조회·삭제합니다.">
        <Link href="/admin/api-keys">
          <Button variant="primary">API 키 관리로 이동</Button>
        </Link>
      </Panel>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
