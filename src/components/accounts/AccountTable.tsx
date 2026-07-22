"use client";

import { Edit3, Trash2, RefreshCw } from "lucide-react";
import type { AccountEntry, AccountStatus } from "./types";

interface AccountTableProps {
  accounts: AccountEntry[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

const STATUS_BADGE: Record<AccountStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "활성" },
  suspended: { bg: "bg-amber-500/20", text: "text-amber-400", label: "정지" },
  error: { bg: "bg-red-500/20", text: "text-red-400", label: "오류" },
  unconfigured: { bg: "bg-gray-500/20", text: "text-gray-400", label: "미설정" },
};

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
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function AccountTable({ accounts, onEdit, onDelete, onRefresh }: AccountTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-app-text-muted">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-app-card-hover">
          <RefreshCw className="h-6 w-6 opacity-40" />
        </div>
        <p className="text-sm font-medium">표시할 계정이 없습니다</p>
        <p className="mt-1 text-xs">검색 조건을 변경하거나 새 계정을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-app-card">
          <tr className="border-b border-app-border text-left">
            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-app-text-muted">계정 이름</th>
            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-app-text-muted">전화번호</th>
            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-app-text-muted">상태</th>
            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-app-text-muted">마지막 활동</th>
            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-app-text-muted">작업</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const badge = STATUS_BADGE[account.status];
            return (
              <tr
                key={account.id}
                className="border-b border-app-border/50 transition-colors hover:bg-violet-500/5"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-app-text">{account.name}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-app-text-secondary">{account.phone}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-app-text-muted">{formatTime(account.lastActive)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(account.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-violet-500/10 hover:text-violet-400"
                      aria-label="편집"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(account.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRefresh(account.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-violet-500/10 hover:text-violet-400"
                      aria-label="새로고침"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}