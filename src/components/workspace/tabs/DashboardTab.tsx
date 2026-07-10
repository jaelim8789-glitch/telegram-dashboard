"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, BarChart3, CheckCircle2, Clock, MessageSquare, RefreshCw,
  SendHorizonal, ShieldCheck, Users, XCircle, Zap,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { Broadcast, BroadcastStatus } from "@/types";
import { isRecurringActive } from "@/types";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소됨" },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

function StatCard({ icon, label, value, sub, trend, accent = "from-indigo-500 to-purple-500" }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 transition-all duration-200 hover:border-app-border-strong hover:bg-app-card-hover">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", `bg-gradient-to-br ${accent}`)}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            trend === "up" && "bg-app-success-muted text-app-success",
            trend === "down" && "bg-app-danger-muted text-app-danger",
            trend === "neutral" && "bg-app-card-hover text-app-text-muted",
          )}>
            {trend === "up" && "▲"} {trend === "down" && "▼"} {trend === "neutral" && "―"}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-app-text">{value}</div>
        <div className="mt-0.5 text-xs text-app-text-muted">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-app-text-subtle">{sub}</div>}
      </div>
    </div>
  );
}

export function DashboardTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<Broadcast[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
    loadLogs();
    loadUpcoming();
  }, [fetchAccounts]);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      setLogs(await api.fetchLogs());
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  }

  async function loadUpcoming() {
    setUpcomingLoading(true);
    try {
      setUpcoming(await api.fetchUpcomingBroadcasts());
    } catch { setUpcoming([]); }
    finally { setUpcomingLoading(false); }
  }

  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  async function loadRecurring() {
    setRecurringLoading(true);
    try {
      setRecurring(await api.fetchRecurringBroadcasts());
    } catch { setRecurring([]); }
    finally { setRecurringLoading(false); }
  }

  useEffect(() => {
    loadRecurring();
  }, []);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === "active"), [accounts]);
  const bannedAccounts = useMemo(() => accounts.filter((a) => a.status === "banned"), [accounts]);
  const totalSentToday = useMemo(() => accounts.reduce((sum, a) => sum + a.todaySent, 0), [accounts]);
  const autoReplyEnabled = useMemo(() => accounts.filter((a) => a.autoReplyEnabled), [accounts]);

  const sentCount = useMemo(() => logs.filter((l) => l.status === "sent").length, [logs]);
  const totalBroadcasts = logs.length;
  const successRate = totalBroadcasts > 0 ? Math.round((sentCount / totalBroadcasts) * 100) : 0;

  const recentLogs = useMemo(() => [...logs].sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 10), [logs]);

  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (accountsError && accounts.length === 0) {
    return (
      <Panel title="시스템 상태">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <XCircle className="mb-3 h-10 w-10 text-app-danger" />
          <p className="text-sm font-medium text-app-danger">서버에 연결할 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted">{accountsError}</p>
          <button
            onClick={() => fetchAccounts()}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Stat Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-app-text">운영 개요</h2>
          <button
            onClick={() => { fetchAccounts(); loadLogs(); loadUpcoming(); loadRecurring(); }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="연결된 계정"
            value={activeAccounts.length}
            sub={`전체 ${accounts.length}개${bannedAccounts.length > 0 ? ` · ${bannedAccounts.length}개 차단` : ""}`}
            accent="from-indigo-500 to-purple-500"
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="자동 응답 활성"
            value={autoReplyEnabled.length}
            sub={`전체 ${accounts.length}개 중`}
            accent="from-emerald-500 to-teal-500"
          />
          <StatCard
            icon={<SendHorizonal className="h-5 w-5" />}
            label="오늘 발송"
            value={totalSentToday}
            sub="계정 전체 합계"
            accent="from-cyan-500 to-blue-500"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="발송 성공률"
            value={totalBroadcasts > 0 ? `${successRate}%` : "-"}
            sub={`${sentCount}건 성공 / ${totalBroadcasts}건 전체`}
            accent="from-orange-500 to-amber-500"
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="시스템 상태"
            value={accountsError ? "오류" : "정상"}
            sub={activeAccounts.length > 0 ? "모든 서비스 운영 중" : "계정 연결 필요"}
            accent="from-violet-500 to-pink-500"
          />
        </div>
      </div>

      {/* Middle row: Scheduled + Recurring + Activity feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming scheduled broadcasts */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              예약된 발송
            </div>
          }
          className="lg:col-span-1"
        >
          {upcomingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-xs text-app-text-muted">예약된 발송이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
                    <p className="text-[11px] text-app-text-subtle">
                      {new Date(`${b.scheduledAt}Z`).toLocaleString("ko-KR", { hour12: false })}
                      {" · "}{b.recipients.length}개 대상
                    </p>
                  </div>
                  <Badge tone="info">예약</Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Active recurring broadcasts */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              반복 발송
            </div>
          }
          className="lg:col-span-1"
        >
          {recurringLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <RefreshCw className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-xs text-app-text-muted">활성 중인 반복 발송이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recurring.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
                    <p className="text-[11px] text-app-text-subtle">
                      {b.recurringIntervalMinutes}분 간격
                      {b.nextScheduledAt && ` · 다음: ${new Date(`${b.nextScheduledAt}Z`).toLocaleString("ko-KR", { hour12: false })}`}
                    </p>
                  </div>
                  <Badge tone="info">반복 중</Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Recent activity */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              최근 활동
            </div>
          }
          className="lg:col-span-2"
        >
          {logsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-sm font-medium text-app-text">아직 활동 기록이 없습니다</p>
              <p className="mt-1 text-xs text-app-text-muted">계정을 연결하고 메시지를 발송하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-app-border">
              {recentLogs.map((b, i) => {
                const meta = STATUS_TONE[b.status];
                const recurring = isRecurringActive(b);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="truncate text-app-text">{b.message}</div>
                      <div className="text-xs text-app-text-muted">
                        {formatRelativeTime(b.createdAt)}
                        {b.scheduledAt && new Date(`${b.scheduledAt}Z`) > new Date()
                          ? ` · ${new Date(b.scheduledAt).toLocaleString("ko-KR", { hour12: false })} 예약`
                          : recurring
                            ? ` · ${b.recurringIntervalMinutes}분 간격 반복`
                            : ` · 수신자 ${b.recipients.length}명`
                        }
                        {b.errorMessage && <span className="ml-1 text-app-danger">· {b.errorMessage}</span>}
                      </div>
                    </div>
                    {recurring ? (
                      <Badge tone="info">반복 중</Badge>
                    ) : b.status === "sent" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-app-success" />
                    ) : b.status === "failed" ? (
                      <XCircle className="h-4 w-4 shrink-0 text-app-danger" />
                    ) : (
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Account overview */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            계정 현황
          </div>
        }
        description="연결된 모든 Telegram 계정의 상태와 주요 지표"
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-app-text-subtle" />
            <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계정</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>자동 응답</TableHead>
                <TableHead>오늘 발송</TableHead>
                <TableHead>그룹</TableHead>
                <TableHead>최근 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{a.name || a.phone}</div>
                    {a.name && <div className="text-xs text-app-text-muted">{a.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      a.status === "active" && "bg-app-success-muted text-app-success",
                      a.status === "inactive" && "bg-app-card-hover text-app-text-muted",
                      a.status === "banned" && "bg-app-danger-muted text-app-danger",
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        a.status === "active" && "bg-app-success",
                        a.status === "inactive" && "bg-app-text-subtle",
                        a.status === "banned" && "bg-app-danger",
                      )} />
                      {a.status === "active" ? "활성" : a.status === "inactive" ? "비활성" : "차단"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {a.autoReplyEnabled ? (
                      <span className="text-app-success">켜짐</span>
                    ) : (
                      <span className="text-app-text-subtle">꺼짐</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{a.todaySent}</TableCell>
                  <TableCell className="tabular-nums text-app-text-muted">{a.groupCount}</TableCell>
                  <TableCell className="text-xs text-app-text-muted">
                    {a.lastActivity ? formatRelativeTime(a.lastActivity) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
