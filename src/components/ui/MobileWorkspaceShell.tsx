"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useScrollStore, recordWidgetClick, getTopWidgets } from "@/lib/mobileWorkspaceUtils";
import { useDashboardStore } from "@/store/useDashboardStore";
import { GestureGuide } from "@/components/ui/GestureGuide";
import { MobileSendSheet } from "@/components/ui/MobileSendSheet";
import { QuickActionBar } from "@/components/ui/QuickActionBar";
import { cn } from "@/lib/cn";
import type { TabId } from "@/types";

const QUICK_ACTIONS = [
  { id: "send", label: "Î∞úÏÜ°", icon: "?âÔ∏è" },
  { id: "register", label: "Í≥ÑÏ†ï?±Î°ù", icon: "?? },
  { id: "log", label: "Î°úÍ∑∏", icon: "?ìã" },
  { id: "myai", label: "AI", icon: "?§ñ" },
];

const MOBILE_TAB_ORDER = ["dashboard", "send", "group", "myai", "profile"];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 60 : -60, opacity: 0 }),
};

export function MobileWorkspaceShell({ children, tabId }: { children: React.ReactNode; tabId: string }) {
  const setActiveTab = useDashboardStore(s => s.setActiveTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSendSheet, setShowSendSheet] = useState(false);
  const [online, setOnline] = useState(true);
  const [latency, setLatency] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const scrollStore = useScrollStore();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = scrollStore.getPosition(tabId);
    if (saved > 0) el.scrollTop = saved;
    const save = () => scrollStore.setPosition(tabId, el.scrollTop);
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, [tabId, scrollStore]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      if (cancelled) return;
      const t = Date.now();
      try { await fetch("/api/health", { method: "HEAD" }); setLatency(Date.now() - t); } catch (e) { console.warn('Unhandled error in MobileWorkspaceShell', e) }
    };
    measure(); const i = setInterval(measure, 30000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  const topWidgets = getTopWidgets(4);
  const prevTabIndexRef = useRef(MOBILE_TAB_ORDER.indexOf(tabId));
  const currentTabIndex = MOBILE_TAB_ORDER.indexOf(tabId);
  const direction = currentTabIndex - prevTabIndexRef.current;
  prevTabIndexRef.current = currentTabIndex;

  return (
    <div className="flex flex-col h-full">
      <div className={cn("h-[3px] shrink-0 transition-colors duration-300", online ? "bg-emerald-500" : "bg-red-500")} />

      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-app-border/50 shrink-0" style={{ scrollbarWidth: "none" }}>
        <span className="text-[10px] font-medium text-app-text-muted shrink-0 mr-1">?êÏ£º ?¨Ïö©</span>
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.id} onClick={() => { recordWidgetClick(qa.id); setActiveTab(qa.id as TabId); }}
            className="flex shrink-0 items-center gap-1 rounded-full border border-app-border bg-app-card-hover px-3 py-1.5 text-[11px] text-app-text hover:border-app-primary/30 active:scale-95 transition-all">
            <span>{qa.icon}</span> {qa.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}
        role="region" aria-label="?Ä?úÎ≥¥??Ïª®ÌÖêÏ∏? data-content-scroll-container>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={tabId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 30, opacity: { duration: 0.15 } }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <QuickActionBar />
      </div>

      <MobileSendSheet open={showSendSheet} onClose={() => setShowSendSheet(false)} onSent={() => setActiveTab("dashboard")} />

      {showGuide && <GestureGuide onDismiss={() => setShowGuide(false)} />}
    </div>
  );
}