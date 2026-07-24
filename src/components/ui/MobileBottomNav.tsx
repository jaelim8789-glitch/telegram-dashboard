"use client";

import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, MessageSquare, Send, Users, Settings, Bot, Plus, X, Bell, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function MobileBottomNav() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const navView = useDashboardStore((s) => s.navView);
  const [moreOpen, setMoreOpen] = useState(false);

  const mainItems: NavItem[] = [
    { id: "chat", label: "채팅", icon: MessageSquare },
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "send", label: "발송", icon: Send },
    { id: "group", label: "그룹", icon: Users },
    { id: "profile", label: "설정", icon: Settings },
  ];

  const handleNav = useCallback((id: string) => {
    if (id === "chat") {
      navigateToChat();
    } else {
      setActiveTab(id);
    }
    setMoreOpen(false);
  }, [navigateToChat, setActiveTab]);

  const isActive = (id: string) => {
    if (id === "chat") return navView === "chat";
    return activeTab === id;
  };

  return (
    <>
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-app-border bg-app-surface/95 backdrop-blur-xl safe-area-bottom"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="navigation"
        aria-label="모바일 네비게이션"
      >
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNav(item.id)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 transition-colors",
                active ? "text-app-primary" : "text-app-text-muted hover:text-app-text"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              </div>
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 h-0.5 w-6 rounded-full"
                  style={{ background: "linear-gradient(90deg, #8B5CF6, #3B82F6)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="sm:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-app-surface border-t border-app-border pb-safe"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-app-border-strong" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <h3 className="text-sm font-semibold text-app-text">모든 기능</h3>
                <button type="button" onClick={() => setMoreOpen(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-app-text-muted hover:text-app-text">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 px-4 pb-6 overflow-y-auto max-h-[50vh]">
                {["myai", "aireply", "autoreply", "replymacro", "templates", "deliveryanalytics", "channelhub", "audit", "folders", "triggers", "pixeloffice", "fortune"].map((tabId) => (
                  <button key={tabId} type="button" onClick={() => { setActiveTab(tabId); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-app-border bg-app-card p-2.5 min-h-[44px] hover:bg-app-card-hover active:scale-95 transition-all"
                  >
                    <span className="text-[10px] font-medium text-app-text text-center leading-tight">{tabId}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


