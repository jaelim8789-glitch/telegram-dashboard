"use client";

/**
 * Workspace layout — TeleMon V3 Phase 2
 * Core structure: sidebar + main content area
 * This file handles the layout shell only (no business logic)
 */

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, Send, BarChart3, Users, Settings, Gamepad2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { TabId } from "@/types";
import { cn } from "@/lib/cn";
import { GoldSplash } from "@/components/ui/GoldSplash";

interface AppShellProps {
  children: ReactNode;
}

// "채팅" 항목만 별도 처리 — 탭이 아니라 navView를 "chat"으로 되돌리는 홈 화면이라
// TabId가 없다. 나머지는 기존 TABS와 동일한 TabId로 라우팅한다.
const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "대시보드", icon: BarChart3 },
  { id: "pixeloffice", label: "픽셀오피스", icon: Gamepad2 },
  { id: "send", label: "발송", icon: Send },
  { id: "group", label: "그룹", icon: Users },
  { id: "profile", label: "설정", icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const navView = useDashboardStore((s) => s.navView);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const [splash, setSplash] = useState(true);

  // Splash: show until data loads, minimum 500ms to prevent flash
  useEffect(() => {
    const shown = sessionStorage.getItem("telemon-splash-shown");
    if (shown) { setSplash(false); return; }
    const accountsLoading = useDashboardStore.getState().accountsLoading;
    if (!accountsLoading) {
      setSplash(false);
      sessionStorage.setItem("telemon-splash-shown", "1");
      return;
    }
    const unsub = useDashboardStore.subscribe((state) => {
      if (!state.accountsLoading) {
        setSplash(false);
        sessionStorage.setItem("telemon-splash-shown", "1");
        unsub();
      }
    });
    const minTimer = setTimeout(() => {
      if (!useDashboardStore.getState().accountsLoading) {
        setSplash(false);
        sessionStorage.setItem("telemon-splash-shown", "1");
      }
    }, 500);
    return () => { clearTimeout(minTimer); unsub(); };
  }, []);

  const isChatActive = navView === "chat";

  return (
    <>
      <GoldSplash show={splash} onDone={() => {}} />

      <div className="flex h-dvh overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
        {/* Sidebar — icon rail, shown on mobile and desktop alike (user-requested) */}
        <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-[var(--color-border)] py-4" style={{ backgroundColor: "var(--color-bg-surface)" }}>
          {/* Logo — click always goes home (AI 채팅 화면) */}
          <button
            type="button"
            onClick={() => { navigateToChat(); }}
            className="mb-4 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #D4AF37, #a08030)" }}
            title="홈으로"
            aria-label="홈으로"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </button>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateToChat()}
              className={cn(
                "relative flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-all",
                isChatActive
                  ? "text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)]"
              )}
              style={isChatActive ? { background: "linear-gradient(135deg, #D4AF37, #a08030)" } : {}}
              title="채팅하기"
            >
              <MessageSquare className="h-5 w-5" />
              {isChatActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute -left-[1px] h-5 w-0.5 rounded-full"
                  style={{ backgroundColor: "#D4AF37" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = !isChatActive && activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-all",
                    isActive
                      ? "text-white"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)]"
                  )}
                  style={isActive ? { background: "linear-gradient(135deg, #D4AF37, #a08030)" } : {}}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute -left-[1px] h-5 w-0.5 rounded-full"
                      style={{ backgroundColor: "#D4AF37" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full overflow-y-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
