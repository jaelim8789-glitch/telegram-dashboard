"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";

interface MobileSwipeContainerProps {
  currentTabId: string;
  allTabIds: string[];
  onTabChange: (tabId: string) => void;
  enabled?: boolean;
  children: React.ReactNode;
}

export function MobileSwipeContainer({
  currentTabId,
  allTabIds,
  onTabChange,
  enabled = true,
  children,
}: MobileSwipeContainerProps) {
  const { handlers, direction, isSwiping, swipeProgress } = useSwipeTabs();
  const startX = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    startX.current = e.clientX;
    handlers.onPointerDown(e);
  }, [enabled, handlers]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    handlers.onPointerMove(e);
  }, [enabled, handlers]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    const dx = e.clientX - startX.current;
    const currentIndex = allTabIds.indexOf(currentTabId);
    if (dx < -50 && currentIndex < allTabIds.length - 1) {
      onTabChange(allTabIds[currentIndex + 1]);
    } else if (dx > 50 && currentIndex > 0) {
      onTabChange(allTabIds[currentIndex - 1]);
    }
    handlers.onPointerUp(e);
  }, [enabled, currentTabId, allTabIds, onTabChange, handlers]);

  const x = direction === "left" ? -swipeProgress * 80 : direction === "right" ? swipeProgress * 80 : 0;

  return (
    <motion.div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      animate={{ x: isSwiping ? x : 0 }}
      transition={isSwiping ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      style={{ touchAction: "pan-y" }}
      className={cn("w-full", isSwiping && "cursor-grabbing")}
    >
      {children}
    </motion.div>
  );
}
