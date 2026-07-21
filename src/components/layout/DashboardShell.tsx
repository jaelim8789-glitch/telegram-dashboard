"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

function useEdgeSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  edgeThreshold = 30,
  swipeThreshold = 60,
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const w = window.innerWidth;
      if (x > edgeThreshold && x < w - edgeThreshold) return;
      touchStart.current = { x, y: e.touches[0].clientY };
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        if (dx > 0) onSwipeRight();
        else onSwipeLeft();
      }
      touchStart.current = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, edgeThreshold, swipeThreshold]);
}
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Workspace } from "@/components/layout/Workspace";
import { Inspector } from "@/components/layout/Inspector";
import { CommandPaletteTrigger } from "@/components/workspace/CommandPalette";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { CheatsheetModal } from "@/components/workspace/CheatsheetModal";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { KeyboardShortcutHints } from "@/components/ui/KeyboardShortcutHints";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { useNotification } from "@/lib/useNotification";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { useOrientation } from "@/hooks/useOrientation";
import { useDashboardStore } from "@/store/useDashboardStore";

export function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);

  const haptics = useHapticFeedback();

  const toggleSidebar = useCallback(() => {
    haptics.light();
    setSidebarOpen((v) => !v);
    setInspectorOpen(false);
  }, [haptics]);
  const toggleInspector = useCallback(() => {
    haptics.light();
    setInspectorOpen((v) => !v);
    setSidebarOpen(false);
  }, [haptics]);

  // Edge swipe: left edge → sidebar, right edge → inspector
  useEdgeSwipe(
    useCallback(() => { haptics.medium(); setInspectorOpen(true); setSidebarOpen(false); }, [haptics]),
    useCallback(() => { haptics.medium(); setSidebarOpen(true); setInspectorOpen(false); }, [haptics]),
  );

  // "?" key opens cheatsheet (only when not typing in an input)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "?" && !(e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]"))) {
        setCheatsheetOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const shortcutHandlers = useMemo(() => ({
    onNavigate: (tabId: import("@/types").TabId) => setActiveTab(tabId),
  }), [setActiveTab]);
  useKeyboardShortcuts(shortcutHandlers);

  const { isKeyboardVisible } = useVisualViewport();
  const { orientation } = useOrientation();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const key = `${orientation}-${activeTab}`;
    const saved = scrollPositions.current.get(key);
    if (saved != null) {
      container.scrollTop = saved;
    }
    return () => {
      scrollPositions.current.set(key, container.scrollTop);
    };
  }, [orientation, activeTab]);

  // ── Foreground auto-refresh ──
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchAccounts();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchAccounts]);

  // ── Browser notifications ──
  const { notify, isSupported } = useNotification();

  // Notify when broadcasts complete
  const accounts = useDashboardStore((s) => s.accounts);
  const prevRef = useRef({ sent: accounts.reduce((s, a) => s + a.todaySent, 0) });
  useEffect(() => {
    if (!isSupported) return;
    const totalNow = accounts.reduce((s, a) => s + a.todaySent, 0);
    const prev = prevRef.current.sent;
    if (totalNow > prev && prev > 0) {
      notify({
        title: "✅ 발송 완료",
        body: `새로운 발송이 완료되었습니다 (${totalNow - prev}건)`,
        tag: "broadcast-sent",
      });
    }
    if (totalNow !== prev) {
      prevRef.current = { sent: totalNow };
    }
  }, [accounts, notify, isSupported]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app-bg text-app-text">
      <NetworkStatus />
      <OnboardingTour hasAccounts={accounts.length > 0} accountsLoading={accountsLoading} />
      <CheatsheetModal open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
      <Header />
      {/* Mobile nav toggle */}
      <div className="flex items-center gap-2 border-b border-app-border bg-app-surface px-3 py-1.5 sm:hidden" role="toolbar" aria-label="모바일 탐색">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "계정 사이드바 닫기" : "계정 사이드바 열기"}
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
          className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card transition-all"
        >
          <Menu className="h-4 w-4" /> 계정
        </button>
        <CommandPaletteTrigger />
        <button
          type="button"
          onClick={toggleInspector}
          aria-label={inspectorOpen ? "인스펙터 패널 닫기" : "인스펙터 패널 열기"}
          aria-expanded={inspectorOpen}
          aria-controls="dashboard-inspector"
          className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card transition-all ml-auto"
        >
          인스펙터 <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1"
        style={{ paddingBottom: isKeyboardVisible ? "var(--keyboard-offset, 0px)" : undefined }}
      >
        {/* Sidebar — always visible on desktop, overlay on mobile */}
        <div
          id="dashboard-sidebar"
          role="complementary"
          aria-label="계정 목록"
          className={`${sidebarOpen ? "fixed inset-0 z-40 flex" : "hidden"} sm:relative sm:z-auto sm:flex`}
        >
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 sm:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <div className={`relative z-10 ${sidebarOpen ? "block" : "hidden"} sm:block`}>
            <Sidebar />
          </div>
        </div>
        <Workspace />
        {/* Inspector — always visible on desktop, toggle on mobile (higher z than sidebar) */}
        <div
          id="dashboard-inspector"
          role="complementary"
          aria-label="인스펙터"
          className={`${inspectorOpen ? "fixed inset-0 z-50 flex justify-end" : "hidden"} sm:relative sm:z-auto sm:flex`}
        >
          {inspectorOpen && (
            <div className="fixed inset-0 bg-black/50 sm:hidden" onClick={() => setInspectorOpen(false)} />
          )}
          <div className={`relative z-10 ${inspectorOpen ? "block" : "hidden"} sm:block`}>
            <Inspector />
          </div>
        </div>
      </div>
      <ScrollToTop />
      <div className="hidden sm:flex absolute bottom-2 left-72">
        <KeyboardShortcutHints compact />
      </div>
    </div>
  );
}
