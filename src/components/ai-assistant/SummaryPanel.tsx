"use client";

import { UserPlus, Send, MessageSquare, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import type { SummaryItem } from "./types";

const ICON_MAP: Record<string, React.ReactNode> = {
  UserPlus: <UserPlus className="h-4 w-4" />,
  Send: <Send className="h-4 w-4" />,
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  TrendingUp: <TrendingUp className="h-4 w-4" />,
};

interface SummaryPanelProps {
  items: SummaryItem[];
}

export function SummaryPanel({ items }: SummaryPanelProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-app-border px-5 py-4">
        <h2 className="text-sm font-semibold text-app-text">오늘의 요약</h2>
        <p className="mt-0.5 text-xs text-app-text-muted">{dateStr}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-violet-500/10 bg-app-card-hover p-3.5 transition-colors hover:border-violet-500/20"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                {ICON_MAP[item.icon]}
              </span>
              <span className="text-xs font-medium text-app-text">{item.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-app-text-muted">{item.description}</p>
            <p className="mt-2 text-[10px] text-app-text-subtle">{item.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
