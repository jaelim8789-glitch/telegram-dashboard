"use client";

import { memo } from "react";
import { Edit3, Trash2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { AccountEntry, AccountStatus } from "./types";

interface AccountTableProps {
  accounts: AccountEntry[];
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

type SortableColumn = "name" | "status" | "lastActive" | "todaySent";

const STATUS_BADGE: Record<AccountStatus, { bg: string; text: string; label: string; dot: boolean }> = {
  active: { bg: "bg-green-500/10", text: "text-green-400", label: "연결됨", dot: true },
  suspended: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "대기중", dot: false },
  error: { bg: "bg-red-500/10", text: "text-red-400", label: "오류", dot: false },
  unconfigured: { bg: "bg-gray-500/10", text: "text-gray-400", label: "미설정", dot: false },
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

interface SortableHeaderProps {
  label: string;
  column: SortableColumn;
  sortKey: string | null | undefined;
  sortDir: "asc" | "desc" | undefined;
  onSort: ((key: string) => void) | undefined;
}

const SortableHeader = memo(function SortableHeader({ label, column, sortKey, sortDir, onSort }: SortableHeaderProps) {
  const isActive = sortKey === column;
  return (
    <button
      onClick={() => onSort?.(column)}
      className="group inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-app-text-muted transition-colors hover:text-app-text"
    >
      {label}
      {isActive ? (
        sortDir === "asc" ? (
          <ArrowUp className="h-3 w-3 text-violet-400" />
        ) : (
          <ArrowDown className="h-3 w-3 text-violet-400" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
});

export function AccountTable({ accounts, sortKey, sortDir, onSort, onEdit, onDelete, onRefresh }: AccountTableProps) {
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
        <thead>
          <tr className="border-b border-app-border/50 text-left">
            <th className="px-5 py-3">
              <SortableHeader label="계정명" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-app-text-muted">전화번호</th>
            <th className="px-5 py-3">
              <SortableHeader label="오늘 발송" column="todaySent" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="상태" column="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="마지막 활동" column="lastActive" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-app-text-muted">작업</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const badge = STATUS_BADGE[account.status];
            return (
              <tr
                key={account.id}
                className="group border-b border-app-border/50 transition-colors hover:bg-app-card-hover"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-app-text">{account.name}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-app-text-secondary">{account.phone}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm tabular-nums text-app-text">
                    {account.todaySent.toLocaleString()}건
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                    {badge.dot && (
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                    {badge.label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-app-text-muted">{formatTime(account.lastActive)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
