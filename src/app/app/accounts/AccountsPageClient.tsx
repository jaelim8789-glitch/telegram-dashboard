"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { MOCK_ACCOUNTS } from "@/components/accounts/mockData";
import { AccountTable } from "@/components/accounts/AccountTable";
import { AccountFiltersBar } from "@/components/accounts/AccountFilters";
import { AccountPagination } from "@/components/accounts/AccountPagination";
import { useToast } from "@/components/ui/Toast";
import type { AccountEntry, AccountStatus } from "@/components/accounts/types";

const PAGE_SIZE = 10;

type SortKey = "name" | "status" | "lastActive" | "todaySent";

function sortAccounts(list: AccountEntry[], key: SortKey | null, dir: "asc" | "desc" | null): AccountEntry[] {
  if (!key || !dir) return list;
  return [...list].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const cmp = typeof aVal === "string" && typeof bVal === "string"
      ? aVal.localeCompare(bVal)
      : (aVal as number) - (bVal as number);
    return dir === "asc" ? cmp : -cmp;
  });
}

export function AccountsPageClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const { toast } = useToast();

  const filteredAccounts = useMemo(() => {
    return MOCK_ACCOUNTS.filter((acc) => {
      const matchesSearch =
        !search ||
        acc.name.toLowerCase().includes(search.toLowerCase()) ||
        acc.phone.includes(search);
      const matchesStatus = statusFilter === "all" || acc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const sortedAccounts = useMemo(() => {
    return sortAccounts(filteredAccounts, sortKey, sortDir);
  }, [filteredAccounts, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / PAGE_SIZE));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAccounts.slice(start, start + PAGE_SIZE);
  }, [sortedAccounts, currentPage]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: AccountStatus | "all") => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev !== key) return key as SortKey;
      return prev;
    });
    setSortDir((prev) => {
      if (!prev) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
    setCurrentPage(1);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const account = MOCK_ACCOUNTS.find((a) => a.id === id);
    toast("info", `편집: ${account?.name}`, {
      description: "계정 편집 기능은 추후 구현될 예정입니다.",
    });
  }, [toast]);

  const handleDelete = useCallback((id: string) => {
    const account = MOCK_ACCOUNTS.find((a) => a.id === id);
    toast("success", `"${account?.name}" 계정이 삭제되었습니다.`);
  }, [toast]);

  const handleRefresh = useCallback((id: string) => {
    const account = MOCK_ACCOUNTS.find((a) => a.id === id);
    toast("info", `${account?.name} 계정 상태를 갱신했습니다.`);
  }, [toast]);

  const handleAddAccount = useCallback(() => {
    toast("info", "계정 추가", {
      description: "계정 등록 페이지로 이동합니다.",
    });
  }, [toast]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-app-bg">
      <div className="shrink-0 border-b border-app-border bg-app-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-app-text">계정 관리</h1>
          <button
            onClick={handleAddAccount}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-blue-600 hover:shadow-md hover:shadow-violet-500/30 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            계정 추가
          </button>
        </div>
        <div className="mt-3">
          <AccountFiltersBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="rounded-2xl border border-violet-500/15 bg-app-card overflow-hidden">
          <AccountTable
            accounts={paginatedAccounts}
            sortKey={sortKey}
            sortDir={sortDir ?? undefined}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
          <AccountPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedAccounts.length}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}
