"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  /** Optional description shown below the main message. */
  description?: string;
  /** Optional action button. */
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss duration in ms. 0 = sticky (must be manually dismissed). */
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, opts?: { description?: string; action?: { label: string; onClick: () => void }; duration?: number }) => void;
  dismissToast: (id: number) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismissToast: () => {}, clearAll: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-app-success/30 bg-app-success-muted text-app-success",
  error: "border-app-danger/30 bg-app-danger-muted text-app-danger",
  warning: "border-app-warning/30 bg-app-warning-muted text-app-warning",
  info: "border-app-info/30 bg-app-info-muted text-app-info",
  loading: "border-app-primary/30 bg-app-primary-muted text-app-primary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    type: ToastType,
    message: string,
    opts?: { description?: string; action?: { label: string; onClick: () => void }; duration?: number }
  ) => {
    const id = nextId++;
    const duration = opts?.duration ?? (type === "loading" ? 0 : 4500);
    setToasts((prev) => [...prev, { id, type, message, description: opts?.description, action: opts?.action, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismissToast: removeToast, clearAll }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg animate-slide-up",
                TOAST_STYLES[t.type]
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.type === "loading" && "animate-spin")} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{t.message}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs opacity-80">{t.description}</p>
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
                className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}