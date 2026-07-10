"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, RefreshCw, Star, Users, Users2 } from "lucide-react";
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

type SortMode = "default" | "members" | "favorites";
const BACKGROUND_POLL_INTERVAL_MS = 30000;

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

  async function load(accountId: string, silent = false) {
    if (silent) {
      try {
        setGroups(await api.fetchGroups(accountId));
      } catch {
        // ignore
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setGroups(await api.fetchGroups(accountId));
    } catch (err) {
      setGroups([]);
      setError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedAccountId || refreshing) return;
    setRefreshing(true);
    await load(selectedAccountId);
    setRefreshing(false);
  }

  useEffect(() => {
    if (selectedAccountId) {
      load(selectedAccountId);
    } else {
      setGroups([]);
    }
  }, [selectedAccountId]);

  // 30s background polling
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => load(selectedAccountId, true), BACKGROUND_POLL_INTERVAL_MS);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
  }, [groups, selectedAccountId]);

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
    return counts as Record<GroupType | "all", number>;
  }, [groups]);

  if (!account) {
    return (
      <Panel title="그룹 목록" description="발송 대상을 확인하려면 계정을 선택하세요.">
        <EmptyState icon={Users2} title="선택된 계정이 없습니다" description="왼쪽 사이드바에서 계정을 선택한 후 참여 중인 그룹/채널을 확인할 수 있습니다." />
      </Panel>
    );
  }

  const isBusy = loading || refreshing;

  return (
    <Panel
      title="그룹 목록"
      description={`${account.name ?? account.phone} 계정이 참여 중인 그룹/채널입니다.`}
      action={
        <Button variant="ghost" onClick={handleRefresh} disabled={isBusy}>
          <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름 검색" />
        <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-40 shrink-0">
          <option value="default">기본 정렬</option>
          <option value="members">멤버 많은순</option>
          <option value="favorites">즐겨찾기 우선</option>
        </Select>
      </div>

      {!loading && groups.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              typeFilter === "all" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text"
            )}
          >
            전체 <span className="ml-0.5 opacity-70">{groups.length}</span>
          </button>
          {(["group", "megagroup", "channel"] as GroupType[]).map((t) => {
            const count = typeCounts[t] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  typeFilter === t ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
              >
                {TYPE_LABEL[t]} <span className="ml-0.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {error && <p className="text-xs text-app-danger">{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <EmptyState icon={Users2} title="참여 중인 그룹/채널이 없습니다" />
      )}
      {!loading && !error && groups.length > 0 && visibleGroups.length === 0 && (
        <p className="text-xs text-app-text-subtle">조건에 맞는 그룹이 없습니다.</p>
      )}
      {visibleGroups.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleGroups.map((g) => {
            const Icon = g.type === "channel" ? Megaphone : Users;
            const favorite = isFavorite(g.id);
            return (
              <div
                key={g.id}
                className="group relative flex flex-col gap-2 rounded-2xl border border-app-border bg-app-card p-3 transition-colors duration-150 hover:border-app-border-strong hover:bg-app-card-hover"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-card-hover text-app-text-subtle">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-app-text">{g.title}</div>
                    <div className="text-[11px] text-app-text-subtle">
                      {g.participantsCount != null ? `${g.participantsCount.toLocaleString()}명` : "-"}
                    </div>
                  </div>
                  <button
                    type="button"
                    title={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    onClick={() => toggleFavorite(g.id)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                      favorite
                        ? "text-app-warning"
                        : "text-app-text-subtle opacity-0 hover:text-app-warning group-hover:opacity-100"
                    )}
                  >
                    <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
                  </button>
                </div>
                <Badge tone="neutral">{TYPE_LABEL[g.type]}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
