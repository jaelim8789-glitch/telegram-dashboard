"use client";

import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2, Skull, Ban } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "warning" | "info" | "loading" | "critical";

interface Toast {
  id: number;
  groupKey: string;
  type: ToastType;
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, opts?: { description?: string; action?: { label: string; onClick: () => void }; duration?: number }) => void;
  dismissToast: (id: number) => void;
  clearAll: () => void;
}

interface GroupMeta {
  count: number;
  timerId: ReturnType<typeof setTimeout> | null;
  duration: number;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismissToast: () => {}, clearAll: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const TOAST_ICONS: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
  critical: Ban,
};

const TOAST_STYLES: Record<string, string> = {
  success: "border-app-success/30 bg-app-success-muted text-app-success",
  error: "border-app-danger/30 bg-app-danger-muted text-app-danger",
  warning: "border-app-warning/30 bg-app-warning-muted text-app-warning",
  info: "border-app-info/30 bg-app-info-muted text-app-info",
  loading: "border-app-primary/30 bg-app-primary-muted text-app-primary",
  critical: "border-purple-500/30 bg-purple-950/90 text-purple-200 shadow-lg shadow-purple-500/20",
};

const TOAST_VARIANTS = {
  initial: { opacity: 0, x: 80, scale: 0.92 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    x: 60,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const groupMapRef = useRef<Map<string, GroupMeta>>(new Map());

  const scheduleDismiss = useCallback((groupKey: string, duration: number, toastId: number) => {
    const existing = groupMapRef.current.get(groupKey);
    if (existing?.timerId != null) {
      clearTimeout(existing.timerId);
    }
    const timerId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
      groupMapRef.current.delete(groupKey);
    }, duration);
    groupMapRef.current.set(groupKey, { count: existing?.count ?? 1, timerId, duration });
  }, []);

  const addToast = useCallback((
    type: ToastType,
    message: string,
    opts?: { description?: string; action?: { label: string; onClick: () => void }; duration?: number }
  ) => {
    const id = nextId++;
    const duration = opts?.duration ?? (type === "loading" ? 0 : 4500);
    const groupKey = `${message}|${type}`;

    setToasts((prev) => {
      const existing = prev.find((t) => t.groupKey === groupKey && Date.now() - t.id < 2000);
      if (existing) {
        const meta = groupMapRef.current.get(groupKey);
        const count = (meta?.count ?? 1) + 1;
        const groupedToast: Toast = {
          ...existing,
          id: nextId++,
          message: `${count}건의 알림 · ${message}`,
        };
        groupMapRef.current.set(groupKey, { count, timerId: meta?.timerId ?? null, duration });
        scheduleDismiss(groupKey, duration, groupedToast.id);
        return prev.map((t) => (t.id === existing.id ? groupedToast : t));
      }
      return [...prev, { id, groupKey, type, message, description: opts?.description, action: opts?.action, duration }];
    });

    if (duration > 0) {
      scheduleDismiss(groupKey, duration, id);
    }
  }, [scheduleDismiss]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) {
        const meta = groupMapRef.current.get(target.groupKey);
        if (meta?.timerId != null) {
          clearTimeout(meta.timerId);
        }
        groupMapRef.current.delete(target.groupKey);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    for (const meta of groupMapRef.current.values()) {
      if (meta.timerId != null) clearTimeout(meta.timerId);
    }
    groupMapRef.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismissToast: removeToast, clearAll }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {[...toasts]
            .sort((a, b) => (a.type === "critical" ? -1 : b.type === "critical" ? 1 : 0))
            .map((t) => {
              const Icon = TOAST_ICONS[t.type] || Info;
              const isCritical = t.type === "critical";
              return (
                <motion.div
                  key={t.id}
                  role="alert"
                  layout
                  variants={TOAST_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg relative overflow-hidden",
                    TOAST_STYLES[t.type] || TOAST_STYLES.info,
                    isCritical && "ring-2 ring-purple-400/50",
                    !isCritical && t.type !== "loading" && "before:absolute before:inset-0 before:rounded-xl before:border before:border-[var(--color-accent-border)] before:opacity-15 before:pointer-events-none"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.type === "loading" && "animate-spin", isCritical && "text-purple-300")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium", isCritical && "text-purple-100")}>{t.message}</p>
                    {t.description && (
                      <p className={cn("mt-0.5 text-xs opacity-80", isCritical && "text-purple-200/80")}>{t.description}</p>
                    )}
                    {t.action && (
                      <button
                        type="button"
                        onClick={t.action.onClick}
                        className="mt-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className={cn("shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity", isCritical && "text-purple-300")}
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
