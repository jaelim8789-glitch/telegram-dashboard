"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";

const SEGMENT_LABELS: Record<string, string> = {
  app: "대시보드",
  accounts: "계정 관리",
  "chat-management": "채팅 관리",
  analytics: "분석",
  "ai-assistant": "AI 비서",
  "agent-market": "에이전트 마켓",
  "macro-editor": "매크로 편집기",
  chat: "AI 채팅",
  mobile: "모바일",
  admin: "관리자",
  dashboard: "대시보드",
  users: "사용자",
  distributors: "총판",
  settlements: "정산",
  "api-keys": "API 키",
  "style-profiles": "스타일 프로필",
  data: "데이터",
  settings: "설정",
  support: "고객지원",
  login: "로그인",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/app") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const items = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = SEGMENT_LABELS[seg] ?? seg;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-4 py-2 text-xs">
      <Link
        href="/app"
        className="flex items-center gap-1 text-app-text-muted hover:text-app-text transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-app-text-subtle" />
          {item.isLast ? (
            <span className="font-medium text-app-text">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-app-text-muted hover:text-app-text transition-colors"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
