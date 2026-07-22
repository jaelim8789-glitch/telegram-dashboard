"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  color: string; // tailwind bg class e.g. "bg-app-danger"
  onAction: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number; // px to trigger action
  disabled?: boolean;
  className?: string;
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  disabled = false,
  className = "",
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [snapped, setSnapped] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const leftWidth = leftActions.length * 72;
  const rightWidth = rightActions.length * 72;

  const leftOpacity = useTransform(x, [0, leftWidth], [0, 1]);
  const rightOpacity = useTransform(x, [-rightWidth, 0], [1, 0]);

  const handleDragEnd = useCallback(() => {
    const currentX = x.get();
    if (currentX > threshold && leftActions.length > 0) {
      x.set(leftWidth);
      setSnapped("left");
    } else if (currentX < -threshold && rightActions.length > 0) {
      x.set(-rightWidth);
      setSnapped("right");
    } else {
      x.set(0);
      setSnapped(null);
    }
  }, [x, threshold, leftActions.length, rightActions.length, leftWidth, rightWidth]);

  function close() {
    x.set(0);
    setSnapped(null);
  }

  function triggerAction(action: SwipeAction) {
    close();
    setTimeout(action.onAction, 150);
  }

  // Close on outside interaction
  useEffect(() => {
    if (!snapped) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [snapped]);

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      {/* Left actions (reveal on swipe right) */}
      <div className="absolute inset-y-0 left-0 flex" style={{ width: leftWidth }}>
        <motion.div className="flex h-full" style={{ opacity: leftOpacity }}>
          {leftActions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => triggerAction(action)}
              className={`flex w-[72px] items-center justify-center ${action.color} text-white text-[10px] font-medium`}
            >
              <div className="flex flex-col items-center gap-0.5">
                {action.icon}
                <span>{action.label}</span>
              </div>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Right actions (reveal on swipe left) */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: rightWidth }}>
        <motion.div className="flex h-full ml-auto" style={{ opacity: rightOpacity }}>
          {rightActions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => triggerAction(action)}
              className={`flex w-[72px] items-center justify-center ${action.color} text-white text-[10px] font-medium`}
            >
              <div className="flex flex-col items-center gap-0.5">
                {action.icon}
                <span>{action.label}</span>
              </div>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative bg-app-card"
        onDragStart={() => snapped && close()}
      >
        {children}
      </motion.div>
    </div>
  );
}
