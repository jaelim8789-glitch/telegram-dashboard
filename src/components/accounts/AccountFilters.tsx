"use client";

import { Search, ChevronDown } from "lucide-react";
import type { AccountStatus } from "./types";

interface AccountFiltersBarProps {
  search: string;
  statusFilter: AccountStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AccountStatus | "all") => void;
}

const STATUS_OPTIONS: { value: AccountStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "suspended", label: "정지" },
  { value: "error", label: "오류" },
  { value: "unconfigured", label: "미설정" },
];

export function AccountFiltersBar({ search, statusFilter, onSearchChange, onStatusChange }: AccountFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="계정 이름 또는 전화번호 검색..."
          className="w-full rounded-xl border border-app-border bg-app-card py-2.5 pl-9 pr-4 text-sm text-app-text placeholder:text-app-text-muted/60 outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
        />
      </div>
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as AccountStatus | "all")}
          className="w-full appearance-none rounded-xl border border-app-border bg-app-card py-2.5 pl-4 pr-10 text-sm text-app-text outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
      </div>
    </div>
  );
}
