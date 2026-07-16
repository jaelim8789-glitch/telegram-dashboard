"use client";

import { useCallback, useEffect, useRef } from "react";

type NotificationPermission = "granted" | "denied" | "default";

interface NotificationOptions {
  /** Title of the notification */
  title: string;
  /** Body text */
  body: string;
  /** URL of an icon to display */
  icon?: string;
  /** URL to open when clicked */
  onClickUrl?: string;
  /** Tag for grouping notifications */
  tag?: string;
}

/**
 * Hook for browser notification API.
 * Provides a `notify` function and auto-requests permission on mount.
 */
export function useNotification() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const notify = useCallback(({ title, body, icon, onClickUrl, tag }: NotificationOptions) => {
    if (!("Notification" in window)) return;
    if (permissionRef.current !== "granted" && Notification.permission !== "granted") return;

    try {
      const n = new Notification(title, {
        body,
        icon: icon ?? "/favicon.ico",
        tag,
      });

      if (onClickUrl) {
        n.onclick = () => {
          window.focus();
          window.open(onClickUrl, "_self");
          n.close();
        };
      }

      // Auto-close after 8 seconds
      setTimeout(() => n.close(), 8000);
    } catch {
      // Notification may fail in some environments
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === "granted";
  }, []);

  const isSupported = typeof window !== "undefined" && "Notification" in window;
  const permission = typeof window !== "undefined" ? Notification.permission : "default";

  return { notify, requestPermission, isSupported, permission };
}
