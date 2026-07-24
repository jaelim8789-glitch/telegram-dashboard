"use client";

import { useEffect, useSyncExternalStore } from "react";

function getOnlineStatus(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function subscribeToOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function safeSessionGet(key: string): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, value);
    }
  } catch (e) { console.warn('Unhandled error in offlineDetector', e) }
}

function safeSessionRemove(key: string): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
  } catch (e) { console.warn('Unhandled error in offlineDetector', e) }
}

export function useOnlineStatus() {
  const online = useSyncExternalStore(subscribeToOnline, getOnlineStatus, () => true);

  const wasOffline = useSyncExternalStore(
    subscribeToOnline,
    () => safeSessionGet("telemon:wasOffline") === "true",
    () => false,
  );

  const lastOnline = useSyncExternalStore(
    subscribeToOnline,
    () => {
      const raw = safeSessionGet("telemon:lastOnline");
      return raw ? new Date(raw).toISOString() : null;
    },
    () => null,
  );

  useEffect(() => {
    if (online) {
      const stored = safeSessionGet("telemon:wasOffline") === "true";
      if (stored) {
        safeSessionRemove("telemon:wasOffline");
      }
      safeSessionSet("telemon:lastOnline", new Date().toISOString());
    } else {
      safeSessionSet("telemon:wasOffline", "true");
    }
  }, [online]);

  return {
    online,
    wasOffline,
    lastOnline: lastOnline ? new Date(lastOnline) : null,
  };
}
