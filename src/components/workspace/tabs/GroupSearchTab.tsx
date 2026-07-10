"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api_group_search";
import type { GroupSearchResult, GroupJoinLog, JoinInfo } from "@/lib/api_group_search";
import { Search, Users, UserPlus, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

const BACKGROUND_POLL_INTERVAL_MS = 30000;

export function GroupSearchTab() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);

  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinResults, setJoinResults] = useState<{ title: string; success: boolean; error: string | null }[] | null>(null);
  const [joinLogs, setJoinLogs] = useState<GroupJoinLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const loadJoinInfo = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const info = await api.getJoinInfo(selectedAccountId);
      setJoinInfo(info);
    } catch { /* ignore */ }
  }, [selectedAccountId]);

  const loadJoinLogs = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const logs = await api.fetchJoinLogs(selectedAccountId);
      setJoinLogs(logs);
    } catch { /* ignore */ }
  }, [selectedAccountId]);

  const loadSavedResults = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const saved = await api.fetchSearchResults(selectedAccountId);
      setResults(saved);
    } catch { /* ignore */ }
  }, [selectedAccountId]);

  useEffect(() => {
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

  // 30s background polling for join info, logs, and saved results.
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => {
      loadJoinInfo();
      loadJoinLogs();
      loadSavedResults();
      setPollTick((t) => t + 1);
    }, BACKGROUND_POLL_INTERVAL_MS);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
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
    try {
      const found = await api.searchGroups(selectedAccountId, keyword.trim());
      setResults(found);
      if (found.length === 0) {
        setError(`"${keyword}" 검색 결과가 없습니다.`);
      }
      await loadJoinInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const unjoined = results.filter((r) => !r.isJoined);
    setSelectedIds(new Set(unjoined.map((r) => r.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleJoin() {
    if (!selectedAccountId || selectedIds.size === 0 || joinLoading) return;
    setJoinLoading(true);
    setError(null);
    setJoinResults(null);
    try {
      const result = await api.joinSelectedGroups(Array.from(selectedIds));
      setJoinResults(result);
      setSelectedIds(new Set());
      // Refresh data
      await loadJoinInfo();
      await loadJoinLogs();
      await loadSavedResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 가입에 실패했습니다.");
    } finally {
      setJoinLoading(false);
    }
  }

  if (!selectedAccountId) {
    return (
      <Panel title="그룹 검색" description="키워드로 Telegram 공개 그룹을 검색하고 가입합니다.">
        <div className="flex flex-col items-center justify-center py-12 text-app-text-muted">
          <Search className="mb-3 h-10 w-10" />
          <p className="text-sm">사이드바에서 계정을 먼저 선택해주세요.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Panel */}
      <Panel
        title="그룹 검색"
        description={`${selectedAccount?.name || selectedAccount?.phone} 계정으로 Telegram에서 공개 그룹을 검색합니다.`}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex items-end gap-3"
        >
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
            {searching ? "검색 중..." : "검색"}
          </Button>
        </form>
      </Panel>

      {/* Daily Join Info */}
      {joinInfo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm">
          <Clock className="h-4 w-4 text-app-text-muted shrink-0" />
          <span className="text-app-text-muted">일일 가입 현황:</span>
          <span className="font-medium text-app-text">
            {joinInfo.joinedToday}/{joinInfo.maxDaily}회
          </span>
          {joinInfo.remaining <= 0 ? (
            <span className="flex items-center gap-1 text-app-danger">
              <XCircle className="h-3.5 w-3.5" /> 한도 초과
            </span>
          ) : (
            <span className="flex items-center gap-1 text-app-success">
              <CheckCircle className="h-3.5 w-3.5" /> {joinInfo.remaining}회 남음
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-2.5 text-xs text-app-danger">
          <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Join Results */}
      {joinResults && joinResults.length > 0 && (
        <Panel title="가입 결과">
          <div className="space-y-1.5">
            {joinResults.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                  r.success ? "bg-app-success-muted text-app-success" : "bg-app-danger-muted text-app-danger"
                )}
              >
                <span className="font-medium">{r.title}</span>
                <span>{r.success ? "가입 완료" : r.error || "실패"}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              검색 결과 ({results.length})
            </div>
          }
          description="가입할 그룹을 선택한 후 하단의 [선택한 그룹 가입] 버튼을 클릭하세요."
        >
          {/* Selection controls */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button variant="ghost" onClick={selectAll} disabled={results.every((r) => r.isJoined)} size="sm">
                전체 선택
              </Button>
              <Button variant="ghost" onClick={deselectAll} size="sm">
                선택 해제
              </Button>
            </div>
            <span className="text-xs text-app-text-muted">
              {selectedIds.size}개 선택됨
            </span>
          </div>

          {/* Group cards */}
          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => !r.isJoined && toggleSelect(r.id)}
                disabled={r.isJoined}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150",
                  r.isJoined
                    ? "cursor-not-allowed border-app-border/30 bg-app-card/30 opacity-50"
                    : selectedIds.has(r.id)
                      ? "border-app-primary bg-app-primary-muted"
                      : "border-app-border bg-app-card hover:border-app-primary/40 hover:bg-app-card-hover"
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    selectedIds.has(r.id)
                      ? "border-app-primary bg-app-primary text-white"
                      : "border-app-border bg-app-bg"
                  )}
                >
                  {selectedIds.has(r.id) && <CheckCircle className="h-3 w-3" />}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-app-text">{r.title}</span>
                    {r.chatType && (
                      <span className="shrink-0 rounded bg-app-bg px-1.5 py-0.5 text-[10px] text-app-text-muted">
                        {r.chatType === "megagroup" ? "그룹" : r.chatType === "channel" ? "채널" : r.chatType}
                      </span>
                    )}
                    {r.isJoined && (
                      <span className="shrink-0 rounded bg-app-success-muted px-1.5 py-0.5 text-[10px] text-app-success">
                        가입됨
                      </span>
                    )}
                  </div>
                  {r.about && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-app-text-muted">{r.about}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-app-text-subtle">
                    {r.username && <span>@{r.username}</span>}
                    {r.participantsCount != null && (
                      <span>{r.participantsCount.toLocaleString()}명</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Join button */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex justify-end border-t border-app-border pt-4">
              <Button
                variant="primary"
                onClick={handleJoin}
                disabled={joinLoading || (joinInfo?.remaining ?? 0) <= 0}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {joinLoading
                  ? "가입 중..."
                  : `선택한 그룹 가입 (${selectedIds.size}개)`}
              </Button>
            </div>
          )}

          {results.length === 0 && !searching && (
            <div className="flex flex-col items-center justify-center py-8 text-app-text-muted">
              <Search className="mb-2 h-8 w-8" />
              <p className="text-xs">키워드를 입력하고 검색을 시작하세요.</p>
            </div>
          )}
        </Panel>
      )}

      {/* Join history */}
      <Panel
        title="가입 기록"
        description={joinLogs.length > 0 ? `최근 가입 내역 (최대 50건)` : undefined}
        action={
          <Button variant="ghost" onClick={handleManualRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
      >
        {joinLogs.length === 0 ? (
          <p className="text-xs text-app-text-muted">아직 가입 기록이 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {joinLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-app-text">{log.title}</span>
                  {log.username && (
                    <span className="ml-1.5 text-app-text-muted">@{log.username}</span>
                  )}
                  <span className="ml-1.5 text-app-text-subtle">({log.keyword})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log.success ? (
                    <span className="flex items-center gap-1 text-app-success">
                      <CheckCircle className="h-3 w-3" /> 성공
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-app-danger" title={log.errorMessage || undefined}>
                      <XCircle className="h-3 w-3" /> 실패
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}


