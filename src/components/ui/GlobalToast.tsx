"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { create } from "zustand";

type ToastType = "success" | "error" | "warning" | "info";
interface Toast { id: string; type: ToastType; title: string; message?: string; duration?: number; }
interface ToastState { toasts: Toast[]; add: (t: Omit<Toast, "id">) => void; remove: (id: string) => void; }

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (t) => { const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; set(s => ({ toasts: [...s.toasts, { ...t, id }] })); setTimeout(() => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), t.duration || 4000); },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })),
}));

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, bg: "bg-emerald-600", text: "text-white" },
  error: { icon: XCircle, bg: "bg-red-600", text: "text-white" },
  warning: { icon: AlertTriangle, bg: "bg-amber-600", text: "text-white" },
  info: { icon: Info, bg: "bg-blue-600", text: "text-white" },
};

export function GlobalToast() {
  const toasts = useToastStore(s => s.toasts);
  const remove = useToastStore(s => s.remove);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const cfg = TYPE_CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg pointer-events-auto ${cfg.bg}`}>
              <Icon className={`h-5 w-5 shrink-0 ${cfg.text}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${cfg.text}`}>{t.title}</p>
                {t.message && <p className={`text-[11px] mt-0.5 ${cfg.text} opacity-90`}>{t.message}</p>}
              </div>
              <button onClick={() => remove(t.id)} className={`shrink-0 ${cfg.text} opacity-70 hover:opacity-100`}><X className="h-4 w-4" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const add = useToastStore(s => s.add);
  return {
    success: useCallback((title: string, message?: string) => add({ type: "success", title, message }), [add]),
    error: useCallback((title: string, message?: string) => add({ type: "error", title, message }), [add]),
    warning: useCallback((title: string, message?: string) => add({ type: "warning", title, message }), [add]),
    info: useCallback((title: string, message?: string) => add({ type: "info", title, message }), [add]),
  };
}
