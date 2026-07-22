"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban, BarChart3, Bot, CheckSquare, Clock, Layers, LayoutDashboard,
  MessageSquare, Plug, RefreshCw, Search, Send, Settings, ShieldAlert,
  Sparkles, Square, UserPlus, Users, WifiOff, Workflow, X, Zap,
  ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { AccountHealthItem, AccountHealthState, TabId } from "@/types";

const HEALTH_FILTERS: { key: AccountHealthState | "all"; label: string; icon: typeof Ban | null }[] = [
  { key: "all", label: "전체", icon: null },
  { key: "healthy", label: "정상", icon: null },
  { key: "unauthorized", label: "세션 만료", icon: Plug },
  { key: "rate_limited", label: "제한됨", icon: Clock },
  { key: "error", label: "오류", icon: ShieldAlert },
  { key: "not_configured", label: "미설정", icon: WifiOff },
  { key: "banned", label: "차단", icon: Ban },
];

const NAV_ITEMS: { id: TabId | "chat" | "macro" | "analysis" | "ai"; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "group", label: "계정관리", icon: Users, badge: 0 },
  { id: "chat", label: "채팅관리", icon: MessageSquare },
  { id: "send", label: "발송", icon: Send },
  { id: "register", label: "자동응답", icon: Bot },
  { id: "macro", label: "매크로", icon: Workflow },
  { id: "analysis", label: "분석", icon: BarChart3 },
  { id: "ai", label: "AI비서", icon: Sparkles },
  { id: "profile", label: "설정", icon: Settings },
];

const BACKGROUND_POLL_INTERVAL_MS = 30000;

function AnimatedCounter({ to, duration = 500 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (to === 0) { setCount(0); return; }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * to));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export function Sidebar() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);
  const removeAccount = useDashboardStore((s) => s.removeAccount);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
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

  const [collapsed, setCollapsed] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);

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
    }
  }

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length === 0) { setHealthItems([]); return; }
    loadHealth();
  }, [accounts]);

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
    let filtered = healthFilter === "all" ? [...accounts] : accounts.filter((a) => {
      const health = healthByAccountId[a.id];
      return health?.status === healthFilter;
    });
    if (groupFilter) {
      const groupAccountIds = new Set(groups.find((g) => g.id === groupFilter)?.accountIds ?? []);
      filtered = filtered.filter((a) => groupAccountIds.has(a.id));
    }
    if (query) {
      filtered = filtered.filter((a) => {
        const name = (a.name ?? "").toLowerCase();
        const phone = a.phone.toLowerCase();
        return name.includes(query) || phone.includes(query);
      });
    }
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
    setConfirmDeleteId(id);
  }

  function executeDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    setDeleteError(null);
    removeAccount(id).catch((err) => setDeleteError(err instanceof Error ? err.message : "삭제 실패"));
    setConfirmDeleteId(null);
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleClearError(id: string) {
    try { await api.clearAccountError(id); await fetchAccounts(); }
    catch { }
  }

  async function handleResume(id: string) {
    try { await api.resumeAccount(id); toast("success", "계정이 재개되었습니다."); await fetchAccounts(); }
    catch (err) { toast("error", err instanceof Error ? err.message : "재개에 실패했습니다."); }
  }

  function handleNavClick(item: typeof NAV_ITEMS[number]) {
    if (item.id === "chat") {
      navigateToChat();
    } else if (item.id === "macro" || item.id === "analysis" || item.id === "ai") {
      setActiveTab("dashboard" as TabId);
    } else {
      setActiveTab(item.id as TabId);
    }
  }

  function isNavActive(item: typeof NAV_ITEMS[number]): boolean {
    if (item.id === "chat") return false;
    if (item.id === "macro" || item.id === "analysis" || item.id === "ai") return false;
    return activeTab === item.id;
  }

  const updatedNavItems = NAV_ITEMS.map(item => {
    if (item.id === "group") {
      const unhealthyCount = accounts.filter(a => {
        const h = healthByAccountId[a.id];
        return h && h.status !== "healthy";
      }).length;
      return { ...item, badge: unhealthyCount > 0 ? unhealthyCount : undefined };
    }
    return item;
  });

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <aside
      className="dashboard-sidebar relative flex shrink-0 flex-col overflow-hidden"
      style={{ width: sidebarWidth, transition: "width 300ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Logo + version badge */}
      <div className={cn(
        "flex items-center border-b border-app-border px-3 py-3.5",
        collapsed ? "justify-center" : "gap-2.5"
      )}>
        {collapsed ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        ) : (
          <>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              TeleMon
            </span>
            <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400 ml-auto">
              v3.0
            </span>
          </>
        )}
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative border-b border-app-border px-3 py-2.5 overflow-hidden"
          >
            <Search aria-hidden="true" className="pointer-events-none absolute left-[22px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
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
                placeholder="검색..."
                aria-label="계정 검색"
                className="w-full rounded-lg border border-app-border bg-app-card py-1.5 pl-8 pr-16 text-xs text-app-text placeholder:text-app-text-muted outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-app-text-muted">
                <span className="text-[9px]">⌘</span>K
              </div>
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setRecentSearches([]); try { localStorage.removeItem("telemon-sidebar-recent-searches"); } catch {} }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-app-text-subtle hover:bg-app-card-hover hover:text-app-text transition-colors"
                  title="검색 지우기"
                  aria-label="검색 초기화">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {showRecent && recentSearches.length > 0 && !searchQuery && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-app-border bg-app-card shadow-lg z-50 py-1">
                  {recentSearches.map((s) => (
                    <button key={s} type="button" onMouseDown={() => setSearchQuery(s)}
                      className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation items */}
      <nav className={cn(
        "flex flex-col gap-0.5 border-b border-app-border py-2",
        collapsed ? "px-1.5" : "px-2"
      )}>
        {updatedNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={cn(
                "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                active
                  ? "bg-white/[0.03] text-app-text"
                  : "text-app-text-muted hover:bg-white/[0.03] hover:text-app-text"
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
                  style={{ height: collapsed ? 24 : 20, background: "linear-gradient(180deg, #8B5CF6, #3B82F6)" }}
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className="ml-auto flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white text-[10px] font-semibold px-1"
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </>
              )}
              {collapsed && item.badge != null && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white text-[9px] font-semibold px-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toolbar: batch / group / refresh */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 border-b border-app-border px-3 py-2 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setBatchMode(!batchMode)}
              className={cn(
                "flex min-h-8 min-w-8 items-center justify-center rounded-lg transition-all text-xs",
                batchMode
                  ? "bg-[#8B5CF6]/20 text-[#A78BFA]"
                  : "text-app-text-muted hover:text-app-text hover:bg-app-card"
              )}
              aria-label="배치 모드 전환"
              title={batchMode ? "일괄 선택 종료" : "일괄 선택 모드"}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
            {groups.length > 0 && (
              <button
                type="button"
                onClick={() => setGroupMgmtOpen(true)}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
                title="그룹 관리"
                aria-label="그룹 관리"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="flex-1 text-center text-[10px] text-app-text-subtle">
              계정 <span className="text-app-primary font-medium">{accounts.length}</span>개
            </span>
            <button
              type="button"
              onClick={() => { fetchAccounts(); loadHealth(); }}
              aria-label="계정 새로고침"
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${accountsLoading ? "animate-spin" : ""}`} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch action bar */}
      <AnimatePresence>
        {batchMode && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 border-b border-app-border bg-[#8B5CF6]/5 px-2 py-1.5 overflow-hidden"
          >
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
              해제
            </button>
            <span className="ml-auto text-[10px] font-medium text-app-text-muted">
              {selectedIds.size}개
            </span>
            <button
              type="button"
              onClick={handleBatchEnable}
              disabled={selectedIds.size === 0 || batchUpdating}
              className="rounded-lg bg-app-success/80 px-2 py-1 text-[10px] font-medium text-white hover:bg-app-success transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {batchUpdating ? "..." : "활성화"}
            </button>
            <button
              type="button"
              onClick={handleBatchDisable}
              disabled={selectedIds.size === 0 || batchUpdating}
              className="rounded-lg bg-app-warning/80 px-2 py-1 text-[10px] font-medium text-white hover:bg-app-warning transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health filter pills */}
      <AnimatePresence>
        {accounts.length > 0 && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-1 border-b border-app-border px-2 py-1.5 overflow-hidden"
          >
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
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                    healthFilter === f.key && !groupFilter
                      ? "bg-[#8B5CF6]/20 text-[#A78BFA]"
                      : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {f.label}
                  <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group filter pills */}
      <AnimatePresence>
        {groups.length > 0 && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-1 border-b border-app-border px-2 py-1.5 overflow-hidden"
          >
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
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 space-y-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-2"
          >
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
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={`sidebar-sk-${i}`} className="h-16 w-full rounded-xl" />)}</div>
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
                        <CheckSquare className="h-4 w-4 text-[#8B5CF6]" />
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group create prompt */}
      <AnimatePresence>
        {groups.length === 0 && !collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-app-border px-3 py-2"
          >
            <button
              type="button"
              onClick={() => setGroupMgmtOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#8B5CF6]/30 py-2 text-[11px] font-medium text-[#8B5CF6]/70 hover:border-[#8B5CF6]/50 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              계정 그룹 만들기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage summary card — only when expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-app-border px-3 py-3 space-y-3 overflow-hidden"
          >
            <p className="text-[11px] font-semibold text-app-text-muted">사용량 요약</p>
            <UsageBar label="메시지 발송" current={1234} total={5000} />
            <UsageBar label="AI 응답" current={456} total={1000} />
            <UsageBar label="스토리지" current={2.1} total={5.0} isGb />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] bg-gradient-to-r from-violet-500 to-blue-500"
            >
              <Zap className="h-3.5 w-3.5" />
              업그레이드
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account avatar section — bottom fixed */}
      <div className={cn(
        "border-t border-app-border py-2",
        collapsed ? "px-1.5" : "px-3"
      )}>
        {collapsed ? (
          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-bold"
              title="계정 메뉴"
            >
              A
            </button>
            <AnimatePresence>
              {avatarDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 rounded-lg border border-app-border bg-app-card shadow-xl z-50 py-1"
                >
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">프로필</button>
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">설정</button>
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">로그아웃</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-app-card-hover transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-bold">
                A
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-app-text truncate">Admin</p>
                <p className="text-[10px] text-app-text-muted">Pro</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-app-text-muted" />
            </button>
            <AnimatePresence>
              {avatarDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-app-border bg-app-card shadow-xl z-50 py-1"
                >
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">프로필</button>
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">설정</button>
                  <button className="w-full px-3 py-1.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors">로그아웃</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Collapse toggle button */}
      <div className="border-t border-app-border px-1.5 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Hint text at very bottom */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-app-border px-3 py-2"
          >
            <p className="text-[10px] text-app-text-subtle text-center">계정에 마우스를 올리면 삭제 가능</p>
          </motion.div>
        )}
      </AnimatePresence>

      <GroupManagementModal open={groupMgmtOpen} onClose={() => setGroupMgmtOpen(false)} />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="계정 삭제"
        description="이 계정을 삭제하시겠습니까? 연결된 모든 그룹과 발송 이력이 함께 제거됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </aside>
  );
}

function UsageBar({ label, current, total, isGb }: { label: string; current: number; total: number; isGb?: boolean }) {
  const pct = Math.min((current / total) * 100, 100);
  const isWarning = pct > 90;
  const fillGradient = isWarning
    ? "linear-gradient(90deg, #ef4444, #f97316)"
    : "linear-gradient(90deg, #8B5CF6, #3B82F6)";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-app-text-muted">{label}</span>
        <span className="text-app-text-secondary">
          {isGb ? current.toFixed(1) : <AnimatedCounter to={current} />} / {isGb ? `${total.toFixed(1)} GB` : <AnimatedCounter to={total} />}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-violet-500/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: fillGradient }}
        />
      </div>
    </div>
  );
}
