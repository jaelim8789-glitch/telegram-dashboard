"use client";

import { Panel } from "@/components/ui/Panel";
import { useDashboardStore } from "@/store/useDashboardStore";
import {  Activity, MessageSquare, Users, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export function DashboardInspector() {
  const accounts = useDashboardStore((s) => s.accounts);
  const activeAccounts = accounts.filter((a) => a.status === "active");
  const totalSentToday = accounts.reduce((sum, a) => sum + a.todaySent, 0);
  const autoReplyActive = accounts.filter((a) => a.autoReplyEnabled).length;

  return (
    <div className="space-y-4 text-xs">
      <Panel title="빠른 개요">
        <div className="space-y-3">
          {[
            { icon: Users, label: "전체 계정", value: accounts.length, accent: "text-indigo-400" },
            { icon: Activity, label: "활성 계정", value: activeAccounts.length, accent: "text-emerald-400" },
            { icon: Zap, label: "자동 응답", value: autoReplyActive, accent: "text-cyan-400" },
            { icon: MessageSquare, label: "오늘 발송", value: totalSentToday, accent: "text-amber-400" },
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

      <Panel title="시스템 정보">
        <ul className="space-y-2 text-app-text-muted">
          <li className="flex justify-between">
            <span>대시보드</span>
            <span className="text-app-text">v2.0</span>
          </li>
          <li className="flex justify-between">
            <span>계정 제한</span>
            <span className="text-app-text">발송당 {10}명</span>
          </li>
          <li className="flex justify-between">
            <span>계정 상태</span>
            <span className="text-app-text">
              {activeAccounts.length}/{accounts.length} 활성
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
