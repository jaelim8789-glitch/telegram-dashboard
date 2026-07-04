"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AccountCard } from "@/components/sidebar/AccountCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);
  const removeAccount = useDashboardStore((s) => s.removeAccount);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await removeAccount(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "계정 삭제에 실패했습니다.");
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-app-border bg-app-card/40">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-app-text-subtle">
          계정 목록 ({accounts.length})
        </span>
        <button
          type="button"
          onClick={() => fetchAccounts()}
          className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted transition-colors duration-150 hover:bg-app-card-hover hover:text-app-text"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", accountsLoading && "animate-spin")} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {accountsError && (
          <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2 text-xs text-app-danger">
            {accountsError}
          </div>
        )}
        {deleteError && (
          <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2 text-xs text-app-danger">
            {deleteError}
          </div>
        )}
        {!accountsError && accountsLoading && accounts.length === 0 && (
          <div className="space-y-1.5 px-1 py-1">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {!accountsLoading && !accountsError && accounts.length === 0 && (
          <EmptyState icon={Users} title="등록된 계정이 없습니다" description="계정 등록 탭에서 첫 계정을 추가해보세요." />
        )}
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            selected={account.id === selectedAccountId}
            onSelect={selectAccount}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="border-t border-app-border px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-app-text-subtle">
          계정에 마우스를 올리면 삭제 버튼이 나타납니다. 삭제 후에는 같은 전화번호로 다시 등록할 수 있습니다.
        </p>
      </div>
    </aside>
  );
}
