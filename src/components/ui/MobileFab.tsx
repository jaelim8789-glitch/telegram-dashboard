"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Send,
  UserPlus,
  RefreshCw,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { safeAreaBottomClass } from "@/lib/safeArea";
import { useDashboardStore } from "@/store/useDashboardStore";

interface FabAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ACTIONS: FabAction[] = [
  { id: "send", icon: <Send className="h-5 w-5" />, label: "새 발송", onClick: () => {} },
  { id: "register", icon: <UserPlus className="h-5 w-5" />, label: "계정 등록", onClick: () => {} },
  { id: "refresh", icon: <RefreshCw className="h-5 w-5" />, label: "새로고침", onClick: () => {} },
  { id: "scroll-top", icon: <ChevronUp className="h-5 w-5" />, label: "위로가기", onClick: () => {} },
];

export function MobileFab() {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actions: FabAction[] = [
    { id: "send", icon: <Send className="h-5 w-5" />, label: "새 발송", onClick: () => { setActiveTab("send"); setOpen(false); } },
    { id: "register", icon: <UserPlus className="h-5 w-5" />, label: "계정 등록", onClick: () => { setActiveTab("register"); setOpen(false); } },
    { id: "refresh", icon: <RefreshCw className="h-5 w-5" />, label: "새로고침", onClick: () => { window.location.reload(); setOpen(false); } },
    { id: "scroll-top", icon: <ChevronUp className="h-5 w-5" />, label: "위로가기", onClick: () => { window.scrollTo({ top: 0, behavior: "smooth" }); setOpen(false); } },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className={cn("fixed right-4 z-50 flex flex-col items-end gap-2", safeAreaBottomClass)} style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-end gap-2"
          >
            {actions.map((action, i) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                type="button"
                onClick={action.onClick}
                className="flex items-center gap-2 rounded-full bg-app-card px-4 py-2.5 shadow-lg border border-app-border/60 text-sm font-medium text-app-text hover:bg-app-card-hover transition-colors"
              >
                <span className="text-app-primary">{action.icon}</span>
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow"
      >
        <Send className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
