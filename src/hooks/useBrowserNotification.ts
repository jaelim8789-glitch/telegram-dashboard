"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

function readPref(key: string): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}

function writePref(key: string, v: boolean): void {
  try { localStorage.setItem(key, String(v)); } catch {}
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
      toast("info", "알림 권한이 차단되었습니다. 브라우저 설정에서 변경해주세요.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "denied") {
        writePref(DENIED_KEY, true);
        toast("info", "브라우저 알림이 차단되었습니다.");
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
      const title = "발송 완료";
      const parts: string[] = [];
      if (successCount > 0) parts.push(`${successCount}건 성공`);
      if (failCount > 0) parts.push(`${failCount}건 실패`);
      const body = `[${accountName}] ${recipientCount}명 대상 ${parts.join(", ")}`;
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
