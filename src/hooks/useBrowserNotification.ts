"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISABLED_KEY = "telemon-browser-notify-disabled";
const PERMISSION_KEY = "telemon-browser-notify-permission";

function isDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function getStoredPermission(): NotificationPermission | null {
  try {
    const v = localStorage.getItem(PERMISSION_KEY);
    if (v === "granted" || v === "denied" || v === "default") return v;
    return null;
  } catch {
    return null;
  }
}

function setStoredPermission(p: NotificationPermission) {
  try {
    localStorage.setItem(PERMISSION_KEY, p);
  } catch {}
}

export function useBrowserNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined") return "default";
    return getStoredPermission() ?? Notification.permission;
  });
  const [disabled, setDisabled] = useState(isDisabled);
  const requestedRef = useRef(false);

  const isSupported = typeof window !== "undefined" && "Notification" in window;

  useEffect(() => {
    if (!isSupported) return;
    const stored = getStoredPermission();
    if (stored && stored !== Notification.permission) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";
    if (permission === "denied" || getStoredPermission() === "denied") {
      return "denied";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setStoredPermission(result);
    return result;
  }, [isSupported, permission]);

  const notify = useCallback(
    (title: string, options?: { body?: string; icon?: string; tag?: string; data?: unknown }) => {
      if (!isSupported) return;
      if (disabled) return;
      if (permission !== "granted" && Notification.permission !== "granted") return;

      try {
        const n = new Notification(title, {
          body: options?.body,
          icon: options?.icon ?? "/favicon.ico",
          tag: options?.tag,
          data: options?.data,
        });

        n.onclick = () => {
          window.focus();
          n.close();
        };

        setTimeout(() => n.close(), 8000);
      } catch {}
    },
    [isSupported, disabled, permission],
  );

  const notifyBroadcastComplete = useCallback(
    (accountName: string, recipientCount: number, successCount: number, failCount: number) => {
      notify("발송 완료", {
        body: `[${accountName}] ${recipientCount}명 중 ${successCount}건 성공${failCount > 0 ? `, ${failCount}건 실패` : ""}`,
        tag: `broadcast-done-${accountName}`,
      });
    },
    [notify],
  );

  const setEnabled = useCallback(
    (on: boolean) => {
      try {
        if (on) {
          localStorage.removeItem(DISABLED_KEY);
          setDisabled(false);
          if (permission === "default") {
            requestPermission();
          }
        } else {
          localStorage.setItem(DISABLED_KEY, "1");
          setDisabled(true);
        }
      } catch {}
    },
    [permission, requestPermission],
  );

  return {
    isSupported,
    permission,
    disabled,
    requestPermission,
    notify,
    notifyBroadcastComplete,
    setEnabled,
  };
}
