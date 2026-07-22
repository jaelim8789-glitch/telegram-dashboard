"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Send,
  UserPlus,
  Info,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useNotificationStore, type AppNotification } from "@/store/useNotificationStore";
import { formatRelativeTime } from "@/lib/formatTime";

const TYPE_ICONS: Record<AppNotification["type"], React.ReactNode> = {
  broadcast: <Send className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  account: <UserPlus className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
};

const TYPE_COLORS: Record<AppNotification["type"], string> = {
  broadcast: "text-blue-500",
  error: "text-rose-500",
  account: "text-violet-500",
  system: "text-app-text-muted",
  success: "text-emerald-500",
};

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, dismissNotification, markAllRead, clearAll } = useNotificationStore();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] rounded-t-2xl border-t border-app-border bg-app-bg shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-app-border/60">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-app-primary" />
                <span className="text-sm font-semibold">알림</span>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-app-primary/20 px-1.5 text-[10px] font-semibold text-app-primary">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
                    <CheckCheck className="h-3.5 w-3.5" />
                    모두 읽음
                  </button>
                )}
                {notifications.length > 0 && (
                  <button type="button" onClick={clearAll} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    전체 삭제
                  </button>
                )}
                <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-app-text-muted">
                  <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">모든 알림을 확인했습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-app-border/40">
                  {notifications.map((n) => (
                    <SwipeableNotificationItem key={n.id} notification={n} onDismiss={dismissNotification} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SwipeableNotificationItem({ notification: n, onDismiss }: { notification: AppNotification; onDismiss: (id: string) => void }) {
  const [swiping, setSwiping] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const startX = usePointerX();

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setSwiping(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!swiping) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) setOffsetX(dx);
  }

  function handlePointerUp() {
    if (offsetX < -80) {
      onDismiss(n.id);
    }
    setSwiping(false);
    setOffsetX(0);
  }

  return (
    <div
      className={cn("relative overflow-hidden transition-colors", !n.read && "bg-app-primary/5")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <motion.div
        animate={{ x: swiping ? offsetX : 0 }}
        transition={swiping ? { type: "tween" } : { type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-full", TYPE_COLORS[n.type], `${TYPE_COLORS[n.type]}/10`)}>
          {TYPE_ICONS[n.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-app-text truncate">{n.title}</span>
            <span className="shrink-0 text-[10px] text-app-text-muted">{formatRelativeTime(n.timestamp)}</span>
          </div>
          <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2">{n.message}</p>
          {n.action && (
            <button type="button" onClick={n.action.onClick} className="mt-1.5 text-xs font-medium text-app-primary hover:underline">
              {n.action.label}
            </button>
          )}
        </div>
      </motion.div>
      {offsetX < -40 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-rose-500 px-4">
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  );
}

function usePointerX() {
  return useRef(0);
}
