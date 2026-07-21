"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, CheckCircle2, X, Send, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

interface Notification {
  id: number;
  type: "success" | "error" | "info" | "warning";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "success", title: "발송 완료", body: "12개 그룹에 메시지 전송 완료", time: "2분 전", read: false },
  { id: 2, type: "info", title: "계정 연결", body: "새 Telegram 계정이 등록되었습니다", time: "15분 전", read: false },
  { id: 3, type: "warning", title: "FloodWait 감지", body: "계정 #3이 30초 일시 중지됨", time: "1시간 전", read: true },
];

const TYPE_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const TYPE_COLORS = {
  success: "text-app-success",
  error: "text-app-danger",
  info: "text-app-info",
  warning: "text-app-warning",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

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
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] text-app-primary hover:underline"
                  >
                    모두 읽음
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-app-text-muted">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const Icon = TYPE_ICONS[n.type];
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifications((prev) => prev.map((nn) => nn.id === n.id ? { ...nn, read: true } : nn));
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 transition-colors hover:bg-app-card-hover border-b border-app-border/30 last:border-0",
                          !n.read && "bg-app-primary/5"
                        )}
                      >
                        <div className="flex gap-3">
                          <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", TYPE_COLORS[n.type])} />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs", n.read ? "text-app-text" : "text-app-text font-medium")}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-app-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-app-text-subtle mt-1">{n.time}</p>
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
