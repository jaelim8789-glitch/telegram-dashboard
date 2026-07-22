'use client';

import { useEffect } from 'react';

export function MobilePushNotifier() {
  useEffect(() => {
    // 푸시 알림 권한 요청 및 설정
    const setupPushNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('푸시 알림이 지원되지 않는 브라우저입니다.');
        return;
      }

      try {
        // 서비스 워커 등록
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // 알림 권한 확인 및 요청
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('알림 권한:', permission);
        }

        // 푸시 구독
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            ? urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
            : null,
        });

        // 구독 정보 서버에 전송 (실제 구현 시)
        console.log('푸시 구독 완료:', subscription);
      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
      }
    };

    // Base64 문자열을 UInt8Array로 변환
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

    // 모바일 환경에서만 실행
    if (window.matchMedia('(max-width: 768px)').matches) {
      setupPushNotifications();
    }
  }, []);

  return null;
}