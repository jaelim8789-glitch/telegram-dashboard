"use client";

import React from "react";
import { motion, useMotionValue } from "framer-motion";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";
import { cn } from "@/lib/cn";

interface MobileSwipeContainerProps {
  children: React.ReactNode;
  currentTabId: string;
  allTabIds: string[];
  onTabChange?: (tabId: string) => void;
  enabled?: boolean;
}

export function MobileSwipeContainer({ children, currentTabId, allTabIds, onTabChange, enabled = true }: MobileSwipeContainerProps) {
  const { handlers, isSwiping, swipeProgress, direction } = useSwipeTabs({ currentTabId, allTabIds, onTabChange, enabled });

  return (
    <div className="relative flex-1 overflow-hidden touch-pan-y" style={{ overscrollBehaviorX: "none" }}
      onPointerDown={handlers.onPointerDown} onPointerMove={handlers.onPointerMove} onPointerUp={handlers.onPointerUp}>
      <motion.div className="h-full" animate={isSwiping ? { x: direction * swipeProgress * -60 } : { x: 0 }}
        transition={isSwiping ? { type: "spring", stiffness: 300, damping: 30 } : { type: "spring", stiffness: 400, damping: 35 }}>
        {children}
      </motion.div>
      {isSwiping && (
        <div className="pointer-events-none absolute inset-y-0 z-10 flex items-center text-[11px] font-medium text-app-text-muted" style={{ [direction === 1 ? "left" : "right"]: 8 }}>
          {direction === 1 ? "←" : "→"}
        </div>
      )}
    </div>
  );
}
