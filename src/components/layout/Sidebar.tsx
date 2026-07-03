"use client";

import { useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AccountCard } from "@/components/sidebar/AccountCard";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          계정 목록 ({accounts.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fetchAccounts()}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", accountsLoading && "animate-spin")} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {accountsError && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {accountsError}
          </div>
        )}
        {!accountsError && accountsLoading && accounts.length === 0 && (
          <div className="px-1 py-2 text-xs text-neutral-500">불러오는 중...</div>
        )}
        {!accountsLoading && !accountsError && accounts.length === 0 && (
          <div className="px-1 py-2 text-xs text-neutral-500">등록된 계정이 없습니다.</div>
        )}
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            selected={account.id === selectedAccountId}
            onSelect={selectAccount}
          />
        ))}
      </div>

      <div className="border-t border-neutral-800 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-neutral-600">
          계정 목록은 백엔드 API에서 실시간으로 불러옵니다. 텔레그램 세션 연동은 아직 구현되지 않았습니다.
        </p>
      </div>
    </aside>
  );
}
