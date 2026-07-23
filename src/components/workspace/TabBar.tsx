"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  LayoutDashboard, Send, Users, FileText, Bot, Search, ScanSearch,
  CalendarClock, UserPlus, Zap, BarChart3, Globe, Folder, Target,
  HeartPulse, UserCog, MessageCircle, Workflow, Star, MoreHorizontal,
  Share2, TrendingUp, Sparkles, Building2, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { QuickActionSheet } from "./QuickActionSheet";
import { TABS, type TabDef, getAccountDisplayName } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";
import { getSafeAreaStyle } from "@/lib/safeArea";
import { useTouchGesture } from "@/hooks/useTouchGesture";
import { useRouter } from "next/navigation";
import { TabPeek } from "@/components/ui/TabPeek";
import { BottomSheetWrapper } from "@/components/ui/BottomSheetWrapper";
import { useLongPress } from "@/hooks/useLongPress";
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

// 모바일 하단 핵심 탭 — 모든 5개 그룹 (더보기 시트 제거)
const MOBILE_MAIN_TAB_IDS = ["dashboard", "send", "group", "myai", "profile"];

function TabButton({ tab, active, onSelect, badge, mobile, onDoubleTap, onLongPress }: { tab: TabDef; active: boolean; onSelect: () => void; badge?: number; mobile?: boolean; onDoubleTap?: () => void; onLongPress?: () => void }) {
  const Icon = TAB_ICONS[tab.id];
  const lastTapRef = useRef(0);
  const longPress = useLongPress(() => onLongPress?.(), 500);

  const handleClick = () => {
    const now = Date.now();
    if (active && now - lastTapRef.current < 300) {
      onDoubleTap?.();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    onSelect();
  };

  const buttonHandlers = mobile
    ? { ...longPress, onClick: handleClick }
    : { onClick: handleClick };
  
  // 탭 미리보기 내용
  const previewContent = (
    <div className="space-y-2">
      <div className="text-xs text-app-text-muted">{tab.description || tab.label} 탭 정보</div>
      <div className="text-xs">
        {tab.id === 'dashboard' && '대시보드 요약 정보가 여기에 표시됩니다.'}
        {tab.id === 'autoreply' && '자동 응답 규칙 수와 최근 활동이 표시됩니다.'}
        {tab.id === 'send' && '최근 발송 건수와 성공률이 표시됩니다.'}
        {tab.id === 'group' && '그룹 수와 최근 활동이 표시됩니다.'}
        {tab.id === 'myai' && 'AI 사용량과 최근 챗 기록이 표시됩니다.'}
        {tab.id !== 'dashboard' && tab.id !== 'autoreply' && tab.id !== 'send' && tab.id !== 'group' && tab.id !== 'myai' && '탭 미리보기 내용이 여기에 표시됩니다.'}
      </div>
    </div>
  );

  return (
    <TabPeek 
      previewContent={previewContent} 
      tabName={tab.label} 
      className={mobile ? "flex-1 min-h-[60px]" : ""}
    >
      <button
        type="button"
        {...buttonHandlers}
        role="tab"
        aria-selected={active}
        aria-current={active ? "page" : undefined}
        tabIndex={active ? 0 : -1}
        data-tour={`nav-${tab.id}`}
        className={cn(
          "focus-ring relative flex items-center justify-center transition-all duration-200",
          mobile
            ? "flex-col gap-0.5 flex-1 min-h-[60px] py-2 px-1" // 터치 영역 확대를 위해 px-1 추가
            : "shrink-0 gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] font-medium min-h-[44px]",
          active
            ? "text-[var(--color-accent)]"
            : "text-app-text-muted hover:text-app-text-secondary"
        )}
      >
        {Icon && (
          <Icon className={cn(
            "transition-all duration-200",
            mobile ? "h-6 w-6" : "h-3.5 w-3.5", // 모바일 아이콘 크기 증가
            active ? "text-[var(--color-accent)]" : "text-app-text-subtle"
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
            className="absolute inset-x-3 bottom-0 h-[2px] rounded-full"
            style={{ background: "var(--color-accent)" }}
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
              active ? "bg-[var(--color-accent)]/8 shadow-sm" : "hover:bg-app-card-hover/50"
            )} />
          </>
        )}
      </button>
    </TabPeek>
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
  const contentScrollRef = useRef<{ scrollToTop: () => void }>({ scrollToTop: () => {} });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [contextTab, setContextTab] = useState<TabDef | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const handler = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const isKeyboard = vv.height < window.innerHeight * 0.85;
      setIsKeyboardVisible(isKeyboard);
    };
    window.visualViewport?.addEventListener("resize", handler);
    return () => window.visualViewport?.removeEventListener("resize", handler);
  }, [isMobile]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

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

  // 모바일 — 모든 5개 그룹 인라인 표시 (스크롤 가능)
  const mobileMainTabs = allTabs.filter((t) => MOBILE_MAIN_TAB_IDS.includes(t.id));

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
    
    // 터치 제스처 훅 사용
    const { bindTouchEvents } = useTouchGesture({
      onSwipeLeft: () => {
        // 다음 탭으로 이동
        const currentIndex = mobileMainTabs.findIndex((t) => t.id === activeTab);
        if (currentIndex !== -1 && currentIndex < mobileMainTabs.length - 1) {
          const nextTab = mobileMainTabs[currentIndex + 1];
          haptics.light();
          setActiveTab(nextTab.id);
        }
      },
      onSwipeRight: () => {
        // 이전 탭으로 이동
        const currentIndex = mobileMainTabs.findIndex((t) => t.id === activeTab);
        if (currentIndex > 0) {
          const prevTab = mobileMainTabs[currentIndex - 1];
          haptics.light();
          setActiveTab(prevTab.id);
        }
      }
    });

    const prevTabIndex = mobileMainTabs.findIndex((t) => t.id === activeTab);

    const handleDoubleTap = useCallback(() => {
      haptics.impact();
      const el = document.querySelector<HTMLElement>('[data-content-scroll-container]');
      if (el) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, [haptics]);

    const handleLongPress = useCallback((tab: TabDef) => {
      haptics.medium();
      setContextTab(tab);
    }, [haptics]);

    return (
      <>
        <div className={cn("fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300", isKeyboardVisible && "translate-y-full")}>
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
          {/* Network status bar (3px) */}
          <div className={cn("h-[3px] transition-colors duration-300", online ? "bg-emerald-500" : "bg-red-500")} />
          <nav
            className="border-t-0 bg-app-surface/95 backdrop-blur-xl"
            style={{
              ...getSafeAreaStyle("bottom"),
              borderTop: "1px solid var(--color-border)",
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            role="navigation"
            aria-label="모바일 하단 내비게이션"
            ref={bindTouchEvents}
          >
            <div
              ref={scrollRef}
              onScroll={updateFade}
              style={{ scrollbarWidth: "none" }}
              className="flex items-center gap-0 overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden"
            >
              {mobileMainTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTab}
                  onSelect={() => { 
                    haptics.light(); 
                    setActiveTab(tab.id); 
                  }}
                  onDoubleTap={handleDoubleTap}
                  onLongPress={() => handleLongPress(tab)}
                  badge={tabBadges[tab.id]}
                  mobile
                />
              ))}
              <button
                type="button"
                onClick={() => { 
                  haptics.light(); 
                  setShowAccountPicker(true); 
                }}
                className="flex shrink-0 flex-col items-center gap-0.5 py-2.5 px-1 min-w-0 min-h-[60px] text-app-text-muted hover:text-app-text-secondary transition-colors relative"
                aria-expanded={showAccountPicker}
                aria-controls="account-picker"
                aria-haspopup="true"
              >
                <span className="text-[11px] leading-none">{accountLabel}</span>
              </button>
              <QuickActionSheet />
            </div>
          </nav>
        </div>

        <AnimatePresence>
          {showAccountPicker && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowAccountPicker(false)}
                aria-hidden="true"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                id="account-picker"
                className="fixed bottom-16 left-0 right-0 z-50 max-h-[45vh] overflow-y-auto rounded-t-2xl bg-app-card border-t border-app-border/60 px-4 pb-6 pt-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-picker-title"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-app-border" />
                <h2 id="account-picker-title" className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-2 px-1">계정 전환</h2>
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
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors min-h-[50px]",
                          isSelected ? "bg-app-primary/10 text-app-primary" : "text-app-text-muted hover:bg-app-card-hover"
                        )}
                        aria-current={isSelected ? "page" : undefined}
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

        {/* Long-press context menu */}
        <BottomSheetWrapper
          open={contextTab !== null}
          onClose={() => setContextTab(null)}
          title={contextTab?.label ?? ""}
        >
          {contextTab?.id === "send" && (
            <div className="space-y-2 py-2">
              <div className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider px-1">최근 템플릿</div>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-app-text hover:bg-app-card-hover transition-colors min-h-[44px]">
                <FileText className="h-4 w-4 text-app-text-muted" /> 템플릿 1: 프로모션
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-app-text hover:bg-app-card-hover transition-colors min-h-[44px]">
                <FileText className="h-4 w-4 text-app-text-muted" /> 템플릿 2: 공지사항
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-app-text hover:bg-app-card-hover transition-colors min-h-[44px]">
                <FileText className="h-4 w-4 text-app-text-muted" /> 템플릿 3: 이벤트
              </button>
            </div>
          )}
          {contextTab?.id === "profile" && (
            <div className="space-y-2 py-2">
              <div className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider px-1">계정 전환</div>
              {accounts.slice(0, 5).map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    useDashboardStore.getState().selectAccount(account.id);
                    setContextTab(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-app-text hover:bg-app-card-hover transition-colors min-h-[44px]"
                >
                  <UserCog className="h-4 w-4 text-app-text-muted" />
                  <span className="truncate flex-1">{getAccountDisplayName(account)}</span>
                  {account.id === selectedAccountId && (
                    <span className="text-[10px] font-semibold text-app-primary">선택됨</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {contextTab && contextTab.id !== "send" && contextTab.id !== "profile" && (
            <div className="py-2">
              <div className="text-[11px] font-medium text-app-text-muted uppercase tracking-wider px-1 pb-2">{contextTab.label} 작업</div>
              <button type="button" onClick={() => { setContextTab(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-app-text hover:bg-app-card-hover transition-colors min-h-[44px]">
                <ArrowLeft className="h-4 w-4 text-app-text-muted" /> 새로고침
              </button>
            </div>
          )}
        </BottomSheetWrapper>
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
        role="tablist"
        aria-label="작업 영역 탭"
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