"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "telemon-notification-preferences";

export interface NotificationPrefs {
  broadcastComplete: boolean;
  broadcastFailed: boolean;
  healthAlert: boolean;
}

const DEFAULTS: NotificationPrefs = {
  broadcastComplete: true,
  broadcastFailed: true,
  healthAlert: true,
};

function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export function useNotificationsEnabled() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);

  const toggle = useCallback((key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  }, []);

  const setAll = useCallback((value: boolean) => {
    const next: NotificationPrefs = {
      broadcastComplete: value,
      broadcastFailed: value,
      healthAlert: value,
    };
    setPrefs(next);
    savePrefs(next);
  }, []);

  const anyEnabled = prefs.broadcastComplete || prefs.broadcastFailed || prefs.healthAlert;

  return { prefs, toggle, setAll, anyEnabled };
}
