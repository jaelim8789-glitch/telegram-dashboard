"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Send, Users, FileText, Bot, Search, ScanSearch,
  CalendarClock, UserPlus, Zap, BarChart3, Globe, Folder, Target,
  HeartPulse, UserCog, MessageCircle, Workflow, Star, MoreHorizontal,
  Share2, TrendingUp, Sparkles, Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { QuickActionSheet } from "./QuickActionSheet";
import { TABS, type TabDef, getAccountDisplayName } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";
import AutonomousGrowthTab from './tabs/AutonomousGrowthTab';

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
  health: HeartPulse,
  campaigns: Target,
  folders: Folder,
  deliveryanalytics: BarChart3,
  channelhub: Globe,
  team: UserCog,
  profile: UserCog,
  log: FileText,
  guestbot: MessageCircle,
  drafts: FileText,
  triggers: Workflow,
  stars: Bot,
  myai: Bot,
  aireply: MessageCircle,
  aibroadcast: Send,
  aioperations: BarChart3,
  aiopscenter: Bot,
  aiusage: BarChart3,
  referral: Share2,
  operator: Zap,
  styleprofile: FileText,
  growthloop: TrendingUp,
  fortune: Sparkles,
  telegram: MessageCircle,
  pixeloffice: Building2,
};

// 모바일 하단 핵심 탭 — AI 대화 첫 화면
const MOBILE_MAIN_TAB_IDS = ["dashboard", "send", "pixeloffice"];

function TabButton({ tab, active, onSelect, badge, mobile }: { tab: TabDef; active: boolean; onSelect: () => void; badge?: number; mobile?: boolean }) {
  const Icon = TAB_ICONS[tab.id];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      data-tour={`nav-${tab.id}`}
      className={cn(
        "focus-ring relative flex items-center justify-center transition-all duration-200",
        mobile
          ? "flex-col gap-0.5 flex-1 min-h-[48px] min-w-[48px] py-1"
          : "shrink-0 gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] font-medium min-h-[44px]",
        active
          ? (mobile ? "text-app-primary" : "text-app-text")
          : "text-app-text-muted hover:text-app-text-secondary"
      )}
    >
      {Icon && (
        <Icon className={cn(
          "transition-all duration-200",
          mobile ? "h-5 w-5" : "h-3.5 w-3.5",
          active ? "text-app-primary" : "text-app-text-subtle"
        )} />
      )}
      <span className={mobile ? "text-[10px] leading-none" : "hidden sm:inline"}>{mobile ? (tab.shortLabel ?? tab.label) : tab.label}</span>
      <span className={cn(mobile ? "hidden" : "sm:hidden")}>{tab.shortLabel ?? tab.label}</span>
      {badge != null && badge > 0 && (
        <span className={cn(
          "flex items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold leading-none text-white",
          mobile ? "absolute -top-0.5 right-1/4 h-4 min-w-[16px]" : "h-4 min-w-[16px]"
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {active && !mobile && (
        <motion.span
          layoutId="tab-underline"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-app-primary"
        />
      )}
      {mobile && (
        <>
          {/* Active indicator: gold top line */}
          <motion.span
            layoutId="mobile-tab-active"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className={cn(
              "absolute top-0 w-8 h-0.5 rounded-full",
              active ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: active ? "linear-gradient(90deg, var(--color-accent), var(--color-gold-deep))" : undefined,
              boxShadow: active ? "0 0 8px var(--color-accent-glow)" : undefined,
            }}
          />
          {/* Background highlight */}
          <span className={cn(
            "absolute inset-1.5 rounded-xl transition-all duration-200",
            active ? "bg-app-primary/8 shadow-sm" : "hover:bg-app-card-hover/50"
          )} />
        </>
      )}
    </button>
  );
}

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const tabBadges = useDashboardStore((s) => s.tabBadges);
  const haptics = useHapticFeedback();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const dashboardTabs = TABS.filter((t) => t.group === "dashboard");
  const sendTabs = TABS.filter((t) => t.group === "send");
  const opsTabs = TABS.filter((t) => t.group === "ops");
  const aiTabs = TABS.filter((t) => t.group === "ai");
  const settingsTabs = TABS.filter((t) => t.group === "settings");
  const newTabs = TABS.filter((t) => t.group === "new");
  const allTabs = [...dashboardTabs, ...sendTabs, ...opsTabs, ...aiTabs, ...settingsTabs, ...newTabs];

  // 모바일
  const mobileMainTabs = allTabs.filter((t) => MOBILE_MAIN_TAB_IDS.includes(t.id));
  const hasMoreTab = MOBILE_MAIN_TAB_IDS.includes("more") || true;
  const moreGroups: { label: string; tabs: TabDef[] }[] = [
    { label: "대시보드", tabs: dashboardTabs },
    { label: "발송", tabs: sendTabs.filter(t => !MOBILE_MAIN_TAB_IDS.includes(t.id)) },
    { label: "운영", tabs: opsTabs },
    { label: "AI", tabs: aiTabs.filter(t => t.id !== "myai") },
    { label: "설정", tabs: settingsTabs },
  ].filter((g) => g.tabs.length > 0);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>('[aria-current="page"]');
    activeEl?.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateFade();
  }, [activeTab]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = allTabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % allTabs.length;
      setActiveTab(allTabs[nextIndex].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + allTabs.length) % allTabs.length;
      setActiveTab(allTabs[prevIndex].id);
    }
  }

  // ── 모바일 ──
  if (isMobile) {
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const accountLabel = selectedAccount ? getAccountDisplayName(selectedAccount).slice(0, 6) : "계정";
    return (
      <>
        {/* Top gold accent line on the bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
          <nav
            className="border-t-0 bg-app-surface/95 backdrop-blur-xl"
            style={{
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
              borderTop: "1px solid var(--color-border)",
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-around max-w-lg mx-auto px-1">
              {mobileMainTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTab}
                  onSelect={() => { haptics.light(); setActiveTab(tab.id); setMoreOpen(false); }}
                  badge={tabBadges[tab.id]}
                  mobile
                />
              ))}
              {/* "더보기" 버튼 */}
              {hasMoreTab && (
                <button
                  type="button"
                  onClick={() => { haptics.light(); setMoreOpen(true); }}
                  className={`flex flex-col gap-0.5 flex-1 min-h-[48px] min-w-[48px] py-1 items-center justify-center transition-all duration-200 relative ${
                    moreOpen ? "text-app-primary" : "text-app-text-muted hover:text-app-text-secondary"
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] leading-none">더보기</span>
                  <span className="absolute inset-1.5 rounded-xl transition-all duration-200 hover:bg-app-card-hover/50" />
                </button>
              )}
              <button
                type="button"
                onClick={() => { haptics.light(); setShowAccountPicker(true); }}
                className="flex shrink-0 flex-col items-center gap-0.5 py-1.5 px-1 min-w-0 min-h-[44px] text-app-text-muted hover:text-app-text-secondary transition-colors relative"
              >
                <span className="text-[10px] leading-none">{accountLabel}</span>
              </button>
              <QuickActionSheet />
            </div>
          </nav>
        </div>

        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="fixed bottom-16 left-0 right-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-app-card border-t border-app-border/60 px-4 pb-6 pt-4"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-app-border" />
                {moreGroups.map((group) => (
                  <div key={group.label} className="mb-3">
                    <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-1.5 px-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {group.tabs.map((tab) => {
                        const Icon = TAB_ICONS[tab.id];
                        const active = tab.id === activeTab;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => { haptics.light(); setActiveTab(tab.id); setMoreOpen(false); }}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-xl py-3 transition-colors",
                              active ? "bg-app-primary/10 text-app-primary" : "text-app-text-muted hover:bg-app-card-hover"
                            )}
                          >
                            {Icon && <Icon className="h-5 w-5" />}
                            <span className="text-[10px] leading-tight text-center">{tab.shortLabel ?? tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAccountPicker && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowAccountPicker(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="fixed bottom-16 left-0 right-0 z-50 max-h-[45vh] overflow-y-auto rounded-t-2xl bg-app-card border-t border-app-border/60 px-4 pb-6 pt-4"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-app-border" />
                <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-2 px-1">계정 전환</p>
                <div className="max-h-[35vh] overflow-y-auto space-y-1">
                  {accounts.map((account) => {
                    const isSelected = account.id === selectedAccountId;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          useDashboardStore.getState().selectAccount(account.id);
                          setShowAccountPicker(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          isSelected ? "bg-app-primary/10 text-app-primary" : "text-app-text-muted hover:bg-app-card-hover"
                        )}
                      >
                        <span className="text-sm font-medium truncate flex-1">{getAccountDisplayName(account)}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-app-primary">선택됨</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── 데스크톱 ──
  const desktopSectionGroups: { label: string; tabs: TabDef[] }[] = [
    { label: "대시보드", tabs: dashboardTabs },
    { label: "발송", tabs: sendTabs },
    { label: "운영", tabs: opsTabs },
    { label: "AI", tabs: aiTabs },
    { label: "설정", tabs: settingsTabs },
    { label: "신규", tabs: newTabs },
  ].filter((g) => g.tabs.length > 0);

  return (
    <nav aria-label="작업 영역 이동" className="relative flex shrink-0 border-b border-app-border/50 bg-app-surface/50">
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-app-surface to-transparent" aria-hidden="true" />
      )}
      <div
        ref={scrollRef}
        onScroll={updateFade}
        onKeyDown={handleKeyDown}
        style={{ scrollbarWidth: "none" }}
        className="flex items-stretch gap-0 overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden"
      >
        {desktopSectionGroups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="flex items-center gap-0.5 border-r border-app-border/40 last:border-r-0 px-1 first:pl-0">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-app-text-subtle/60 px-1.5 select-none shrink-0">{group.label}</span>
            {group.tabs.map((tab) => (
              <TabButton key={tab.id} tab={tab} active={tab.id === activeTab} onSelect={() => { haptics.light(); setActiveTab(tab.id); }} badge={tabBadges[tab.id]} />
            ))}
          </div>
        ))}
      </div>
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-app-surface to-transparent" aria-hidden="true" />
      )}
    </nav>
  );
}
