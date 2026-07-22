"use client";

import { cn } from "@/lib/cn";

export function AccountStatusDot({ status, size = "sm" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const colorMap: Record<string, string> = {
    active: "bg-emerald-500", healthy: "bg-emerald-500",
    warning: "bg-amber-500", limited: "bg-amber-500",
    error: "bg-red-500", banned: "bg-red-500", disconnected: "bg-red-500",
    inactive: "bg-gray-500", pending: "bg-blue-500", sending: "bg-blue-500",
  };
  const sizeMap = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
  return <span className={cn("rounded-full shrink-0", sizeMap[size], colorMap[status] || "bg-gray-500")} />;
}

export function AccountStatusLabel({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    active: "정상", healthy: "정상",
    warning: "주의", limited: "제한",
    error: "오류", banned: "차단", disconnected: "연결끊김",
    inactive: "비활성", pending: "대기", sending: "발송중",
  };
  const colorMap: Record<string, string> = {
    active: "text-emerald-500", healthy: "text-emerald-500",
    warning: "text-amber-500", limited: "text-amber-500",
    error: "text-red-500", banned: "text-red-500", disconnected: "text-red-500",
    inactive: "text-gray-500", pending: "text-blue-500", sending: "text-blue-500",
  };
  return <span className={cn("text-xs font-medium", colorMap[status] || "text-gray-500")}>{labelMap[status] || status}</span>;
}
