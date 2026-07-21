"use client";

import { useSyncExternalStore, useCallback } from "react";

function getSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const isSupported = typeof window !== "undefined" && "onLine" in navigator;

  return { isOnline, isSupported };
}
