"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, UserPlus, Send, Users, Search, CalendarClock,
  Bot, Zap, User, FileText, BarChart3, ScanSearch, Globe, Folder,
} from "lucide-react";
import { motion } from "framer-motion";
import { TABS, type TabDef } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  register: UserPlus,
  send: Send,
  scheduler: CalendarClock,
  group: Users,
  groupsearch: Search,
  linkinspector: ScanSearch,
  templates: FileText,
  autoreply: Bot,
  replymacro: Zap,
  folders: Folder,
  deliveryanalytics: BarChart3,
  channelhub: Globe,
  profile: User,
  log: FileText,
};

// Moved off the shared `.tab-premium` class (also used by the public
// marketing nav) so this refinement can't affect that unrelated page —
// fully local, restrained styling instead: no filled active pill, just a
// text/icon color shift plus a thin underline.
function TabButton({ tab, active, onSelect, badge }: { tab: TabDef; active: boolean; onSelect: () => void; badge?: number }) {
  const Icon = TAB_ICONS[tab.id];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] font-medium transition-colors duration-150",
        active ? "text-app-text" : "text-app-text-muted hover:text-app-text-secondary"
      )}
    >
      {Icon && <Icon className={cn("h-3.5 w-3.5 transition-colors", active ? "text-app-primary" : "text-app-text-subtle")} />}
      {tab.label}
      {badge != null && badge > 0 && (
        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="tab-underline"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-app-primary"
        />
      )}
    </button>
  );
}

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const tabBadges = useDashboardStore((s) => s.tabBadges);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const operateTabs = TABS.filter((t) => t.group === "operate");
  const manageTabs = TABS.filter((t) => t.group === "manage");

  // Horizontal overflow is common on narrower desktops and on mobile with
  // 11 destinations — without this, a scrolled-away tab (including the
  // active one) is invisible with no indication there's more to see.
  function updateFade() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    updateFade();
    const el = scrollRef.current;
    if (!el) return;
    const onResize = () => updateFade();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(updateFade);
    observer.observe(el);
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  // Keep the active tab in view (e.g. after a state change elsewhere), and
  // keep fade indicators in sync with it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>('[aria-current="page"]');
    activeEl?.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateFade();
  }, [activeTab]);

  return (
    <nav aria-label="작업 영역 이동" className="relative flex shrink-0 border-b border-app-border/50 bg-app-surface/50">
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-app-surface to-transparent" aria-hidden="true" />
      )}
      <div
        ref={scrollRef}
        onScroll={updateFade}
        style={{ scrollbarWidth: "none" }}
        className="flex items-center gap-0.5 overflow-x-auto px-3 [&::-webkit-scrollbar]:hidden"
      >
        <div role="group" aria-label="일상 운영" className="flex items-center gap-0.5">
          {operateTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={tab.id === activeTab} onSelect={() => setActiveTab(tab.id)} badge={tabBadges[tab.id]} />
          ))}
        </div>
        <div className="mx-1 h-4 w-px shrink-0 self-center bg-app-border" aria-hidden="true" />
        <div role="group" aria-label="계정 및 자동화 관리" className="flex items-center gap-0.5">
          {manageTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={tab.id === activeTab} onSelect={() => setActiveTab(tab.id)} badge={tabBadges[tab.id]} />
          ))}
        </div>
      </div>
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-app-surface to-transparent" aria-hidden="true" />
      )}
    </nav>
  );
}
