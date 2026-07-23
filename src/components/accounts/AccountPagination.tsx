"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AccountPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AccountPagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: AccountPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-3 px-5 py-3 sm:flex-row sm:justify-between">
      <span className="text-xs text-app-text-muted">
        {startItem}-{endItem} / {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="flex min-h-11 min-w-11 items-center justify-center text-xs text-app-text-muted">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                currentPage === page
                  ? "bg-violet-500 text-white"
                  : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
