"use client";

import { useCallback } from "react";
import { LayoutDashboard, Send, Activity, Sparkles, Settings, Plus, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, CATEGORY_META, type TabGroup } from "@/types";
import { cn } from "@/lib/cn";

const CATEGORY_ICONS: Record<TabGroup, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  send: Send,
  ops: Activity,
  ai: Sparkles,
  settings: Settings,
  new: Plus,
};

function hasTabs(group: TabGroup): boolean {
  return TABS.some((t) => t.group === group);
}

export function CategoryStrip() {
  const navView = useDashboardStore((s) => s.navView);
  const navCategory = useDashboardStore((s) => s.navCategory);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const navigateToCategory = useDashboardStore((s) => s.navigateToCategory);
  const navigateBack = useDashboardStore((s) => s.navigateBack);
  const haptics = useHapticFeedback();

  const categories = Object.keys(CATEGORY_META) as TabGroup[];
  const visibleCategories = categories.filter(hasTabs);

  const isDeep = navView === "category" || navView === "feature";

  const chatIndex = 0;
  const categoryStartIndex = 1;
  const totalItems = 1 + visibleCategories.length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let currentIndex = navView === "chat" ? chatIndex
      : visibleCategories.indexOf(navCategory ?? "dashboard") + categoryStartIndex;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % totalItems;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    } else {
      return;
    }

    if (currentIndex === chatIndex) {
      haptics.light();
      navigateToChat();
    } else {
      const catIdx = currentIndex - categoryStartIndex;
      if (catIdx >= 0 && catIdx < visibleCategories.length) {
        haptics.light();
        navigateToCategory(visibleCategories[catIdx]);
      }
    }
  }, [navView, navCategory, navigateToChat, navigateToCategory, visibleCategories, haptics]);

  return (
    <nav
      role="navigation"
      aria-label="카테고리 탐색"
      onKeyDown={handleKeyDown}
      className="flex items-center gap-0.5 border-b border-app-border/50 bg-app-surface/50 px-2 py-1.5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {isDeep && (
        <button
          type="button"
          onClick={() => { haptics.light(); navigateBack(); }}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors shrink-0 mr-0.5"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        onClick={() => { haptics.light(); navigateToChat(); }}
        tabIndex={0}
        aria-current={navView === "chat" ? "page" : undefined}
        aria-label="AI 대화"
        className={cn(
          "focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shrink-0",
          navView === "chat"
            ? "bg-app-primary/10 text-app-primary"
            : "text-app-text-muted hover:text-app-text hover:bg-app-card-hover"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">AI</span>
      </button>

      <div className="h-5 w-px bg-app-border/50 mx-0.5 shrink-0" aria-hidden="true" />

      {visibleCategories.map((group) => {
        const meta = CATEGORY_META[group];
        const Icon = CATEGORY_ICONS[group];
        const active = navView !== "chat" && navCategory === group;
        return (
          <button
            key={group}
            type="button"
            onClick={() => { haptics.light(); navigateToCategory(group); }}
            tabIndex={0}
            aria-current={active ? "page" : undefined}
            aria-label={`${meta.label} 카테고리`}
            className={cn(
              "focus-ring relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shrink-0",
              active
                ? "text-app-text"
                : "text-app-text-muted hover:text-app-text hover:bg-app-card-hover"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="hidden sm:inline">{meta.label}</span>
            {active && (
              <motion.span
                layoutId="category-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-app-primary"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
