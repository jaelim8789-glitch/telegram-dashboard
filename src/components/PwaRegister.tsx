"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker for offline support and installability.
 * Only runs on the client side, once per mount.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register SW after a small delay so initial page load is not delayed
    const timer = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("[PWA] Service Worker registered:", registration.scope);

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available — notify user
                console.log("[PWA] New version available — refresh to update");
              }
            });
          }
        });
      } catch (err) {
        console.warn("[PWA] Service Worker registration failed:", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
