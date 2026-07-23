"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType = "broadcast_sent" | "broadcast_failed" | "account_banned" | "account_error" | "system";

interface NotificationPref { id: string; label: string; type: NotificationType; enabled: boolean; }

interface PrefStore { prefs: NotificationPref[]; toggle: (id: string) => void; getEnabled: () => NotificationType[]; }

const DEFAULT_PREFS: NotificationPref[] = [
  { id: "1", label: "발송 완료", type: "broadcast_sent", enabled: true },
  { id: "2", label: "발송 실패", type: "broadcast_failed", enabled: true },
  { id: "3", label: "계정 차단", type: "account_banned", enabled: true },
  { id: "4", label: "계정 오류", type: "account_error", enabled: true },
  { id: "5", label: "시스템 알림", type: "system", enabled: true },
];

export const useNotificationPrefs = create<PrefStore>()(persist(
  (set, get) => ({
    prefs: DEFAULT_PREFS,
    toggle: (id) => set(s => ({ prefs: s.prefs.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p) })),
    getEnabled: () => get().prefs.filter(p => p.enabled).map(p => p.type),
  }),
  { name: "telemon-notification-prefs" }
));
