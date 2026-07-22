'use client';

import { useEffect, useState } from 'react';
import { usePushNotificationTracking } from '@/hooks/usePushNotificationTracking';
import { Panel } from './ui/Panel';
import { Badge } from './ui/Badge';

export function PushNotificationTracker() {
  const { metrics, getDeliveryRate, getOpenRate, getClickRate } = usePushNotificationTracking();
  const [isVisible, setIsVisible] = useState(false);

  // 개발 환경에서만 표시
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Panel className="fixed bottom-4 right-4 z-50 w-80 bg-black/80 backdrop-blur-sm border-app-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-app-text">푸시 알림 통계</h3>
        <Badge tone="neutral" className="text-xs">
          개발용
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">전송:</span>
          <span className="text-app-text">{metrics.sent}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">전달:</span>
          <span className="text-app-text">{metrics.delivered} ({getDeliveryRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">열람:</span>
          <span className="text-app-text">{metrics.opened} ({getOpenRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">클릭:</span>
          <span className="text-app-text">{metrics.clicked} ({getClickRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">오류:</span>
          <span className="text-red-500">{metrics.error}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">수신 거부:</span>
          <span className="text-yellow-500">{metrics.unsubscribe}</span>
        </div>
      </div>
    </Panel>
  );
}