"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Clock, Plug, RefreshCw, Search, ShieldAlert, Users, WifiOff, X } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AccountCard } from "@/components/sidebar/AccountCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useAccountFavorites } from "@/lib/accountLabels";
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
  const [searchQuery, setSearchQuery] = useState("");
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const { isFavorite, toggleFavorite } = useAccountFavorites();

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

  // 30s background polling — uses a tick counter to survive API failures
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (accounts.length === 0) return;
    bgPollTimer.current = setTimeout(() => {
      loadHealth();
      setPollTick((t) => t + 1);
    }, BACKGROUND_POLL_INTERVAL_MS);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
  }, [pollTick, accounts]);

  const healthByAccountId = useMemo(() => {
    const map: Record<string, AccountHealthItem> = {};
    for (const h of healthItems) map[h.accountId] = h;
    return map;
  }, [healthItems]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    // Apply health filter
    let filtered = healthFilter === "all" ? [...accounts] : accounts.filter((a) => {
      const health = healthByAccountId[a.id];
      return health?.status === healthFilter;
    });
    // Apply search filter (by name or phone)
    if (query) {
      filtered = filtered.filter((a) => {
        const name = (a.name ?? "").toLowerCase();
        const phone = a.phone.toLowerCase();
        return name.includes(query) || phone.includes(query);
      });
    }
    // Sort: favorites first
    filtered.sort((a, b) => {
      const aFav = isFavorite(a.id) ? 1 : 0;
      const bFav = isFavorite(b.id) ? 1 : 0;
      return bFav - aFav;
    });
    return filtered;
  }, [accounts, healthByAccountId, healthFilter, searchQuery, isFavorite]);

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
    <aside className="dashboard-sidebar flex w-64 shrink-0 flex-col">
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

      {/* Search bar */}
      {accounts.length > 0 && (
        <div className="relative border-b border-app-border px-3 py-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="계정 이름 또는 전화번호 검색"
            className="w-full rounded-xl border border-app-border bg-app-card py-2 pl-7 pr-7 text-xs text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-app-text-subtle hover:bg-app-card-hover hover:text-app-text transition-colors"
              title="검색 지우기">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

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
                  "focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
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
        {accountsError && <InlineError>{accountsError}</InlineError>}
        {deleteError && <InlineError>{deleteError}</InlineError>}
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
              isFavorite={isFavorite(account.id)}
              onSelect={selectAccount}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
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