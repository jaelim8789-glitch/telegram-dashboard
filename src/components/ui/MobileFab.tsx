"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, UserPlus, RefreshCw, ChevronUp } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function MobileFab() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) { if (fabRef.current && !fabRef.current.contains(e.target as Node)) close(); }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function handleScrollTop() {
    const el = document.querySelector(".overflow-y-auto") as HTMLElement | null;
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const actions = [
    { icon: Send, label: "새 발송", action: () => { setActiveTab("send"); close(); } },
    { icon: UserPlus, label: "계정 등록", action: () => { setActiveTab("register"); close(); } },
    { icon: RefreshCw, label: "새로고침", action: () => { fetchAccounts(); close(); } },
    { icon: ChevronUp, label: "위로가기", action: handleScrollTop },
  ];

  return (
    <div ref={fabRef} className="fixed bottom-24 right-4 z-40 flex flex-col items-end" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <AnimatePresence>
        {open && actions.map((item, i) => {
          const Icon = item.icon;
          const angle = (Math.PI / 4) * i - Math.PI / 2;
          return (
            <motion.button key={item.label} initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, x: Math.cos(angle) * 90, y: Math.sin(angle) * 90, scale: 1 }} exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }} transition={{ type: "spring", stiffness: 400, damping: 28, delay: i * 0.03 }}
              onClick={item.action} className="absolute flex items-center gap-2 rounded-full bg-app-card px-3 py-2 shadow-lg border border-app-border hover:bg-app-card-hover transition-colors" style={{ minHeight: 44, minWidth: 44 }}>
              <Icon className="h-4 w-4 text-app-primary" />
              <span className="whitespace-nowrap text-xs font-medium text-app-text">{item.label}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
      <motion.button type="button" onClick={() => setOpen(v => !v)} className="flex min-h-14 min-w-14 items-center justify-center rounded-full shadow-xl border border-app-border transition-colors" style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-gold-deep))", color: "var(--color-accent-contrast)" }}
        whileTap={{ scale: 0.92 }} animate={open ? { rotate: 45 } : { rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} aria-label={open ? "메뉴 닫기" : "빠른 작업 열기"}>
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
