"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, RotateCcw, Trash2 } from "lucide-react";

interface SwipeAction { icon: typeof Copy; label: string; color: string; onAction: () => void; }

export function SwipeableRow({ children, actions, onSwipeStart, onSwipeEnd }: { children: React.ReactNode; actions: SwipeAction[]; onSwipeStart?: () => void; onSwipeEnd?: () => void }) {
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);

  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = startX.current - e.changedTouches[0].clientX;
    if (dx > 60) { setSwiped(true); onSwipeStart?.(); }
    else if (dx < -30) { setSwiped(false); onSwipeEnd?.(); }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2">
        {actions.map((a, i) => (
          <button key={i} onClick={() => { a.onAction(); setSwiped(false); }} className="flex h-10 w-10 items-center justify-center rounded-lg active:scale-90" style={{ backgroundColor: a.color }}>
            <a.icon className="h-4 w-4 text-white" />
          </button>
        ))}
      </div>
      <motion.div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} animate={{ x: swiped ? -(actions.length * 52) : 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        {children}
      </motion.div>
    </div>
  );
}
