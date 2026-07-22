"use client";

import { useCallback, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useAccountFilter() {
  const accounts = useDashboardStore(s => s.accounts);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = accounts.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery && !a.phone.includes(searchQuery)) return false;
    return true;
  });

  const statusCounts = { all: accounts.length, active: accounts.filter(a => a.status === "active").length, error: accounts.filter(a => a.status === "error" || a.status === "banned").length, other: accounts.filter(a => a.status !== "active" && a.status !== "error" && a.status !== "banned").length };

  return { filtered, statusFilter, setStatusFilter, searchQuery, setSearchQuery, statusCounts };
}
