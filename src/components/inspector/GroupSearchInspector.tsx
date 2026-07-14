"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api_group_search";
import type { GroupSearchResult, GroupJoinLog, JoinInfo } from "@/lib/api_group_search";
import { Search, Users, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

export function GroupSearchInspector() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);

  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [recentResults, setRecentResults] = useState<GroupSearchResult[]>([]);
  const [recentLogs, setRecentLogs] = useState<GroupJoinLog[]>([]);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const loadData = useCallback(async () => {
    if (!selectedAccountId) {
      setJoinInfo(null);
      setRecentResults([]);
      setRecentLogs([]);
      return;
    }
    api.getJoinInfo(selectedAccountId).then(setJoinInfo).catch(() => setJoinInfo(null));
    api.fetchSearchResults(selectedAccountId).then((r) => setRecentResults(r.slice(0, 10))).catch(() => setRecentResults([]));
    api.fetchJoinLogs(selectedAccountId).then((l) => setRecentLogs(l.slice(0, 20))).catch(() => setRecentLogs([]));
  }, [selectedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedAccountId]);

  // 30s background polling
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    if (!selectedAccountId) return;
    bgPollTimer.current = setTimeout(() => { loadData(); setPollTick((t) => t + 1); }, 30000);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
  }, [loadData, pollTick, selectedAccountId]);

  if (!selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-app-text-muted">
        <Search className="mb-2 h-8 w-8" />
        <p className="text-xs">계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Selected account */}
      <div className="rounded-lg border border-app-border bg-app-card px-3 py-2">
        <p className="text-app-text-subtle">선택된 계정</p>
        <p className="mt-0.5 font-medium text-app-text">
          {selectedAccount?.name || selectedAccount?.phone}
        </p>
      </div>

      {/* Daily join status */}
      {joinInfo && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-app-text">
            <Clock className="h-3.5 w-3.5" />
            일일 가입 현황
          </p>
          <div className="rounded-lg border border-app-border bg-app-card px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-app-text-muted">사용 / 최대</span>
              <span className="font-medium text-app-text">
                {joinInfo.joinedToday} / {joinInfo.maxDaily}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  joinInfo.remaining <= 0
                    ? "bg-app-danger"
                    : joinInfo.remaining <= 2
                      ? "bg-app-warning"
                      : "bg-app-success"
                )}
                style={{ width: `${(joinInfo.joinedToday / joinInfo.maxDaily) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-app-text-muted">
              {joinInfo.remaining > 0
                ? `${joinInfo.remaining}회 추가 가입 가능`
                : "오늘 한도 초과"}
            </p>
          </div>
        </div>
      )}

      {/* Recent search results */}
      {recentResults.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-app-text">
            <Search className="h-3.5 w-3.5" />
            최근 검색 결과
          </p>
          <div className="space-y-1">
            {recentResults.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5",
                  r.isJoined
                    ? "border-app-success/20 bg-app-success-muted/20"
                    : "border-app-border bg-app-card"
                )}
              >
                <p className="truncate font-medium text-app-text">{r.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-app-text-subtle">
                  <span>@{r.username || "-"}</span>
                  {r.participantsCount != null && (
                    <span>{r.participantsCount.toLocaleString()}명</span>
                  )}
                  {r.isJoined && <span className="text-app-success">가입됨</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent join logs */}
      {recentLogs.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-app-text">
            <TrendingUp className="h-3.5 w-3.5" />
            최근 가입 기록
          </p>
          <div className="space-y-1">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5",
                  log.success
                    ? "border-app-success/20 bg-app-success-muted/20"
                    : "border-app-danger/20 bg-app-danger-muted/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-app-text">{log.title}</span>
                  {log.success ? (
                    <CheckCircle className="h-3 w-3 shrink-0 text-app-success" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0 text-app-danger" />
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-app-text-subtle">
                  {log.keyword} &middot; {new Date(log.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!recentLogs.length && !recentResults.length && (
        <div className="flex flex-col items-center justify-center py-6 text-app-text-muted">
          <Users className="mb-2 h-6 w-6" />
          <p className="text-xs">아직 검색 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
