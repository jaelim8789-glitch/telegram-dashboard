"use client";
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface TabPeekProps {
  children: React.ReactNode;
  previewContent: React.ReactNode;
  tabName: string;
  className?: string;
}

export function TabPeek({ children, previewContent, tabName, className }: TabPeekProps) {
  const [isPeeking, setIsPeeking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    setIsPeeking(true);
    // ë§ì°?¤ë? ?ì ???¼ì  ?ê° ?ì ë¯¸ë¦¬ë³´ê¸° ì¢ë£
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 1000);
  };

  const handleMouseUp = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 500);
  };

  const handleTouchStart = () => {
    setIsPeeking(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 1000);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPeeking(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="cursor-pointer"
      >
        {children}
      </div>

      <AnimatePresence>
        {isPeeking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed z-50 w-64 max-h-48 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-2xl",
              "left-1/2 transform -translate-x-1/2 -translate-y-full bottom-full mb-2"
            )}
          >
            <div className="p-3 border-b border-app-border bg-app-surface/50">
              <h3 className="text-sm font-semibold text-app-text">{tabName} ë¯¸ë¦¬ë³´ê¸°</h3>
            </div>
            <div className="p-3 max-h-32 overflow-y-auto">
              {previewContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}