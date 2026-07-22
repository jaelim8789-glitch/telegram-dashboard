"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, CheckCircle2, X, Send, AlertCircle, Info, Volume2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/formatTime";

type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: number;
  read: boolean;
  category?: "account" | "broadcast" | "system" | "schedule";
}

const NOTIF_KEY = "telemon-notifications";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  success: "text-app-success",
  error: "text-app-danger",
  info: "text-app-info",
  warning: "text-app-warning",
};

const CATEGORY_LABELS: Record<string, string> = {
  account: "계정",
  broadcast: "발송",
  system: "시스템",
  schedule: "스케줄",
};

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotifications(ns: Notification[]) {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(ns.slice(0, 50))); } catch {}
}

export function addNotification(n: Omit<Notification, "id" | "time" | "read">) {
  const notif: Notification = { ...n, id: crypto.randomUUID(), time: Date.now(), read: false };
  const existing = loadNotifications();
  existing.unshift(notif);
  saveNotifications(existing);

  if (n.type === "error" || n.type === "warning") {
    try { navigator.vibrate?.(n.type === "error" ? [30, 50, 30] : [10]); } catch {}
  }

  const event = new CustomEvent("telemon-notification", { detail: notif });
  window.dispatchEvent(event);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  useEffect(() => {
    const handler = () => setNotifications(loadNotifications());
    window.addEventListener("telemon-notification", handler);
    window.addEventListener("storage", (e) => { if (e.key === NOTIF_KEY) handler(); });
    return () => {
      window.removeEventListener("telemon-notification", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return notifications;
}

export function NotificationBell() {
  const [notifState, setNotifState] = useState<Notification[]>(() => loadNotifications());
  const [open, setOpen] = useState(false);
  const unread = notifState.filter((n) => !n.read).length;
  const prevUnread = useRef(unread);

  useEffect(() => {
    const handler = () => setNotifState(loadNotifications());
    window.addEventListener("telemon-notification", handler);
    window.addEventListener("storage", (e) => { if (e.key === NOTIF_KEY) handler(); });
    return () => {
      window.removeEventListener("telemon-notification", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    if (unread > prevUnread.current && open === false) {
      try { navigator.vibrate?.(5); } catch {}
    }
    prevUnread.current = unread;
  }, [unread, open]);

  function markAllRead() {
    const next = notifState.map((n) => ({ ...n, read: true }));
    saveNotifications(next);
    setNotifState(next);
  }

  function markRead(id: string) {
    const next = notifState.map((n) => n.id === id ? { ...n, read: true } : n);
    saveNotifications(next);
    setNotifState(next);
  }

  function clearAll() {
    saveNotifications([]);
    setNotifState([]);
  }

  const categories = [...new Set(notifState.filter((n) => n.category != null).map((n) => n.category as string))];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-all sm:min-h-8 sm:min-w-8"
        aria-label="알림"
      >
        {unread > 0 ? (
          <>
            <BellRing className="h-4 w-4 text-app-primary" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-app-danger px-1 text-[9px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-app-border/60 bg-app-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-app-border/60">
                <h3 className="text-sm font-semibold text-app-text">알림</h3>
                <div className="flex items-center gap-1.5">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-app-primary hover:underline">모두 읽음</button>
                  )}
                  {notifState.length > 0 && (
                    <button onClick={clearAll} className="p-1 text-app-text-muted hover:text-app-danger transition-colors" title="전체 삭제">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="flex gap-1 px-3 pt-2 pb-1 overflow-x-auto">
                  {categories.map((cat) => (
                    <span key={cat} className="shrink-0 rounded-full bg-app-primary-muted px-2 py-0.5 text-[9px] text-app-primary">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  ))}
                </div>
              )}

              <div className="max-h-80 overflow-y-auto">
                {notifState.length === 0 ? (
                  <div className="py-8 text-center text-xs text-app-text-muted">알림이 없습니다</div>
                ) : (
                  notifState.map((n) => {
                    const Icon = TYPE_ICONS[n.type];
                    return (
                      <button key={n.id} type="button" onClick={() => markRead(n.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 transition-colors hover:bg-app-card-hover border-b border-app-border/30 last:border-0",
                          !n.read && "bg-app-primary/5"
                        )}
                      >
                        <div className="flex gap-3">
                          <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", TYPE_COLORS[n.type])} />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs", n.read ? "text-app-text" : "text-app-text font-medium")}>{n.title}</p>
                             <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-app-text-subtle">{formatRelativeTime(new Date(n.time).toISOString())}</p>
                              {n.category && <span className="text-[9px] text-app-text-subtle">· {CATEGORY_LABELS[n.category]}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
