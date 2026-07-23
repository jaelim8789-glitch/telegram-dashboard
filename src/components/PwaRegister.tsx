"use client";

import { useEffect, useRef } from "react";
import { subscribeToPush } from "@/lib/pushManager";
import { cacheClear } from "@/lib/cacheStorage";
import { useOnlineStatus } from "@/lib/offlineDetector";
import { usePushNotificationTracking } from '@/hooks/usePushNotificationTracking';
import { useToast } from "@/components/ui/Toast";

interface PwaRegisterProps {
  onUpdateAvailable?: () => void;
}

/**
 * Registers the PWA service worker for offline support, installability,
 * and push notification subscriptions. Also syncs stale IndexedDB cache
 * when the app comes back online after being offline.
 */
export function PwaRegister({ onUpdateAvailable }: PwaRegisterProps) {
  const { toast } = useToast();
  const { online, wasOffline } = useOnlineStatus();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (online && wasOffline && !syncingRef.current) {
      syncingRef.current = true;
      cacheClear("api-responses").finally(() => {
        syncingRef.current = false;
        window.location.reload();
      });
    }
  }, [online, wasOffline]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // A new service worker taking control (self.clients.claim() in sw.js)
    // means a new deploy has activated for this tab. Reload once so the
    // page picks up the fresh JS/HTML instead of running on stale code
    // indefinitely — without this, users only get the new build after a
    // manual hard refresh or clearing site data.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    const timer = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // New deploys change sw.js's byte content (CACHE_NAME bump etc.),
        // so ask the browser to check for an update on every load.
        registration.update().catch((e) => { console.error("[PwaRegister] SW update 실패", e); toast("error", "서비스워커 업데이트에 실패했습니다"); });

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

  const { trackDelivered, trackOpened, trackClicked, trackError } = usePushNotificationTracking();

  // 푸시 알림 이벤트 등록
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 푸시 메시지 수신 이벤트
        registration.addEventListener('message', ((event: MessageEvent) => {
          if (event.data && event.data.type === 'PUSH_RECEIVED') {
            const { notificationId } = event.data;
            trackDelivered(notificationId);
          }
        }) as EventListener);

        // 알림 클릭 이벤트
        navigator.serviceWorker.addEventListener('message', ((event: MessageEvent) => {
          if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
            const { notificationId } = event.data;
            trackOpened(notificationId);
            // 클릭 이벤트는 사용자가 알림을 실제로 클릭했을 때 발생
            if (event.data.action === 'CLICK_ACTION') {
              trackClicked(notificationId);
            }
          }
        }) as EventListener);
      });
    }
  }, [trackDelivered, trackOpened, trackClicked]);

  return null;
}
