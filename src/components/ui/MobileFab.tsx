"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, UserPlus, RefreshCw, ChevronUp, MessageSquare, Sparkles, PenLine } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export function MobileFab() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const haptics = useHapticFeedback();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) { if (fabRef.current && !fabRef.current.contains(e.target as Node)) close(); }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function handleScrollTop() {
    const el = document.querySelector("[data-content-scroll-container]") as HTMLElement | null;
    if (el) {
      try { el.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { console.warn('Unhandled error in MobileFab', e) }
    } else {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { console.warn('Unhandled error in MobileFab', e) }
    }
  }

  const handleAction = useCallback((action: () => void) => {
    haptics.selection();
    close();
    action();
    haptics.tick();
  }, [haptics, close]);

  const currentTab = useDashboardStore((s) => s.activeTab);
  const navView = useDashboardStore((s) => s.navView);

  const contextActions: { icon: React.ComponentType<{ className?: string }>; label: string; action: () => void }[] = navView === "chat"
    ? [
        { icon: Sparkles, label: "AI 명령", action: () => {} },
        { icon: PenLine, label: "??메시지", action: () => {} },
        { icon: ChevronUp, label: "?�로가�?, action: handleScrollTop },
      ]
    : currentTab === "send"
    ? [
        { icon: Send, label: "??발송", action: () => setActiveTab("send") },
        { icon: RefreshCw, label: "?�로고침", action: () => { fetchAccounts(); } },
        { icon: ChevronUp, label: "?�로가�?, action: handleScrollTop },
      ]
    : [
        { icon: UserPlus, label: "계정 ?�록", action: () => setActiveTab("register") },
        { icon: RefreshCw, label: "?�로고침", action: () => { fetchAccounts(); } },
        { icon: ChevronUp, label: "?�로가�?, action: handleScrollTop },
      ];

  return (
    <div ref={fabRef} className="fixed right-4 z-40 flex flex-col items-end" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
      <AnimatePresence>
        {open && contextActions.map((item, i) => {
          const Icon = item.icon;
          const angle = -Math.PI / 2 + (i - (contextActions.length - 1) / 2) * 0.35;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 400, damping: 28, delay: i * 0.03 }}
              onClick={() => handleAction(item.action)}
              className="absolute flex items-center gap-2 rounded-full bg-app-card px-3 py-2 shadow-lg border border-app-border hover:bg-app-card-hover active:scale-95 transition-all"
              style={{
                minHeight: 44,
                minWidth: 44,
                transform: `translate(${Math.cos(angle) * 80}px, ${Math.sin(angle) * 80}px)`,
              }}
            >
              <Icon className="h-4 w-4 text-app-primary shrink-0" />
              <span className="whitespace-nowrap text-xs font-medium text-app-text">{item.label}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={() => { haptics.impact(); setOpen(v => !v); }}
        className="flex min-h-14 min-w-14 items-center justify-center rounded-full shadow-xl border border-app-border transition-colors"
        style={{ background: open ? "var(--color-danger)" : "linear-gradient(135deg, var(--color-accent), var(--color-gold-deep))" }}
        whileTap={{ scale: 0.92 }}
        animate={open ? { rotate: 45 } : { rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        aria-label={open ? "메뉴 ?�기" : "빠른 ?�업 ?�기"}
      >
        <Plus className="h-6 w-6" style={{ color: "var(--color-accent-contrast)" }} />
      </motion.button>
    </div>
  );
}
