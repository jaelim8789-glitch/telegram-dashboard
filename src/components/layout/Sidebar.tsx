"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckSquare, Clock, Layers, Plug, RefreshCw, Search, Settings, ShieldAlert, Square, UserPlus, Users, WifiOff, X } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AccountCard } from "@/components/sidebar/AccountCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useAccountFavorites } from "@/lib/accountLabels";
import { useAccountGroups } from "@/lib/accountGroups";
import { GroupManagementModal } from "@/components/sidebar/GroupManagementModal";
import * as api from "@/lib/api";
import { RuntimeManager } from "@/lib/runtimeManager";
import { useToast } from "@/components/ui/Toast";
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
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("telemon-sidebar-recent-searches") || "[]"); } catch { return []; } });
  const [showRecent, setShowRecent] = useState(false);
  const [groupMgmtOpen, setGroupMgmtOpen] = useState(false);
  const [showDormantBanner, setShowDormantBanner] = useState(false);
  const dormantAccounts = accounts.filter(a => a.status !== "active");

  useEffect(() => {
    if (dormantAccounts.length > 0 && !localStorage.getItem("telemon-dormant-banner-dismissed")) {
      setShowDormantBanner(true);
    }
  }, [dormantAccounts.length]);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const { isFavorite, toggleFavorite } = useAccountFavorites();
  const groups = useAccountGroups();
  const { toast } = useToast();

  // ── Batch selection ──
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);

  const toggleBatchSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearBatchSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
  }, []);

  async function loadHealth() {
    try {
      const manager = RuntimeManager.getInstance();
      const cached = manager.getAllHealth();
      if (cached.length > 0) {
        setHealthItems(cached);
      } else {
        setHealthItems(await api.fetchAccountHealth());
      }
    } catch {
      // Health poll failures are non-fatal — keep showing the last known state
    }
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
    // Apply group filter
    if (groupFilter) {
      const groupAccountIds = new Set(groups.find((g) => g.id === groupFilter)?.accountIds ?? []);
      filtered = filtered.filter((a) => groupAccountIds.has(a.id));
    }
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
  }, [accounts, healthByAccountId, healthFilter, groupFilter, groups, searchQuery, isFavorite]);

  const healthCounts = useMemo(() => {
    const counts: Record<string, number> = { all: accounts.length };
    for (const a of accounts) {
      const h = healthByAccountId[a.id];
      const key = h?.status ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [accounts, healthByAccountId]);

  // ── Batch selection callbacks (defined after filteredAccounts) ──
  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredAccounts.map((a) => a.id)));
  }, [filteredAccounts]);

  const handleBatchEnable = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchUpdating(true);
    try {
      await api.batchUpdateAccountStatus(Array.from(selectedIds), "active");
      toast("success", `${selectedIds.size}개 계정이 활성화되었습니다.`);
      await fetchAccounts();
      exitBatchMode();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "일괄 활성화에 실패했습니다.");
    } finally {
      setBatchUpdating(false);
    }
  }, [selectedIds, fetchAccounts, exitBatchMode, toast]);

  const handleBatchDisable = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchUpdating(true);
    try {
      await api.batchUpdateAccountStatus(Array.from(selectedIds), "inactive");
      toast("success", `${selectedIds.size}개 계정이 비활성화되었습니다.`);
      await fetchAccounts();
      exitBatchMode();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "일괄 비활성화에 실패했습니다.");
    } finally {
      setBatchUpdating(false);
    }
  }, [selectedIds, fetchAccounts, exitBatchMode, toast]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    try { await removeAccount(id); }
    catch (err) { setDeleteError(err instanceof Error ? err.message : "삭제 실패"); }
  }

  async function handleClearError(id: string) {
    try { await api.clearAccountError(id); await fetchAccounts(); }
    catch { /* icon just stays until next successful refresh */ }
  }

  async function handleResume(id: string) {
    try { await api.resumeAccount(id); toast("success", "계정이 재개되었습니다."); await fetchAccounts(); }
    catch (err) { toast("error", err instanceof Error ? err.message : "재개에 실패했습니다."); }
  }

  return (
    <aside className="dashboard-sidebar flex w-64 shrink-0 flex-col">
      <div className="flex items-center justify-between border-b border-app-border px-4 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">
          계정 목록 (<span className="text-app-primary">{accounts.length}</span>)
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-all",
              batchMode
                ? "bg-app-primary text-white"
                : "text-app-text-muted hover:text-app-text hover:bg-app-card"
            )}
            aria-label="배치 모드 전환"
            title={batchMode ? "일괄 선택 종료" : "일괄 선택 모드"}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() => setGroupMgmtOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
              title="그룹 관리"
              aria-label="그룹 관리"
            >
              <Layers className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { fetchAccounts(); loadHealth(); }}
            aria-label="계정 새로고침"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${accountsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Batch action bar */}
      {batchMode && (
        <div className="flex items-center gap-2 border-b border-app-border bg-app-primary-muted/20 px-3 py-2">
          <button
            type="button"
            onClick={selectAllFiltered}
            className="rounded-lg px-2 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={clearBatchSelection}
            className="rounded-lg px-2 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
          >
            선택 해제
          </button>
          <span className="ml-auto text-[10px] font-medium text-app-text-muted">
            {selectedIds.size}개 선택됨
          </span>
          <button
            type="button"
            onClick={handleBatchEnable}
            disabled={selectedIds.size === 0 || batchUpdating}
            className="rounded-lg bg-app-success/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-app-success transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchUpdating ? "..." : "활성화"}
          </button>
          <button
            type="button"
            onClick={handleBatchDisable}
            disabled={selectedIds.size === 0 || batchUpdating}
            className="rounded-lg bg-app-warning/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-app-warning transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchUpdating ? "..." : "비활성화"}
          </button>
          <button
            type="button"
            onClick={exitBatchMode}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
            title="일괄 모드 종료"
            aria-label="배치 모드 종료"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Search bar */}
      {accounts.length > 0 && (
        <div className="relative border-b border-app-border px-3 py-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-[18px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  const q = searchQuery.trim();
                  setRecentSearches(prev => {
                    const next = [q, ...prev.filter(s => s !== q)].slice(0, 5);
                    try { localStorage.setItem("telemon-sidebar-recent-searches", JSON.stringify(next)); } catch {}
                    return next;
                  });
                }
              }}
              placeholder="계정 이름 또는 전화번호 검색"
              aria-label="계정 검색"
              className="w-full rounded-xl border border-app-border bg-app-card py-2.5 pl-8 pr-8 text-xs text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setRecentSearches([]); try { localStorage.removeItem("telemon-sidebar-recent-searches"); } catch {} }}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-app-text-subtle hover:bg-app-card-hover hover:text-app-text transition-colors"
                title="검색 지우기"
                aria-label="검색 초기화">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showRecent && recentSearches.length > 0 && !searchQuery && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-app-border bg-app-card shadow-lg z-50 py-1">
                {recentSearches.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => setSearchQuery(s)}
                    className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health filter pills */}
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
                onClick={() => { setHealthFilter(f.key); setGroupFilter(null); }}
                className={cn(
                  "focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  healthFilter === f.key && !groupFilter
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

      {/* Group filter pills */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-app-border px-3 py-2">
          {groupFilter && (
            <button
              type="button"
              onClick={() => setGroupFilter(null)}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-app-card-hover text-app-text-muted hover:text-app-text transition-colors"
            >
              <X className="h-3 w-3" />
              전체 그룹
            </button>
          )}
          {groups.map((g) => {
            const count = g.accountIds.length;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => { setGroupFilter(g.id); setHealthFilter("all"); }}
                className={cn(
                  "focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  groupFilter === g.id
                    ? "text-white"
                    : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
                style={groupFilter === g.id ? { backgroundColor: g.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                {g.name}
                <span className="opacity-70">{count}</span>
              </button>
            );
          })}
          {!groupFilter && (
            <button
              type="button"
              onClick={() => setGroupMgmtOpen(true)}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-app-card-hover text-app-text-muted hover:text-app-text transition-colors"
            >
              <Settings className="h-3 w-3" />
              관리
            </button>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-3">
        {showDormantBanner && dormantAccounts.length > 0 && (
          <div className="mx-0 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-amber-700">비활성 계정 {dormantAccounts.length}개</p>
                <p className="text-[10px] text-amber-600/70 mt-0.5">사이드바에서 확인하고 정리하세요</p>
              </div>
              <button onClick={() => { setShowDormantBanner(false); try { localStorage.setItem("telemon-dormant-banner-dismissed", "true"); } catch {} }}
                className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-amber-500 hover:bg-amber-500/10">
                ✕
              </button>
            </div>
          </div>
        )}
        {accountsError && <InlineError>{accountsError}</InlineError>}
        {deleteError && <InlineError>{deleteError}</InlineError>}
        {!accountsError && accountsLoading && accounts.length === 0 && (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        )}
        {!accountsLoading && !accountsError && accounts.length === 0 && (
          <EmptyState
            icon={Users}
            title="계정 없음"
            description="계정 등록 탭에서 Telegram 계정을 추가하세요."
            action={{
              label: "계정 등록",
              icon: UserPlus,
              onClick: () => useDashboardStore.getState().setActiveTab("register"),
            }}
            compact
          />
        )}
        {filteredAccounts.length === 0 && accounts.length > 0 && (
          <p className="py-6 text-center text-xs text-app-text-subtle">조건에 맞는 계정이 없습니다.</p>
        )}
        {filteredAccounts.map((account) => {
          const health = healthByAccountId[account.id];
          const isBatchSelected = selectedIds.has(account.id);
          return (
            <div key={account.id} className="flex items-start gap-1.5">
              {batchMode && (
              <button
                type="button"
                onClick={() => toggleBatchSelection(account.id)}
                className="mt-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors"
                title={isBatchSelected ? "선택 해제" : "선택"}
                aria-label={isBatchSelected ? "선택 해제" : "선택"}
              >
                  {isBatchSelected ? (
                    <CheckSquare className="h-4 w-4 text-app-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-app-text-subtle hover:text-app-text" />
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <AccountCard
                  account={account}
                  selected={account.id === selectedAccountId}
                  health={health?.status}
                  lastError={health?.lastError}
                  isFavorite={isFavorite(account.id)}
                  groupFilter={groupFilter}
                  onSelect={selectAccount}
                  onDelete={handleDelete}
                  onClearError={handleClearError}
                  onToggleFavorite={toggleFavorite}
                  onResume={handleResume}
                />
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="border-t border-app-border px-4 py-3">
          <button
            type="button"
            onClick={() => setGroupMgmtOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-border py-2 text-[11px] font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            계정 그룹 만들기
          </button>
        </div>
      )}

      <div className="border-t border-app-border px-4 py-3">
        <p className="text-[11px] text-app-text-muted">계정에 마우스를 올리면 삭제 가능</p>
      </div>

      <GroupManagementModal open={groupMgmtOpen} onClose={() => setGroupMgmtOpen(false)} />
    </aside>
  );
}
