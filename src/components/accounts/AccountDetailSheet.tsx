"use client";

import { memo } from "react";
import { X, Phone, Calendar, Hash, Send, Activity } from "lucide-react";
import type { AccountEntry } from "./types";

interface AccountDetailSheetProps {
  account: AccountEntry | null;
  onClose: () => void;
}

function formatTime(iso: string): string {
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
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const AccountDetailSheet = memo(function AccountDetailSheet({ account, onClose }: AccountDetailSheetProps) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-app-border bg-app-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-app-text">{account.name}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-all hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-app-border bg-app-surface p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-app-text-muted">
                <Phone className="h-3 w-3" /> 전화번호
              </div>
              <p className="text-sm font-medium text-app-text">{account.phone}</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-app-text-muted">
                <Send className="h-3 w-3" /> 오늘 발송
              </div>
              <p className="text-sm font-medium tabular-nums text-app-text">{account.todaySent.toLocaleString()}건</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-app-text-muted">
                <Hash className="h-3 w-3" /> 그룹 수
              </div>
              <p className="text-sm font-medium tabular-nums text-app-text">{account.groupCount}개</p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-app-text-muted">
                <Calendar className="h-3 w-3" /> 등록일
              </div>
              <p className="text-sm font-medium text-app-text">
                {new Date(account.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-app-text-muted">
              <Activity className="h-3 w-3" /> 마지막 활동
            </div>
            <p className="text-sm font-medium text-app-text">{formatTime(account.lastActive)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
