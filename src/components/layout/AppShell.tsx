/**
 * Workspace layout — TeleMon V3 Phase 2
 * Core structure: sidebar + main content area
 * This file handles the layout shell only (no business logic)
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, MessageSquare, Send, BarChart3, Users, Settings } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { TabId } from "@/types";
import { cn } from "@/lib/cn";
import { GoldSplash } from "@/components/ui/GoldSplash";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "myai", label: "AI", icon: Bot },
  { id: "dashboard", label: "대시보드", icon: BarChart3 },
  { id: "send", label: "발송", icon: Send },
  { id: "group", label: "그룹", icon: Users },
  { id: "profile", label: "설정", icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const [splash, setSplash] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Splash: show on first load, hide after 3s
  useEffect(() => {
    const shown = sessionStorage.getItem("telemon-splash-shown");
    if (shown) { setSplash(false); return; }
    const t = setTimeout(() => { setSplash(false); sessionStorage.setItem("telemon-splash-shown", "1"); }, 3000);
    return () => clearTimeout(t);
  }, []);

  if (isMobile) return <>{children}</>;

  return (
    <>
      <GoldSplash show={splash} onDone={() => {}} />

      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
        {/* Sidebar */}
        <aside className="flex w-14 flex-col items-center gap-2 border-r border-[var(--color-border)] py-4" style={{ backgroundColor: "var(--color-bg-surface)" }}>
          {/* Logo */}
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #D4AF37, #a08030)" }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
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
