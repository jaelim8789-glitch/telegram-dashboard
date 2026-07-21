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

export function useOnlineStatus() {
  const online = useSyncExternalStore(subscribeToOnline, getOnlineStatus, () => true);

  const snapshot = useSyncExternalStore(
    subscribeToOnline,
    () => {
      const raw = sessionStorage.getItem("telemon:wasOffline");
      return raw === "true";
    },
    () => false,
  );

  const lastOnline = useSyncExternalStore(
    subscribeToOnline,
    () => {
      const raw = sessionStorage.getItem("telemon:lastOnline");
      return raw ? new Date(raw).toISOString() : null;
    },
    () => null,
  );

  if (online) {
    const wasOffline = sessionStorage.getItem("telemon:wasOffline") === "true";
    if (wasOffline) {
      sessionStorage.removeItem("telemon:wasOffline");
    }
    sessionStorage.setItem("telemon:lastOnline", new Date().toISOString());
  } else {
    sessionStorage.setItem("telemon:wasOffline", "true");
  }

  return {
    online,
    wasOffline: snapshot,
    lastOnline: lastOnline ? new Date(lastOnline) : null,
  };
}
