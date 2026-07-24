import { useEffect, useState } from 'react';

interface PushNotificationMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  error: number;
  unsubscribe: number;
}

interface PushNotificationTracking {
  metrics: PushNotificationMetrics;
  trackSent: (notificationId: string) => void;
  trackDelivered: (notificationId: string) => void;
  trackOpened: (notificationId: string) => void;
  trackClicked: (notificationId: string) => void;
  trackError: (notificationId: string, error: string) => void;
  trackUnsubscribe: (notificationId: string) => void;
  getDeliveryRate: () => number;
  getOpenRate: () => number;
  getClickRate: () => number;
}

const METRICS_STORAGE_KEY = 'push_notification_metrics';

export function usePushNotificationTracking(): PushNotificationTracking {
  const [metrics, setMetrics] = useState<PushNotificationMetrics>({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    error: 0,
    unsubscribe: 0,
  });

  // 초기?? 로컬 ?�토리�??�서 메트�?�� 불러?�기
  useEffect(() => {
    const storedMetrics = localStorage.getItem(METRICS_STORAGE_KEY);
    if (storedMetrics) {
      try {
        setMetrics(JSON.parse(storedMetrics));
      } catch (e) { console.warn('Unhandled error in usePushNotificationTracking', e) }
    }
  }, []);

  // 메트�?�� 변�???로컬 ?�토리�????�??
  useEffect(() => {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
  }, [metrics]);

  const updateMetric = (field: keyof PushNotificationMetrics) => {
    setMetrics(prev => ({
      ...prev,
      [field]: prev[field] + 1
    }));
  };

  const trackSent = (notificationId: string) => {
    updateMetric('sent');
    // ?�림 ID?� ?�태�?로컬 ?�토리�????�??
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    notificationStatus[notificationId] = { sent: Date.now() };
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const trackDelivered = (notificationId: string) => {
    updateMetric('delivered');
    // ?�림 ID ?�태 ?�데?�트
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    if (notificationStatus[notificationId]) {
      notificationStatus[notificationId].delivered = Date.now();
    }
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const trackOpened = (notificationId: string) => {
    updateMetric('opened');
    // ?�림 ID ?�태 ?�데?�트
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    if (notificationStatus[notificationId]) {
      notificationStatus[notificationId].opened = Date.now();
    }
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const trackClicked = (notificationId: string) => {
    updateMetric('clicked');
    // ?�림 ID ?�태 ?�데?�트
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    if (notificationStatus[notificationId]) {
      notificationStatus[notificationId].clicked = Date.now();
    }
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const trackError = (notificationId: string, error: string) => {
    updateMetric('error');
    // ?�림 ID ?�태 ?�데?�트
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    if (notificationStatus[notificationId]) {
      notificationStatus[notificationId].error = { error, timestamp: Date.now() };
    }
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const trackUnsubscribe = (notificationId: string) => {
    updateMetric('unsubscribe');
    // ?�림 ID ?�태 ?�데?�트
    const notificationStatus = JSON.parse(localStorage.getItem('notification_status') || '{}');
    if (notificationStatus[notificationId]) {
      notificationStatus[notificationId].unsubscribed = Date.now();
    }
    localStorage.setItem('notification_status', JSON.stringify(notificationStatus));
  };

  const getDeliveryRate = (): number => {
    if (metrics.sent === 0) return 0;
    return (metrics.delivered / metrics.sent) * 100;
  };

  const getOpenRate = (): number => {
    if (metrics.delivered === 0) return 0;
    return (metrics.opened / metrics.delivered) * 100;
  };

  const getClickRate = (): number => {
    if (metrics.opened === 0) return 0;
    return (metrics.clicked / metrics.opened) * 100;
  };

  return {
    metrics,
    trackSent,
    trackDelivered,
    trackOpened,
    trackClicked,
    trackError,
    trackUnsubscribe,
    getDeliveryRate,
    getOpenRate,
    getClickRate,
  };
}