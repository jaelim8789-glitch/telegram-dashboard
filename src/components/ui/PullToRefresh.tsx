"use client";

import { type ReactNode, useCallback, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleDragEnd = useCallback(async () => {
    const currentY = y.get();
    if (currentY >= threshold && !refreshing) {
      setRefreshing(true);
      y.set(0);
      try { await onRefresh(); } finally { setRefreshing(false); }
    } else {
      y.set(0);
    }
  }, [y, threshold, refreshing, onRefresh]);

  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: threshold + 20 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: refreshing ? 36 : 0 }}
        >
          {refreshing && <Loader2 className="h-5 w-5 animate-spin text-app-primary" />}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
