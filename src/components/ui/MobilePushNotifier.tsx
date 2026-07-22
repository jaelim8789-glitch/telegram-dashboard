'use client';

import { useEffect, useState } from 'react';

export function MobilePushNotifier() {
  const [notifError, setNotifError] = useState(false);

  useEffect(() => {
    const setupPushNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (publicKey) {
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
      } catch {
        setNotifError(true);
      }
    };

    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    if (window.matchMedia('(max-width: 768px)').matches) {
      setupPushNotifications();
    }
  }, []);

  if (notifError) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-50 text-xs">
        푸시 알림 설정에 실패했습니다
      </div>
    );
  }

  return null;
}
