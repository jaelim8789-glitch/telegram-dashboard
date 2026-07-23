"use client";

import { Search } from "lucide-react";
import type { AccountStatus } from "./types";

interface AccountFiltersBarProps {
  search: string;
  statusFilter: AccountStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AccountStatus | "all") => void;
}

const STATUS_OPTIONS: { value: AccountStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "연결됨" },
  { value: "suspended", label: "대기중" },
  { value: "error", label: "오류" },
];

export function AccountFiltersBar({ search, statusFilter, onSearchChange, onStatusChange }: AccountFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="계정 이름 또는 전화번호 검색..."
          className="w-full rounded-lg border border-app-border bg-app-card py-2.5 pl-9 pr-4 text-sm text-app-text placeholder:text-app-text-muted/60 outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
        />
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-app-border bg-app-card p-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-violet-500 text-white"
                : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
