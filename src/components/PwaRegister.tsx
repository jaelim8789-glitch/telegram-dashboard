"use client";

import { useEffect } from "react";
import { subscribeToPush } from "@/lib/pushManager";

interface PwaRegisterProps {
  onUpdateAvailable?: () => void;
}

/**
 * Registers the PWA service worker for offline support, installability,
 * and push notification subscriptions.
 */
export function PwaRegister({ onUpdateAvailable }: PwaRegisterProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const timer = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                onUpdateAvailable?.();
              }
            });
          }
        });

        if (registration.active && "pushManager" in registration) {
          subscribeToPush(registration);
        }
      } catch {
        // SW registration may fail in some environments
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onUpdateAvailable]);

  return null;
}
