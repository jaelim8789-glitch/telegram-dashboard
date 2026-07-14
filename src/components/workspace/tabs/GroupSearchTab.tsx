"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Users, UserPlus, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Filter, ExternalLink, Hash, MessageCircle, Ban, AlertTriangle, ChevronDown,
  Send, RotateCcw,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api_group_search";
import type { GroupSearchResult, GroupJoinLog, JoinInfo } from "@/lib/api_group_search";

type JoinResultItem = { chat_id: string; title: string; success: boolean; error: string | null; result_id?: string };

const BACKGROUND_POLL_INTERVAL_MS = 30000;

import { formatRelativeTime } from "@/lib/formatTime";

function MemberCount({ count }: { count: number | null }) {
  if (count == null) return <span className="text-app-text-subtle">-</span>;
  return <span className="tabular-nums">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString()}</span>;
}

const CHAT_TYPE_COLOR: Record<string, string> = {
  group: "from-cyan-500 to-blue-600",
  megagroup: "from-violet-500 to-purple-600",
  channel: "from-rose-500 to-pink-600",
};

const CHAT_TYPE_LABEL: Record<string, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

const CHAT_TYPE_ICON: Record<string, typeof Users> = {
  group: Users,
  megagroup: Users,
  channel: MessageCircle,
};

/** Reconcile new join results with previous results, preserving successes. */
function reconcileResults(prev: JoinResultItem[], next: JoinResultItem[]): JoinResultItem[] {
  const map = new Map<string, JoinResultItem>();
  for (const r of prev) map.set(r.chat_id, r);
  for (const r of next) map.set(r.chat_id, r);
  return Array.from(map.values());
}

export function GroupSearchTab() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);

  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [joinResults, setJoinResults] = useState<JoinResultItem[] | null>(null);
  const [joinLogs, setJoinLogs] = useState<GroupJoinLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchResultMeta, setSearchResultMeta] = useState<"loading" | "empty" | "results" | "error" | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showJoined, setShowJoined] = useState(false);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const lastAccountIdRef = useRef<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const loadJoinInfo = useCallback(async () => {
    if (!selectedAccountId) return;
    try { setJoinInfo(await api.getJoinInfo(selectedAccountId)); } catch { /* ignore */ }
  }, [selectedAccountId]);

  const loadJoinLogs = useCallback(async () => {
    if (!selectedAccountId) return;
    try { setJoinLogs(await api.fetchJoinLogs(selectedAccountId)); } catch { /* ignore */ }
  }, [selectedAccountId]);

  const loadSavedResults = useCallback(async () => {
    if (!selectedAccountId) return;
    try { setResults(await api.fetchSearchResults(selectedAccountId)); } catch { /* ignore */ }
  }, [selectedAccountId]);

  // Clear stale join results on account switch
  useEffect(() => {
    if (lastAccountIdRef.current && lastAccountIdRef.current !== selectedAccountId) {
      setJoinResults(null);
    }
    lastAccountIdRef.current = selectedAccountId ?? null;
    if (selectedAccountId) {
      loadJoinInfo();
      loadJoinLogs();
      loadSavedResults();
    } else {
      setResults([]);
      setJoinInfo(null);
      setJoinLogs([]);
    }
    setKeyword("");
    setSelectedIds(new Set());
    setJoinResults(null);
    setError(null);
  }, [selectedAccountId, loadJoinInfo, loadJoinLogs, loadSavedResults]);

  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => {
      loadJoinInfo(); loadJoinLogs(); loadSavedResults();
      setPollTick((t) => t + 1);
    }, BACKGROUND_POLL_INTERVAL_MS);
    return () => { if (bgPollTimer.current) clearTimeout(bgPollTimer.current); };
  }, [selectedAccountId, pollTick, loadJoinInfo, loadJoinLogs, loadSavedResults]);

  async function handleManualRefresh() {
    if (!selectedAccountId) return;
    await Promise.all([loadJoinInfo(), loadJoinLogs(), loadSavedResults()]);
  }

  async function handleSearch() {
    if (!selectedAccountId || !keyword.trim() || searching) return;
    setSearching(true);
    setError(null);
    setJoinResults(null);
    setSelectedIds(new Set());
    setSearchResultMeta(null);
    try {
      const found = await api.searchGroups(selectedAccountId, keyword.trim());
      setResults(found);
      await loadJoinInfo();
      if (found.length === 0) {
        setSearchResultMeta("empty");
        setError(`"${keyword}" 키워드로 검색된 그룹이 없습니다. 다른 키워드로 다시 시도해보세요.`);
      } else {
        setSearchResultMeta("results");
      }
    } catch (err) {
      setSearchResultMeta("error");
      if (err instanceof Error && (err as { isNetworkError?: boolean }).isNetworkError) {
        setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.");
      } else {
        setError(err instanceof Error ? err.message : "검색에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally { setSearching(false); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(results.filter((r) => !r.isJoined).map((r) => r.id))); }
  function deselectAll() { setSelectedIds(new Set()); }

  async function handleJoin() {
    if (!selectedAccountId || selectedIds.size === 0 || joinLoading) return;
    const ids = Array.from(selectedIds);
    setJoinLoading(true);
    setError(null);
    try {
      const rawResults = await api.joinSelectedGroups(ids);
      const resultIdMap = new Map(results.filter(r => ids.includes(r.id)).map(r => [r.chatId, r.id]));
      const enriched: JoinResultItem[] = rawResults.map(r => ({
        ...r,
        result_id: resultIdMap.get(r.chat_id),
      }));
      setJoinResults((prev) => prev ? reconcileResults(prev, enriched) : enriched);
      setSelectedIds(new Set());
      await Promise.all([loadJoinInfo(), loadJoinLogs(), loadSavedResults()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 가입에 실패했습니다.");
    } finally { setJoinLoading(false); }
  }

  async function handleRetryFailed() {
    if (!selectedAccountId || !joinResults || retryLoading) return;
    const failedResultIds = joinResults.filter(r => !r.success).map(r => r.result_id).filter((id): id is string => id != null);
    if (failedResultIds.length === 0) return;
    setRetryLoading(true);
    setError(null);
    try {
      const rawResults = await api.joinSelectedGroups(failedResultIds);
      const resultIdMap = new Map(results.filter(r => failedResultIds.includes(r.id)).map(r => [r.chatId, r.id]));
      const enriched: JoinResultItem[] = rawResults.map(r => ({
        ...r,
        result_id: resultIdMap.get(r.chat_id),
      }));
      setJoinResults((prev) => prev ? reconcileResults(prev, enriched) : enriched);
      await Promise.all([loadJoinInfo(), loadJoinLogs(), loadSavedResults()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재시도에 실패했습니다.");
    } finally { setRetryLoading(false); }
  }

  // Filter logic
  const filteredResults = results.filter((r) => {
    if (typeFilter !== "all" && r.chatType !== typeFilter) return false;
    if (!showJoined && r.isJoined) return false;
    return true;
  });

  const typeCounts: Record<string, number> = { all: filteredResults.length };
  for (const r of filteredResults) {
    const t = r.chatType ?? "unknown";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  // Computed join result state
  const successCount = joinResults?.filter(r => r.success).length ?? 0;
  const failCount = joinResults?.filter(r => !r.success).length ?? 0;
  const hasSuccess = successCount > 0;
  const hasFailures = failCount > 0;

  if (!selectedAccountId) {
    return (
      <Panel title="그룹 검색" description="키워드로 Telegram 공개 그룹을 검색하고 가입합니다.">
        <EmptyState icon={Search} title="계정을 먼저 선택해주세요" description="왼쪽 사이드바에서 Telegram 계정을 선택하면 검색을 시작할 수 있습니다." />
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Search Panel */}
      <Panel
        title={<div className="flex items-center gap-2"><Search className="h-4 w-4 text-app-primary" /> 그룹 검색</div>}
        description={`${selectedAccount?.name || selectedAccount?.phone} 계정으로 Telegram에서 공개 그룹을 검색합니다.`}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="검색 키워드" hint="예: 마케팅, 스타트업, 개발">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색할 키워드를 입력하세요"
                required
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={searching || !keyword.trim()}>
            {searching ? <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> 검색 중...</>
              : <><Search className="mr-1.5 h-4 w-4" /> 검색</>}
          </Button>
        </form>
      </Panel>

      {/* Daily Join Info + Controls */}
      {joinInfo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm"
        >
          <Clock className="h-4 w-4 text-app-text-muted shrink-0" />
          <span className="text-app-text-muted">일일 가입 현황:</span>

          {/* Progress bar */}
          <div className="flex-1 min-w-[120px] max-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-app-text-muted">{joinInfo.joinedToday}/{joinInfo.maxDaily}회</span>
              <span className={joinInfo.remaining > 0 ? "text-app-success" : "text-app-danger"}>
                {joinInfo.remaining > 0 ? `${joinInfo.remaining}회 남음` : "한도 초과"}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  joinInfo.remaining > 0 ? "bg-app-primary" : "bg-app-danger"
                )}
                style={{ width: `${(joinInfo.joinedToday / joinInfo.maxDaily) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {joinInfo.remaining <= 0 ? (
              <Badge tone="danger"><Ban className="mr-1 h-3 w-3" /> 한도 초과</Badge>
            ) : joinInfo.joinedToday > 0 ? (
              <Badge tone="warning">{joinInfo.joinedToday}회 사용</Badge>
            ) : (
              <Badge tone="success">전체 가능</Badge>
            )}
          </div>
        </motion.div>
      )}

      {/* Error / Empty state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {searchResultMeta === "error" ? (
              <InlineError action={
                <button onClick={handleSearch} className="text-xs underline hover:no-underline">다시 시도</button>
              }>{error}</InlineError>
            ) : searchResultMeta === "empty" ? (
              <div className="flex items-start gap-2 rounded-xl border border-app-border bg-app-card-hover/50 px-3 py-2.5 text-xs text-app-text-muted">
                <Search className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-app-text">검색 결과 없음</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-2.5 text-xs text-app-danger flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Results */}
      <AnimatePresence>
        {joinResults && joinResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Panel title={<div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-app-primary" /> 가입 결과</div>}>
              <div className="space-y-1.5">
                {joinResults.map((r, i) => (
                  <motion.div
                    key={r.chat_id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs",
                      r.success ? "bg-app-success-muted/50 border border-app-success/10" : "bg-app-danger-muted/30 border border-app-danger/10"
                    )}
                  >
                    <span className="font-medium text-app-text truncate min-w-0 flex-1">{r.title}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {r.success
                        ? <Badge tone="success"><CheckCircle className="mr-1 h-3 w-3" /> 가입 완료</Badge>
                        : <Badge tone="danger" className="max-w-[200px] text-right"><span className="truncate">{r.error || "실패"}</span></Badge>
                      }
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Action bar: Retry Failed + Continue to Send */}
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-app-border pt-3">
                {hasFailures && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={retryLoading}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-50"
                  >
                    {retryLoading ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> 재시도 중...</>
                    ) : (
                      <><RotateCcw className="h-3.5 w-3.5" /> 실패 {failCount}개만 다시 시도</>
                    )}
                  </button>
                )}
                <span className="text-xs text-app-text-muted sm:ml-2">
                  {hasSuccess ? `${successCount}개 그룹 가입 완료` : ""}
                </span>
                  {hasSuccess && (
                  <button
                    onClick={() => {
                      const store = useDashboardStore.getState();
                      joinResults.filter(r => r.success).forEach(r => {
                        const id = r.result_id ?? r.chat_id;
                        store.toggleSendGroupId(id);
                      });
                      store.setActiveTab("send");
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors sm:ml-auto"
                  >
                    <Send className="h-3.5 w-3.5" /> 발송하러 가기
                  </button>
                )}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" /> 검색 결과 ({results.length})</div>}
          description="가입할 그룹을 선택한 후 하단의 [선택한 그룹 가입] 버튼을 클릭하세요."
        >
          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setTypeFilter("all")}
                className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === "all" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                <Filter className="h-3 w-3" /> 전체
              </button>
              {(["group", "megagroup", "channel"] as string[]).map((t) => {
                const count = results.filter((r) => r.chatType === t).length;
                if (count === 0) return null;
                return (
                  <button key={t} type="button" onClick={() => setTypeFilter(t)}
                    className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors", typeFilter === t ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                    {CHAT_TYPE_LABEL[t] ?? t} {count}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowJoined(!showJoined)}
                className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                  showJoined ? "bg-app-card-hover text-app-text" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                <CheckCircle className="h-3 w-3" /> 가입완료 숨기기
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="ghost" onClick={selectAll} disabled={results.every((r) => r.isJoined)} size="sm">전체 선택</Button>
              <Button variant="ghost" onClick={deselectAll} size="sm">선택 해제</Button>
              {selectedIds.size > 0 && <span className="text-xs text-app-primary font-medium">{selectedIds.size}개 선택됨</span>}
            </div>
          </div>

          {/* Group cards */}
          {filteredResults.length === 0 && (
            <p className="py-6 text-center text-xs text-app-text-subtle">조건에 맞는 결과가 없습니다.</p>
          )}
          <div className="space-y-2">
            {filteredResults.map((r, i) => {
              const color = CHAT_TYPE_COLOR[r.chatType ?? "group"] ?? "from-gray-500 to-gray-600";
              const typeLabel = CHAT_TYPE_LABEL[r.chatType ?? ""] ?? r.chatType;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => !r.isJoined && toggleSelect(r.id)}
                    disabled={r.isJoined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                      r.isJoined
                        ? "cursor-not-allowed border-app-border/30 bg-app-card/30 opacity-50"
                        : selectedIds.has(r.id)
                          ? "border-app-primary bg-app-primary-muted shadow-sm shadow-app-primary/5"
                          : "border-app-border bg-app-card hover:border-app-primary/40 hover:bg-app-card-hover hover:shadow-sm"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150",
                      selectedIds.has(r.id)
                        ? "border-app-primary bg-app-primary text-white scale-105"
                        : r.isJoined ? "border-app-border/30 bg-app-bg/50" : "border-app-border bg-app-bg group-hover:border-app-primary/60"
                    )}>
                      {selectedIds.has(r.id) && <CheckCircle className="h-3.5 w-3.5" />}
                      {r.isJoined && <CheckCircle className="h-3.5 w-3.5 text-app-text-muted/30" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-medium text-app-text">{r.title}</span>
                        {r.chatType && (
                          <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-gradient-to-r", color)}>
                            {typeLabel}
                          </span>
                        )}
                        {r.isJoined && <Badge tone="success">가입됨</Badge>}
                      </div>
                      {r.about && <p className="mt-0.5 line-clamp-2 text-xs text-app-text-muted">{r.about}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-app-text-subtle">
                        {r.username && (
                          <a
                            href={`https://t.me/${r.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-app-info hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> @{r.username}
                          </a>
                        )}
                        {r.participantsCount != null && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <MemberCount count={r.participantsCount} />
                          </span>
                        )}
                        {r.keyword && (
                          <span className="inline-flex items-center gap-1">
                            <Hash className="h-3 w-3" /> {r.keyword}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Join button */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-4 flex items-center justify-between border-t border-app-border pt-4"
              >
                <span className="text-xs text-app-text-muted">
                  {selectedIds.size}개 그룹 선택됨
                  {joinInfo && joinInfo.remaining < selectedIds.size && (
                    <span className="text-app-warning ml-1">(일일 한도 초과로 {selectedIds.size - joinInfo.remaining}개는 가입되지 않습니다)</span>
                  )}
                </span>
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  disabled={joinLoading || (joinInfo?.remaining ?? 0) <= 0}
                  className="shadow-lg shadow-app-primary/20"
                >
                  {joinLoading ? (
                    <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> 가입 중...</>
                  ) : (
                    <><UserPlus className="mr-1.5 h-4 w-4" /> 선택한 그룹 가입 ({selectedIds.size}개)</>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {results.length === 0 && !searching && searchResultMeta === null && (
            <div className="flex flex-col items-center justify-center py-8 text-app-text-muted">
              <Search className="mb-2 h-8 w-8" />
              <p className="text-xs">키워드를 입력하고 검색을 시작하세요.</p>
            </div>
          )}
        </Panel>
      )}

      {/* Join history */}
      <Panel
        title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-primary" /> 가입 기록</div>}
        description={joinLogs.length > 0 ? `최근 가입 내역 (최대 50건)` : undefined}
        action={
          <Button variant="ghost" onClick={handleManualRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
      >
        {joinLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="mb-2 h-6 w-6 text-app-text-subtle" />
            <p className="text-xs text-app-text-muted">아직 가입 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {joinLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-app-card-hover",
                  log.success ? "" : "bg-app-danger-muted/20"
                )}
              >
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className={log.success ? "text-app-success" : "text-app-danger"}>
                    {log.success ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-app-text">{log.title}</span>
                    {log.username && <span className="ml-1.5 text-app-text-muted">@{log.username}</span>}
                    <div className="text-[10px] text-app-text-subtle space-x-1">
                      {log.keyword && <span>키워드: {log.keyword}</span>}
                      <span>·</span>
                      <span>{formatRelativeTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  {log.success
                    ? <Badge tone="success">성공</Badge>
                    : <Badge tone="danger" className="max-w-[160px] truncate"><span title={log.errorMessage ?? undefined}>{log.errorMessage || "실패"}</span></Badge>
                  }
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}