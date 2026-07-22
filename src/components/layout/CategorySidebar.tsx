"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Send,
  Workflow,
  BarChart3,
  Settings,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useCategoryStore, type CategoryId, CATEGORIES } from "@/store/useCategoryStore";
import { cn } from "@/lib/cn";

const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  nicegram: MessageSquare,
  send: Send,
  macro: Workflow,
  analytics: BarChart3,
  settings: Settings,
};

export function CategorySidebar() {
  const activeCategory = useCategoryStore((s) => s.activeCategory);
  const setCategory = useCategoryStore((s) => s.setCategory);

  const handleNavigate = useCallback(
    (id: CategoryId) => {
      setCategory(id);
    },
    [setCategory],
  );

  return (
    <aside className="hidden sm:flex w-16 shrink-0 flex-col items-center gap-1 border-r border-app-border bg-app-surface py-3">
      {/* Logo */}
      <button
        type="button"
        onClick={() => handleNavigate("dashboard")}
        className="mb-3 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-all hover:scale-105"
        style={{
          background:
            activeCategory === "dashboard"
              ? "linear-gradient(135deg, #8B5CF6, #3B82F6)"
              : "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))",
        }}
        title="TeleMon 홈"
        aria-label="대시보드로 이동"
      >
        <Sparkles className="h-5 w-5 text-white" />
      </button>

      {/* Category icons */}
      <nav className="flex flex-col gap-1" role="navigation" aria-label="카테고리 탐색">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isActive = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate(cat.id)}
              className={cn(
                "relative flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-all group",
                isActive
                  ? "text-white"
                  : "text-app-text-muted hover:text-app-text hover:bg-app-card-hover",
              )}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }
                  : undefined
              }
              title={cat.tooltip}
              aria-label={cat.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {/* Active indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="category-active-indicator"
                  className="absolute -left-[1px] h-5 w-0.5 rounded-full"
                  style={{ backgroundColor: "#8B5CF6" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {/* Tooltip on hover (desktop only) */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-app-card px-2.5 py-1.5 text-[11px] font-medium text-app-text shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-app-border">
                {cat.tooltip}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section: Pixel Office link + AI status */}
      <div className="flex flex-col items-center gap-3 pb-1">
        {/* Pixel Office link */}
        <a
          href="https://pixeloffice.co"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-all group"
          title="Pixel Office"
          aria-label="Pixel Office 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="leading-none">Pixel</span>
        </a>

        {/* AI online status indicator */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-app-success" />
            </span>
            <span className="text-[9px] font-medium text-app-text-muted whitespace-nowrap">
              AI ON
            </span>
          </div>
          <span className="text-[8px] text-app-text-subtle">124건 처리</span>
        </div>

        {/* Open button */}
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-app-primary/10 text-app-primary hover:bg-app-primary/20 transition-all text-[10px] font-semibold"
          title="열기"
          aria-label="열기"
        >
          Open
        </button>
      </div>
    </aside>
  );
}