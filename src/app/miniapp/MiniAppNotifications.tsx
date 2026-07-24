"use client";

import { useState, memo, useEffect, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hapticFeedback } from "@tma.js/sdk-react";
import { relativeTime } from "@/lib/relativeTime";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const TYPE_CONFIG = {
  success: { icon: CheckCircle, color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  error: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  info: { icon: Info, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
};

function generateMockNotifications(): Notification[] {
  return [
    { id: "1", type: "success", title: "Î∞úÏÜ° ?ÑÎ£å", message: "3Í∞?Í≥ÑÏ†ï, 12Í∞?Í∑∏Î£π??Î∞úÏÜ° ?ÑÎ£å", time: new Date(Date.now() - 300000).toISOString(), read: false },
    { id: "2", type: "error", title: "Î∞úÏÜ° ?§Ìå®", message: "Í≥ÑÏ†ï 010-1234-5678 Ï∞®Îã®??- ?¨Ïù∏Ï¶??ÑÏöî", time: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: "3", type: "warning", title: "Í≥ÑÏ†ï ?úÌïú", message: "010-9876-5432 30Î∂????úÌïú ?¥Ï†ú ?àÏ†ï", time: new Date(Date.now() - 7200000).toISOString(), read: false },
    { id: "4", type: "info", title: "?†ÌÅ∞ ?åÏßÑ", message: "AI ?†ÌÅ∞??10% ?®Ïïò?µÎãà?? Ï∂©Ï†Ñ?òÏÑ∏??", time: new Date(Date.now() - 86400000).toISOString(), read: true },
  ];
}

export const MiniAppNotifications = memo(function MiniAppNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNotifications(generateMockNotifications());
    setLoading(false);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try { hapticFeedback.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppNotifications', e) }
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppNotifications', e) }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--tg-theme-text-color)" }}>
          <Bell className="h-4 w-4" /> ?åÎ¶º
          {unreadCount > 0 && (
            <span className="text-[9px] font-medium rounded-full px-1.5 py-0.5" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)", color: "#fff" }}>
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] font-medium active:scale-90" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>
              Î™®Îëê ?ΩÏùå
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-[10px] font-medium active:scale-90" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
              ?ÑÏ≤¥ ??†ú
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Bell className="h-10 w-10 mb-2" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>?åÎ¶º???ÜÏäµ?àÎã§</p>
        </div>
      ) : (
        <div className="px-4 space-y-1.5">
          <AnimatePresence>
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-xl px-3 py-3 flex items-start gap-3 relative"
                  style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
                  {!n.read && <span className="absolute top-3 left-3 h-2 w-2 rounded-full" style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} />}
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${!n.read ? "ml-2" : ""}`} style={{ backgroundColor: cfg.bg }}>
                    <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: "var(--tg-theme-text-color)" }}>{n.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{n.message}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{relativeTime(n.time)}</p>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90 shrink-0">
                    <X className="h-3.5 w-3.5" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});
