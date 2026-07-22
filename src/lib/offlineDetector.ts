"use client";

import { useCallback, useSyncExternalStore } from "react";

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
  } catch {}
}

function safeSessionRemove(key: string): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
  } catch {}
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

  if (online) {
    const stored = safeSessionGet("telemon:wasOffline") === "true";
    if (stored) {
      safeSessionRemove("telemon:wasOffline");
    }
    safeSessionSet("telemon:lastOnline", new Date().toISOString());
  } else {
    safeSessionSet("telemon:wasOffline", "true");
  }

  return {
    online,
    wasOffline,
    lastOnline: lastOnline ? new Date(lastOnline) : null,
  };
}
