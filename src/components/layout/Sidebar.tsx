"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Clock, Plug, RefreshCw, ShieldAlert, Users, WifiOff } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AccountCard } from "@/components/sidebar/AccountCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { AccountHealthItem, AccountHealthState } from "@/types";

const HEALTH_FILTERS: { key: AccountHealthState | "all"; label: string; icon: typeof Ban | null }[] = [
  { key: "all", label: "전체", icon: null },
  { key: "healthy", label: "정상", icon: null },
  { key: "unauthorized", label: "세션 만료", icon: Plug },
  { key: "rate_limited", label: "제한됨", icon: Clock },
  { key: "error", label: "오류", icon: ShieldAlert },
  { key: "not_configured", label: "미설정", icon: WifiOff },
  { key: "banned", label: "차단", icon: Ban },
];

const BACKGROUND_POLL_INTERVAL_MS = 30000;

export function Sidebar() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);
  const removeAccount = useDashboardStore((s) => s.removeAccount);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [healthItems, setHealthItems] = useState<AccountHealthItem[]>([]);
  const [healthFilter, setHealthFilter] = useState<AccountHealthState | "all">("all");
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadHealth() {
    try {
      setHealthItems(await api.fetchAccountHealth());
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length === 0) { setHealthItems([]); return; }
    loadHealth();
  }, [accounts]);

  // 30s background polling
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (accounts.length === 0) return;
    bgPollTimer.current = setTimeout(loadHealth, BACKGROUND_POLL_INTERVAL_MS);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
  }, [healthItems, accounts]);

  const healthByAccountId = useMemo(() => {
    const map: Record<string, AccountHealthItem> = {};
    for (const h of healthItems) map[h.accountId] = h;
    return map;
  }, [healthItems]);

  const filteredAccounts = useMemo(() => {
    if (healthFilter === "all") return accounts;
    return accounts.filter((a) => {
      const health = healthByAccountId[a.id];
      return health?.status === healthFilter;
    });
  }, [accounts, healthByAccountId, healthFilter]);

  const healthCounts = useMemo(() => {
    const counts: Record<string, number> = { all: accounts.length };
    for (const a of accounts) {
      const h = healthByAccountId[a.id];
      const key = h?.status ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [accounts, healthByAccountId]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    try { await removeAccount(id); }
    catch (err) { setDeleteError(err instanceof Error ? err.message : "삭제 실패"); }
  }

  return (
    <aside className="dashboard-sidebar flex w-64 shrink-0 flex-col hide-mobile">
      <div className="flex items-center justify-between border-b border-app-border px-4 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">
          계정 <span className="text-app-primary">{accounts.length}</span>
        </span>
        <button
          onClick={() => { fetchAccounts(); loadHealth(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${accountsLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-app-border px-3 py-2">
          {HEALTH_FILTERS.map((f) => {
            const count = healthCounts[f.key] ?? 0;
            if (f.key !== "all" && count === 0) return null;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setHealthFilter(f.key)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  healthFilter === f.key
                    ? "bg-app-primary text-white"
                    : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {f.label}
                <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {accountsError && (
          <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-xs text-app-danger">
            {accountsError}
          </div>
        )}
        {deleteError && (
          <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-3 text-xs text-app-danger">
            {deleteError}
          </div>
        )}
        {!accountsError && accountsLoading && accounts.length === 0 && (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        )}
        {!accountsLoading && !accountsError && accounts.length === 0 && (
          <EmptyState icon={Users} title="계정 없음" description="계정 등록 탭에서 추가하세요." />
        )}
        {filteredAccounts.length === 0 && accounts.length > 0 && (
          <p className="py-6 text-center text-xs text-app-text-subtle">조건에 맞는 계정이 없습니다.</p>
        )}
        {filteredAccounts.map((account) => {
          const health = healthByAccountId[account.id];
          return (
            <AccountCard
              key={account.id}
              account={account}
              selected={account.id === selectedAccountId}
              health={health?.status}
              lastError={health?.lastError}
              onSelect={selectAccount}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      <div className="border-t border-app-border px-4 py-3">
        <p className="text-[11px] text-app-text-muted">계정에 마우스를 올리면 삭제 가능</p>
      </div>
    </aside>
  );
}
