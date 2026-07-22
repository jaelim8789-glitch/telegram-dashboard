"use client";

import { createContext, useContext, useState, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const TOAST_STYLES = {
  success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
  };
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: {
    success: () => "",
    error: () => "",
    info: () => "",
    warning: () => "",
  },
  dismiss: () => {},
  clearAll: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastComponent({ toast, onDismiss }: ToastProps) {
  const Icon = TOAST_ICONS[toast.type];
  const [isVisible, setIsVisible] = useState(false);

  // 토스트가 나타날 때 애니메이션 효과
  useState(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  });

  // 토스트 자동 닫기
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 300); // 애니메이션 시간
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "transform-gpu overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-xl",
        "pointer-events-auto w-full max-w-sm",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        TOAST_STYLES[toast.type]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 pt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div className="font-medium">{toast.title}</div>
          {toast.description && (
            <div className="mt-1 text-sm opacity-90">{toast.description}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

let toastCounter = 0;

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mountedRef = useRef(false);

  // 토스트 ID 생성 함수
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${++toastCounter}`;
  }, []);

  // 토스트 추가 함수
  const addToast = useCallback((type: ToastType, title: string, description?: string, duration?: number) => {
    const id = generateId();
    const newToast: Toast = { id, type, title, description, duration };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, [generateId]);

  // 토스트 제거 함수
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 모든 토스트 제거 함수
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // 타입별 토스트 함수
  const toast = {
    success: (title: string, description?: string, duration?: number) =>
      addToast("success", title, description, duration),
    error: (title: string, description?: string, duration?: number) =>
      addToast("error", title, description, duration),
    info: (title: string, description?: string, duration?: number) =>
      addToast("info", title, description, duration),
    warning: (title: string, description?: string, duration?: number) =>
      addToast("warning", title, description, duration),
  };

  // 컴포넌트 마운트 상태 추적
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss: removeToast, clearAll }}>
      {children}
      <div 
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        role="alert"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
