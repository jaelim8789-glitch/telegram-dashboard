"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, RefreshCw, Send, Star, Users, Users2, Filter, Hash, MessageCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useFavoriteGroups } from "@/lib/groupPreferences";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Group, GroupType } from "@/types";

const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

const TYPE_ICON: Record<GroupType, typeof Users> = {
  group: Users,
  megagroup: Users2,
  channel: Megaphone,
};

const TYPE_COLOR: Record<GroupType, string> = {
  group: "from-cyan-500 to-blue-600",
  megagroup: "from-violet-500 to-purple-600",
  channel: "from-rose-500 to-pink-600",
};

type SortMode = "default" | "members" | "favorites";
const BACKGROUND_POLL_INTERVAL_MS = 30000;

function MemberCount({ count }: { count: number | null }) {
  if (count == null) return <span className="text-app-text-subtle">-</span>;
  return (
    <span className="tabular-nums">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString()}</span>
  );
}

export function GroupTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const { isFavorite, toggleFavorite } = useFavoriteGroups();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [typeFilter, setTypeFilter] = useState<GroupType | "all">("all");
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  const [savedSendGroupIds, setSavedSendGroupIds] = useState<string[]>([]);

  const savedGroupStorageKey = useMemo(
    () => selectedAccountId ? `saved-send-groups-${selectedAccountId}` : null,
    [selectedAccountId]
  );

  useEffect(() => {
    if (!savedGroupStorageKey) { setSavedSendGroupIds([]); return; }
    try {
      const stored = localStorage.getItem(savedGroupStorageKey);
      if (stored) setSavedSendGroupIds(JSON.parse(stored));
      else setSavedSendGroupIds([]);
    } catch { setSavedSendGroupIds([]); }
  }, [savedGroupStorageKey]);

  function toggleSavedSendGroup(id: string) {
    if (!savedGroupStorageKey) return;
    setSavedSendGroupIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(savedGroupStorageKey, JSON.stringify(next));
      return next;
    });
  }

  const savedSendGroups = useMemo(
    () => groups.filter((g) => savedSendGroupIds.includes(g.id)),
    [groups, savedSendGroupIds],
  );

  async function load(accountId: string, silent = false) {
    if (silent) {
      try { setGroups(await api.fetchGroups(accountId)); } catch { /* ignore */ }
      return;
    }
    setLoading(true);
    setError(null);
    try { setGroups(await api.fetchGroups(accountId)); }
    catch (err) { setGroups([]); setError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }

  async function handleRefresh() {
    if (!selectedAccountId || refreshing) return;
    setRefreshing(true);
    await load(selectedAccountId);
    setRefreshing(false);
  }

  useEffect(() => {
    if (selectedAccountId) { load(selectedAccountId); }
    else { setGroups([]); }
  }, [selectedAccountId]);

  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => { load(selectedAccountId, true); setPollTick((t) => t + 1); }, BACKGROUND_POLL_INTERVAL_MS);
    return () => { if (bgPollTimer.current) clearTimeout(bgPollTimer.current); };
  }, [pollTick, selectedAccountId]);

  const visibleGroups = useMemo(() => {
    let filtered = groups;
    if (typeFilter !== "all") filtered = filtered.filter((g) => g.type === typeFilter);
    filtered = filtered.filter((g) => g.title.toLowerCase().includes(search.trim().toLowerCase()));
    const sorted = [...filtered];
    if (sortMode === "members") sorted.sort((a, b) => (b.participantsCount ?? 0) - (a.participantsCount ?? 0));
    if (sortMode === "favorites") sorted.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    return sorted;
  }, [groups, search, sortMode, isFavorite, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: groups.length };
    for (const g of groups) counts[g.type] = (counts[g.type] ?? 0) + 1;
    return counts;
  }, [groups]);

  const totalMembers = useMemo(() => groups.reduce((s, g) => s + (g.participantsCount ?? 0), 0), [groups]);
  const favoriteCount = useMemo(() => groups.filter((g) => isFavorite(g.id)).length, [groups, isFavorite]);

  if (!account) {
    return (
      <Panel title="그룹 목록" description="발송 대상을 확인하려면 계정을 선택하세요.">
        <EmptyState icon={Users2} title="선택된 계정이 없습니다" description="왼쪽 사이드바에서 계정을 선택한 후 참여 중인 그룹/채널을 확인할 수 있습니다." />
      </Panel>
    );
  }

  const isBusy = loading || refreshing;
  return (
    <div className="space-y-5 pb-8">
      {/* Summary bar */}
      {!loading && groups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3"
        >
          <div className="flex items-center gap-2 text-xs text-app-text-muted">
            <Users className="h-4 w-4 text-app-primary" />
            <span className="font-medium text-app-text">{groups.length}</span>개 그룹
          </div>
          <div className="h-3 w-px bg-app-border" />
          <div className="flex items-center gap-2 text-xs text-app-text-muted">
            <Hash className="h-4 w-4 text-app-info" />
            <span className="font-medium text-app-text">{totalMembers.toLocaleString()}</span>명 멤버
          </div>
          <div className="h-3 w-px bg-app-border" />
          <div className="flex items-center gap-2 text-xs text-app-text-muted">
            <Star className="h-4 w-4 text-app-warning" />
            <span className="font-medium text-app-text">{favoriteCount}</span>개 즐겨찾기
          </div>
          <div className="ml-auto">
            <Badge tone={groups.length > 0 ? "success" : "neutral"}>{account.name || account.phone}</Badge>
          </div>
        </motion.div>
      )}

      {/* 내 발송그룹 */}
      {savedSendGroups.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><Send className="h-4 w-4 text-app-primary" /> 내 발송그룹</div>}
          description={`저장된 ${savedSendGroups.length}개 그룹/채널`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {savedSendGroups.map((g, i) => {
              const Icon = TYPE_ICON[g.type];
              const saved = savedSendGroupIds.includes(g.id);
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative flex flex-col gap-2 rounded-2xl border border-app-primary/30 bg-app-primary-muted/20 p-3 transition-all duration-200 hover:border-app-primary/60 hover:shadow-sm hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", TYPE_COLOR[g.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-app-text">{g.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-app-text-subtle">
                        <Users className="h-3 w-3" />
                        <MemberCount count={g.participantsCount} />
                      </div>
                    </div>
                    <button type="button" title={saved ? "발송그룹 제거" : "발송그룹 추가"}
                      onClick={() => toggleSavedSendGroup(g.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 text-app-danger hover:bg-app-danger-muted/30"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Badge tone="neutral" className={cn("self-start", TYPE_LABEL[g.type])}>{TYPE_LABEL[g.type]}</Badge>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title={<div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-app-primary" /> 그룹 목록</div>}
        description={`${account.name ?? account.phone} 계정이 참여 중인 그룹/채널입니다.`}
        action={
          <Button variant="ghost" onClick={handleRefresh} disabled={isBusy}>
            <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        }
      >
        <div className="mb-3 flex items-center gap-2">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름 검색" className="flex-1" />
          <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-36 shrink-0">
            <option value="default">기본 정렬</option>
            <option value="members">멤버 많은순</option>
            <option value="favorites">즐겨찾기 우선</option>
          </Select>
        </div>

        {!loading && groups.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setTypeFilter("all")}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === "all" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
              <Filter className="h-3 w-3" /> 전체 <span className="ml-0.5 opacity-70">{groups.length}</span>
            </button>
            {(["group", "megagroup", "channel"] as GroupType[]).map((t) => {
              const count = typeCounts[t] ?? 0;
              if (count === 0) return null;
              const Icon = TYPE_ICON[t];
              return (
                <button key={t} type="button" onClick={() => setTypeFilter(t)}
                  className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === t ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                  <Icon className="h-3 w-3" /> {TYPE_LABEL[t]} <span className="ml-0.5 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}
        {error && <p className="text-xs text-app-danger">{error}</p>}
        {!loading && !error && groups.length === 0 && (
          <EmptyState icon={Users2} title="참여 중인 그룹/채널이 없습니다" description="계정이 그룹에 참여하면 여기에 표시됩니다." />
        )}
        {!loading && !error && groups.length > 0 && visibleGroups.length === 0 && (
          <p className="py-8 text-center text-xs text-app-text-subtle">조건에 맞는 그룹이 없습니다.</p>
        )}
              {visibleGroups.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleGroups.map((g, i) => {
              const Icon = TYPE_ICON[g.type];
              const favorite = isFavorite(g.id);
              const saved = savedSendGroupIds.includes(g.id);
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative flex flex-col gap-2 rounded-2xl border border-app-border bg-app-card p-3 transition-all duration-200 hover:border-app-border-strong hover:shadow-sm hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", TYPE_COLOR[g.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-app-text">{g.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-app-text-subtle">
                        <Users className="h-3 w-3" />
                        <MemberCount count={g.participantsCount} />
                      </div>
                    </div>
                    <button type="button" title={saved ? "발송그룹 제거" : "발송그룹 추가"}
                      onClick={() => toggleSavedSendGroup(g.id)}
                      className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
                        saved ? "text-app-danger bg-app-danger-muted/30" : "text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-danger hover:bg-app-danger-muted/20"
                      )}>
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      onClick={() => toggleFavorite(g.id)}
                      className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
                        favorite ? "text-app-warning bg-app-warning-muted/30" : "text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-warning hover:bg-app-warning-muted/20"
                      )}>
                      <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
                    </button>
                  </div>
                  <Badge tone="neutral" className={cn("self-start", TYPE_LABEL[g.type])}>{TYPE_LABEL[g.type]}</Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}