"use client";

import { UserPlus, CheckCircle2, Clock, Calendar, Shield } from "lucide-react";
import type { SummaryItem } from "./types";

const ICON_MAP: Record<string, React.ReactNode> = {
  UserPlus: <UserPlus className="h-4 w-4" />,
  CheckCircle2: <CheckCircle2 className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
};

const ICON_COLOR: Record<string, string> = {
  green: "bg-green-500/10 text-green-400",
  violet: "bg-violet-500/10 text-violet-400",
  amber: "bg-yellow-500/10 text-yellow-400",
  blue: "bg-blue-500/10 text-blue-400",
  red: "bg-red-500/10 text-red-400",
};

interface SummaryPanelProps {
  items: SummaryItem[];
  selectedCardId?: string | null;
  onCardClick?: (id: string, title: string) => void;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function SummaryPanel({ items, selectedCardId, onCardClick }: SummaryPanelProps) {
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
        <h2 className="text-sm font-bold tracking-tight text-app-text">오늘의 요약</h2>
        <p className="mt-0.5 text-xs font-normal text-app-text-muted">{dateStr}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.map((item) => {
          const isSelected = selectedCardId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onCardClick?.(item.id, item.title)}
              className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all hover:shadow-lg hover:shadow-purple-500/10 ${
                isSelected
                  ? "border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/20"
                  : "border-violet-500/10 bg-app-card-hover hover:border-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${ICON_COLOR[item.iconColor ?? "violet"]}`}>
                  {ICON_MAP[item.icon]}
                </span>
                <span className="text-xs font-medium text-app-text">{item.title}</span>
              </div>
              <p className="text-xs font-medium leading-relaxed text-app-text-muted">{item.description}</p>
              <p className="mt-2 text-[10px] font-normal text-app-text-subtle">{formatRelativeTime(item.timestamp)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
