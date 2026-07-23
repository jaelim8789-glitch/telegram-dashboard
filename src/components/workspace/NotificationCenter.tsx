"use client";

import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, AlertTriangle, AlertCircle, CheckCircle2, CheckCheck, Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNotificationStore, type Notification, type NotificationType } from "@/store/useNotificationStore";
import { useDashboardStore } from "@/store/useDashboardStore";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = { info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle2 };
const TYPE_COLORS: Record<NotificationType, string> = { info: "text-blue-500", warning: "text-amber-500", error: "text-red-500", success: "text-emerald-500" };

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function NotificationItem({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const Icon = TYPE_ICONS[notification.type];
  const colorClass = TYPE_COLORS[notification.type];

  return (
    <motion.div layout initial={{ opacity: 0, x: 60, height: 0 }} animate={{ opacity: 1, x: 0, height: "auto" }} exit={{ opacity: 0, x: -60, height: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }} className="relative overflow-hidden rounded-xl border border-app-border/60 bg-app-card px-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", colorClass)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-app-text">{notification.title}</p>
            <span className="shrink-0 whitespace-nowrap text-[10px] text-app-text-muted">{relativeTime(notification.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-app-text-muted">{notification.message}</p>
          {notification.action && (
            <button type="button" onClick={() => { setActiveTab(notification.action!.tabId as any); onDismiss(notification.id); }}
              className="mt-2 rounded-lg border border-app-border px-2.5 py-1 text-[10px] font-medium text-app-text hover:bg-app-card-hover transition-colors">{notification.action.label}</button>
          )}
        </div>
        <button type="button" onClick={() => onDismiss(notification.id)} className="mt-0.5 shrink-0 rounded-full p-0.5 min-h-11 min-w-11 flex items-center justify-center text-app-text-muted hover:text-app-text transition-colors"><X className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }} className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] rounded-t-2xl bg-app-card border-t border-[var(--color-accent-border)] shadow-2xl pb-8">
            <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-app-border" />
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-app-text" /><h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>알림</h2></div>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 min-h-11 min-w-11 flex items-center justify-center text-app-text-muted hover:bg-app-card-hover transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="h-px mx-5 bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-30" />
            {sorted.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-5 pt-2 pb-1">
                <button type="button" onClick={markAllRead} className="rounded-lg border border-app-border px-2.5 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">모두 읽음</button>
                <button type="button" onClick={clearAll} className="rounded-lg border border-app-border px-2.5 py-1 text-[10px] font-medium text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">모든 알림 지우기</button>
              </div>
            )}
            <div className="overflow-y-auto px-5 pt-1 pb-4 max-h-[calc(75vh-100px)] space-y-2">
              {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-app-text-muted"><CheckCheck className="h-10 w-10 mb-3 text-emerald-400" /><p className="text-sm font-medium">모든 알림을 확인했습니다</p><p className="mt-1 text-[11px]">새로운 알림이 없습니다</p></div>
              ) : (
                <AnimatePresence mode="popLayout">{sorted.map(n => <NotificationItem key={n.id} notification={n} onDismiss={dismissNotification} />)}</AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
