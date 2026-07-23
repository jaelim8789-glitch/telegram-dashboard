'use client';

import { useEffect, useState } from 'react';
import { usePushNotificationTracking } from '@/hooks/usePushNotificationTracking';
import { Panel } from './ui/Panel';
import { Badge } from './ui/Badge';

export function PushNotificationTracker() {
  const { metrics, getDeliveryRate, getOpenRate, getClickRate } = usePushNotificationTracking();
  const [isVisible, setIsVisible] = useState(false);

  // ê°œë°œ ?˜ê²½?ì„œë§??œì‹œ
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
        <h3 className="font-semibold text-app-text">?¸ì‹œ ?Œë¦¼ ?µê³„</h3>
        <Badge tone="neutral" className="text-xs">
          ê°œë°œ??
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?„ì†¡:</span>
          <span className="text-app-text">{metrics.sent}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?„ë‹¬:</span>
          <span className="text-app-text">{metrics.delivered} ({getDeliveryRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?´ëžŒ:</span>
          <span className="text-app-text">{metrics.opened} ({getOpenRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?´ë¦­:</span>
          <span className="text-app-text">{metrics.clicked} ({getClickRate().toFixed(1)}%)</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?¤ë¥˜:</span>
          <span className="text-red-500">{metrics.error}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-app-text-muted">?˜ì‹  ê±°ë?:</span>
          <span className="text-yellow-500">{metrics.unsubscribe}</span>
        </div>
      </div>
    </Panel>
  );
}
