"use client";

import { useCallback, useMemo } from "react";
import { Activity, MessageSquare, Users, Zap, X, Circle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Panel } from "@/components/ui/Panel";
import type { Account } from "@/types";

function accountStatusIcon(status: Account["status"]) {
  switch (status) {
    case "active": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "suspended": return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case "banned": return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    default: return <Circle className="h-3.5 w-3.5 text-app-text-muted" />;
  }
}

function statusLabel(status: Account["status"]) {
  switch (status) {
    case "active": return "활성";
    case "suspended": return "정지됨";
    case "banned": return "차단됨";
    default: return status;
  }
}

interface MobileInspectorSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileInspectorSheet({ open, onClose }: MobileInspectorSheetProps) {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const account = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === "active"), [accounts]);
  const totalSentToday = useMemo(() => accounts.reduce((sum, a) => sum + a.todaySent, 0), [accounts]);
  const autoReplyActive = useMemo(() => accounts.filter((a) => a.autoReplyEnabled).length, [accounts]);

  const title = useMemo(() => {
    if (!account) return "인스펙터";
    return (
      <div className="flex items-center gap-2">
        {accountStatusIcon(account.status)}
        <span className="truncate max-w-[200px]">{account.name?.trim() || account.phone}</span>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
          account.status === "active" && "bg-emerald-500/10 text-emerald-400",
          account.status === "suspended" && "bg-amber-500/10 text-amber-400",
          account.status === "banned" && "bg-red-500/10 text-red-400",
        )}>
          {statusLabel(account.status)}
        </span>
      </div>
    );
  }, [account]);

  const healthItems = useMemo(() => [
    { icon: Users, label: "전체 계정", value: accounts.length, accent: "text-indigo-400" },
    { icon: Activity, label: "활성 계정", value: activeAccounts.length, accent: "text-emerald-400" },
    { icon: Zap, label: "자동 응답", value: autoReplyActive, accent: "text-cyan-400" },
    { icon: MessageSquare, label: "오늘 발송", value: totalSentToday, accent: "text-amber-400" },
  ], [accounts, activeAccounts, autoReplyActive, totalSentToday]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
    >
      {account && (
        <div className="space-y-4 pb-6">
          <Panel title="계정 정보">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">전화번호</span>
                <span className="font-medium text-app-text tabular-nums">{account.phone}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">그룹</span>
                <span className="font-medium text-app-text">{account.groupCount}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">오늘 발송</span>
                <span className="font-medium text-app-text tabular-nums">{account.todaySent}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">자동 응답</span>
                <span className={cn(
                  "font-medium",
                  account.autoReplyEnabled ? "text-emerald-400" : "text-app-text-muted",
                )}>
                  {account.autoReplyEnabled ? "켜짐" : "꺼짐"}
                </span>
              </div>
              <div className="flex justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <span className="text-app-text-muted">마지막 활동</span>
                <span className="font-medium text-app-text tabular-nums">
                  {account.lastActivity
                    ? new Date(account.lastActivity).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "없음"}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="건강 상태">
            <div className="space-y-2 text-xs">
              {[
                { icon: CheckCircle2, label: "세션 상태", value: account.status === "active" ? "정상" : "비정상", accent: account.status === "active" ? "text-emerald-400" : "text-red-400" },
                { icon: Activity, label: "전송 시도", value: `${account.todaySent}회`, accent: "text-cyan-400" },
                { icon: MessageSquare, label: "그룹 수", value: `${account.groupCount}개`, accent: "text-indigo-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-3.5 w-3.5", item.accent)} />
                    <span className="text-app-text-muted">{item.label}</span>
                  </div>
                  <span className="font-semibold text-app-text tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="빠른 개요">
            <div className="space-y-2 text-xs">
              {healthItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-app-border bg-app-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-3.5 w-3.5", item.accent)} />
                    <span className="text-app-text-muted">{item.label}</span>
                  </div>
                  <span className="font-semibold text-app-text tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {!account && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-8 w-8 text-app-text-muted opacity-30" />
          <p className="mt-3 text-xs text-app-text-muted">계정을 선택하면 상세 정보를 확인할 수 있습니다</p>
        </div>
      )}
    </BottomSheet>
  );
}
