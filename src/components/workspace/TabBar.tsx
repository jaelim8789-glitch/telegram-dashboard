"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, MessageCircle, Users, TrendingUp, UserPlus, Zap, BarChart3, Globe, Sparkles, Settings, ScanSearch } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { useAccountCache } from "@/lib/useAccountCache";
import { useEffect, useState } from "react";


// 모바일 하단 핵심 탭 — AI 대화 첫 화면 (v3: AI 중심)
const MOBILE_MAIN_TAB_IDS = ["myai", "send", "group"];

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
          ? "flex-col gap-0.5 flex-1 min-h-[60px] min-w-[60px] py-2" // 터치 타겟 크기 증가
          : "shrink-0 gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] font-medium min-h-[44px]",
        active
          ? (mobile ? "text-app-primary" : "text-app-text")
          : "text-app-text-muted hover:text-app-text-secondary"
      )}
    >
      {Icon && (
        <Icon className={cn(
          "transition-all duration-200",
          mobile ? "h-6 w-6" : "h-3.5 w-3.5", // 모바일 아이콘 크기 증가
          active ? "text-app-primary" : "text-app-text-subtle"
        )} />
      )}
      <span className={mobile ? "text-[11px] leading-none" : "hidden sm:inline"}>{mobile ? (tab.shortLabel ?? tab.label) : tab.label}</span>
      <span className={cn(mobile ? "hidden" : "sm:hidden")}>{tab.shortLabel ?? tab.label}</span>
      {badge != null && badge > 0 && (
        <span className={cn(
          "flex items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold leading-none text-white",
          mobile ? "absolute -top-0.5 right-1/4 h-5 min-w-[20px]" : "h-4 min-w-[16px]"
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
  const pathname = usePathname();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const tabBadges = useDashboardStore((s) => s.tabBadges);
  const { groups: cachedGroups, broadcasts: cachedBroadcasts, logs: cachedLogs } = useAccountCache(selectedAccountId);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 햅틱 피드백
  useEffect(() => {
    // 햅틱 피드백가 지원되는지 확인
    if ('vibrate' in navigator) {
      // 탭 전환 시 햅틱 피드백
      const handleTabChange = () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          navigator.vibrate(10); // 짧은 진동
        }
      };
      
      window.addEventListener('tabchange', handleTabChange);
      return () => window.removeEventListener('tabchange', handleTabChange);
    }
  }, []);

  // 모바일에서 햅틱 피드백 함수
  const triggerHapticFeedback = () => {
    if (window.matchMedia('(max-width: 768px)').matches && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const dashboardTabs = TABS.filter((t) => t.group === "dashboard");
  const sendTabs = TABS.filter((t) => t.group === "send");
  const opsTabs = TABS.filter((t) => t.group === "ops");
  const aiTabs = TABS.filter((t) => t.group === "ai");
  const settingsTabs = TABS.filter((t) => t.group === "settings");
  const newTabs = TABS.filter((t) => t.group === "new");
  const allTabs = [...dashboardTabs, ...sendTabs, ...opsTabs, ...aiTabs, ...settingsTabs, ...newTabs];


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

  // 모바일 UI
  const mobileTabs = [
    {
      id: "myai",
      label: "MyAI",
      icon: Sparkles,
      href: "/workspace/myai",
      badge: tabBadges.myai,
      color: "text-app-primary",
      bgColor: "bg-app-primary/10",
    },
    {
      id: "send",
      label: "발송",
      icon: MessageCircle,
      href: "/workspace/send",
      badge: tabBadges.send,
      color: "text-app-success",
      bgColor: "bg-app-success/10",
    },
    {
      id: "group",
      label: "그룹",
      icon: Users,
      href: "/workspace/group",
      badge: cachedGroups.length,
      color: "text-app-warning",
      bgColor: "bg-app-warning/10",
    },
    {
      id: "log",
      label: "로그",
      icon: UserPlus,
      href: "/workspace/log",
      badge: cachedLogs.length > 0 ? cachedLogs.length : 0,
      color: "text-app-info",
      bgColor: "bg-app-info/10",
    },
    {
      id: "settings",
      label: "설정",
      icon: Settings,
      href: "/workspace/settings",
      badge: 0,
      color: "text-app-text-muted",
      bgColor: "bg-app-text-muted/10",
    },
  ];

  // 모바일 화면에서만 표시
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-app-border bg-app-bg/80 backdrop-blur-xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
      >
        <div className="flex items-center justify-around bg-app-bg/90 px-2 py-2.5">
          {mobileTabs.map((tab) => {
            const isActive = pathname === tab.href || activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => {
                  setActiveTab(tab.id);
                  triggerHapticFeedback(); // 탭 클릭 시 햅틱 피드백
                }}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all duration-200",
                  "min-h-[60px] min-w-[60px]", // 모바일 터치 타겟 크기 확대
                  "hover:bg-app-card/50 active:scale-95",
                  isActive
                    ? `${tab.color} ${tab.bgColor} rounded-xl`
                    : "text-app-text-subtle hover:text-app-text",
                )}
                aria-label={tab.label}
                title={tab.label}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive ? "scale-110" : "scale-100",
                    )}
                  />
                  {tab.badge > 0 && (
                    <Badge
                      tone="danger"
                      className="absolute -right-1 -top-1 h-4 w-4 min-h-[16px] min-w-[16px] p-0 text-[10px]"
                    >
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-current" : "text-transparent",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
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