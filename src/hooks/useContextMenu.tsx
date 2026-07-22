"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, RotateCcw, Trash2, Share2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

interface ContextAction { icon: typeof Copy; label: string; color?: string; onAction: () => void; }

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; actions: ContextAction[] } | null>(null);

  const show = useCallback((e: React.MouseEvent | React.TouchEvent, actions: ContextAction[]) => {
    e.preventDefault();
    const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    setMenu({ ...pos, actions });
  }, []);

  const hide = useCallback(() => setMenu(null), []);

  const ContextMenuComponent = menu ? (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" onClick={hide} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="fixed z-50 rounded-xl border border-app-border bg-app-card p-1 shadow-2xl"
        style={{ left: Math.min(menu.x, window.innerWidth - 160), top: Math.min(menu.y, window.innerHeight - menu.actions.length * 44) }}
        onClick={hide}>
        {menu.actions.map((a, i) => (
          <button key={i} onClick={() => { a.onAction(); hide(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs hover:bg-app-card-hover transition-colors"
            style={{ color: a.color || "var(--color-text)" }}>
            <a.icon className="h-4 w-4" /> {a.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  ) : null;

  return { show, hide, ContextMenuComponent };
}
