"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

function readPref(key: string): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}

function writePref(key: string, v: boolean): void {
  try { localStorage.setItem(key, String(v)); } catch (e) { console.warn('Unhandled error in useBrowserNotification', e) }
}

const DISABLED_KEY = "telemon-browser-notify-disabled";
const DENIED_KEY = "telemon-notify-denied";

export function useBrowserNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    return Notification.permission;
  });
  const [disabled, setDisabled] = useState(() => readPref(DISABLED_KEY));
  const { toast } = useToast();

  const isSupported = typeof window !== "undefined" && "Notification" in window;

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return;
    const deniedPermanently = readPref(DENIED_KEY);
    if (deniedPermanently) {
      toast("info", "?Œë¦¼ ê¶Œí•œ??ì°¨ë‹¨?˜ì—ˆ?µë‹ˆ?? ë¸Œë¼?°ì? ?¤ì •?ì„œ ë³€ê²½í•´ì£¼ì„¸??");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "denied") {
        writePref(DENIED_KEY, true);
        toast("info", "ë¸Œë¼?°ì? ?Œë¦¼??ì°¨ë‹¨?˜ì—ˆ?µë‹ˆ??");
      }
    } catch {
      // permission request can fail silently
    }
  }, [isSupported, toast]);

  const notify = useCallback(
    (title: string, options?: { body?: string; icon?: string; tag?: string; data?: Record<string, unknown> }) => {
      if (!isSupported || permission !== "granted" || disabled) return;
      try {
        const n = new Notification(title, {
          body: options?.body,
          icon: options?.icon ?? "/favicon.ico",
          tag: options?.tag,
          data: options?.data,
        });
        n.onclick = () => {
          window.focus();
          if (typeof n.close === "function") n.close();
        };
        setTimeout(() => { if (typeof n.close === "function") n.close(); }, 8000);
      } catch {
        // firefox/safari may restrict
      }
    },
    [isSupported, permission, disabled]
  );

  const notifyBroadcastComplete = useCallback(
    (accountName: string, recipientCount: number, successCount: number, failCount: number) => {
      const title = "ë°œì†¡ ?„ë£Œ";
      const parts: string[] = [];
      if (successCount > 0) parts.push(`${successCount}ê±??±ê³µ`);
      if (failCount > 0) parts.push(`${failCount}ê±??¤íŒ¨`);
      const body = `[${accountName}] ${recipientCount}ëª??€??${parts.join(", ")}`;
      notify(title, { body, tag: `broadcast-${Date.now()}` });
    },
    [notify]
  );

  const setEnabled = useCallback(
    (on: boolean) => {
      if (on) {
        writePref(DISABLED_KEY, false);
        setDisabled(false);
        if (permission === "default") requestPermission();
      } else {
        writePref(DISABLED_KEY, true);
        setDisabled(true);
      }
    },
    [permission, requestPermission]
  );

  return { isSupported, permission, disabled, requestPermission, notify, notifyBroadcastComplete, setEnabled };
}
