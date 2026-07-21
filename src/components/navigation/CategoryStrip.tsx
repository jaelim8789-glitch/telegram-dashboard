"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard, Send, Activity, Sparkles, Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
  const navFeature = useDashboardStore((s) => s.navFeature);
  const tabBadges = useDashboardStore((s) => s.tabBadges);
  const accounts = useDashboardStore((s) => s.accounts);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const navigateToCategory = useDashboardStore((s) => s.navigateToCategory);
  const navigateBack = useDashboardStore((s) => s.navigateBack);
  const haptics = useHapticFeedback();

  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const categoryBadges = useMemo(() => {
    const badges: Partial<Record<TabGroup, number>> = {};
    const sendBadge = tabBadges["send"];
    if (sendBadge) badges.send = sendBadge;
    const unhealthy = accounts.filter((a) => a.status !== "active").length;
    if (unhealthy > 0) badges.ops = unhealthy;
    return badges;
  }, [tabBadges, accounts]);

  const categories = Object.keys(CATEGORY_META) as TabGroup[];
  const visibleCategories = categories.filter(hasTabs);

  const isDeep = navView === "category" || navView === "feature";
  const featureTab = navFeature ? TABS.find((t) => t.id === navFeature) : null;
  const categoryMeta = navCategory ? CATEGORY_META[navCategory] : null;

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
    <>
      <div ref={sentinelRef} className="pointer-events-none absolute top-0 h-px" />
      <nav
        role="navigation"
        aria-label="카테고리 탐색"
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-0.5 border-b border-app-border/50 bg-app-surface/50 px-2 py-1.5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden",
          "sticky top-0 z-20 transition-shadow duration-200",
          scrolled ? "shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "shadow-none",
          "backdrop-blur-md bg-app-surface/70",
        )}
        style={{ scrollbarWidth: "none" }}
      >
      {/* ── Breadcrumb ── */}
      {isDeep && (
        <div className="flex items-center gap-0.5 shrink-0 mr-1">
          <button
            type="button"
            onClick={() => { haptics.light(); navigateBack(); }}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors shrink-0"
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {navView === "category" && categoryMeta ? (
            <div className="flex items-center gap-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => { haptics.light(); navigateToChat(); }}
                className="text-app-text-muted hover:text-app-primary hover:underline transition-colors"
              >
                AI
              </button>
              <ChevronRight className="h-3 w-3 text-app-text-subtle" />
              <span className="font-semibold text-app-text">{categoryMeta.label}</span>
            </div>
          ) : navView === "feature" && categoryMeta && featureTab ? (
            <div className="flex items-center gap-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => { haptics.light(); navigateToCategory(navCategory!); }}
                className="text-app-text-muted hover:text-app-primary hover:underline transition-colors"
              >
                {categoryMeta.label}
              </button>
              <ChevronRight className="h-3 w-3 text-app-text-subtle" />
              <span className="font-semibold text-app-text">{featureTab.shortLabel ?? featureTab.label}</span>
            </div>
          ) : null}

          <div className="h-5 w-px bg-app-border/50 mx-1 shrink-0" aria-hidden="true" />
        </div>
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
        const badge = categoryBadges[group];
        return (
          <button
            key={group}
            type="button"
            onClick={() => { haptics.light(); navigateToCategory(group); }}
            tabIndex={0}
            aria-current={active ? "page" : undefined}
            aria-label={`${meta.label} 카테고리${badge ? `, ${badge}개 알림` : ""}`}
            className={cn(
              "focus-ring relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shrink-0",
              active
                ? "text-app-text"
                : "text-app-text-muted hover:text-app-text hover:bg-app-card-hover"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="hidden sm:inline">{meta.label}</span>
            {badge != null && badge > 0 && (
              <span className="flex items-center justify-center rounded-full bg-app-danger px-1.5 h-4 min-w-[16px] text-[9px] font-bold leading-none text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            {active && (
              <motion.span
                layoutId="category-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-app-primary"
              />
            )}
          </button>
        );
      }      )}
    </nav>
    </>
  );
}
