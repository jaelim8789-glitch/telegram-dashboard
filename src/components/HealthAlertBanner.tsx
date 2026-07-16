"use client";

import { useEffect, useRef } from "react";
import { useNotification } from "@/lib/useNotification";
import * as api from "@/lib/api";

/**
 * Monitors account health and sends browser notifications when issues are detected.
 * Runs on a 60-second polling cycle, using previous state to avoid duplicate alerts.
 */
export function HealthAlertBanner() {
  const { notify, isSupported } = useNotification();
  const prevUnauthorizedRef = useRef<string[]>([]);
  const prevBannedRef = useRef<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    async function checkHealth() {
      try {
        const items = await api.fetchAccountHealth();
        const unauthorized = items
          .filter((h) => h.status === "unauthorized")
          .map((h) => h.phone);
        const banned = items
          .filter((h) => h.status === "banned")
          .map((h) => h.phone);

        // New unauthorized accounts
        const newUnauthorized = unauthorized.filter(
          (phone) => !prevUnauthorizedRef.current.includes(phone)
        );
        if (newUnauthorized.length > 0) {
          notify({
            title: "⚠️ 계정 인증 필요",
            body: `${newUnauthorized.length}개 계정의 세션이 만료되었습니다.`,
            tag: "account-unauthorized",
          });
        }

        // New banned accounts
        const newBanned = banned.filter(
          (phone) => !prevBannedRef.current.includes(phone)
        );
        if (newBanned.length > 0) {
          notify({
            title: "🚫 계정 차단됨",
            body: `${newBanned.length}개 계정이 Telegram에 차단되었습니다.`,
            tag: "account-banned",
          });
        }

        prevUnauthorizedRef.current = unauthorized;
        prevBannedRef.current = banned;
      } catch {
        // Silently ignore poll errors
      }
    }

    // Initial check after 5 seconds
    const initTimer = setTimeout(checkHealth, 5000);

    // Then every 60 seconds — only if browser notifications are supported
    if (typeof window !== "undefined" && "Notification" in window) {
      pollRef.current = setInterval(checkHealth, 60000);
    }

    return () => {
      clearTimeout(initTimer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSupported, notify]);

  return null; // Invisible — alerts are delivered via browser notifications
}
