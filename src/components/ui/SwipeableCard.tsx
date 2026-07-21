"use client";

import { type ReactNode, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  color?: string;
  onSwipe: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: SwipeAction;
  onSwipeRight?: SwipeAction;
  threshold?: number;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  className = "",
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const leftOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const rightOpacity = useTransform(x, [0, threshold], [0, 1]);
  const scale = useTransform(x, [-threshold, 0, threshold], [0.95, 1, 0.95]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offsetX = info.offset.x;
      if (offsetX < -threshold && onSwipeLeft) {
        onSwipeLeft.onSwipe();
      } else if (offsetX > threshold && onSwipeRight) {
        onSwipeRight.onSwipe();
      }
      x.set(0);
    },
    [x, threshold, onSwipeLeft, onSwipeRight]
  );

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {onSwipeRight && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-y-0 left-0 z-10 flex w-20 items-center justify-center rounded-l-xl"
          aria-hidden="true"
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-l-xl"
            style={{ backgroundColor: onSwipeRight.color ?? "#22c55e" }}
          >
            <div className="flex flex-col items-center gap-1 text-white">
              {onSwipeRight.icon}
              <span className="text-[10px] font-medium whitespace-nowrap">{onSwipeRight.label}</span>
            </div>
          </div>
        </motion.div>
      )}

      {onSwipeLeft && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-y-0 right-0 z-10 flex w-20 items-center justify-center rounded-r-xl"
          aria-hidden="true"
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-r-xl"
            style={{ backgroundColor: onSwipeLeft.color ?? "#ef4444" }}
          >
            <div className="flex flex-col items-center gap-1 text-white">
              {onSwipeLeft.icon}
              <span className="text-[10px] font-medium whitespace-nowrap">{onSwipeLeft.label}</span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: onSwipeLeft ? 0.3 : 0, right: onSwipeRight ? 0.3 : 0 }}
        style={{ x, scale }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        className={`relative z-20 cursor-grab active:cursor-grabbing ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}
