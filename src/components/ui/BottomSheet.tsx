"use client";

import { type ReactNode, useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, useSpring, type PanInfo } from "framer-motion";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/useReducedMotion";

type SnapPoint = number; // percentage of screen height (e.g., 25, 50, 85)

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  snapPoints?: SnapPoint[];
  initialSnap?: number;
  showCloseButton?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className = "",
  snapPoints = [85],
  initialSnap,
  showCloseButton = true,
}: BottomSheetProps) {
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.8 });
  const controls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = useState(initialSnap ?? snapPoints[snapPoints.length - 1]);
  const [snapHeights, setSnapHeights] = useState<number[]>([]);
  const [contentScrollTop, setContentScrollTop] = useState(0);
  const reduced = useReducedMotion();

  // Calculate snap heights in pixels based on viewport
  useEffect(() => {
    if (!open) return;
    const vh = window.innerHeight;
    const heights = snapPoints.map((p) => vh * (1 - p / 100));
    setSnapHeights(heights);
    if (!reduced) {
      y.set(heights[snapPoints.indexOf(currentSnap)] ?? heights[heights.length - 1]);
    }
  }, [open, snapPoints, currentSnap, reduced]);

  // Body scroll lock with touch-action preservation
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Parallax: title opacity/transform based on content scroll
  const titleOpacity = useTransform(() => Math.max(0, 1 - contentScrollTop / 60));
  const titleY = useTransform(() => -contentScrollTop * 0.3);
  const headerBorderOpacity = useTransform(() => Math.min(1, contentScrollTop / 20));

  // Scroll shadow intensity based on content scroll
  const scrollShadow = useTransform(() => Math.min(0.15, contentScrollTop / 200));

  // Backdrop blur and opacity based on sheet position
  const backdropOpacity = useTransform(y, [0, 100], [0.5, 0]);

  const findNearestSnap = useCallback(
    (currentY: number) => {
      if (snapHeights.length === 0) return 0;
      return snapHeights.reduce((prev, curr) =>
        Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
      );
    },
    [snapHeights]
  );

  const onDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      if (velocity > 500 || offset > 150) {
        onClose();
        return;
      }

      if (snapHeights.length > 0) {
        const currentY = y.get();
        const nearest = findNearestSnap(currentY);
        const snapIndex = snapHeights.indexOf(nearest);
        setCurrentSnap(snapPoints[snapIndex]);
        y.set(nearest);
      } else {
        y.set(0);
      }
    },
    [y, snapHeights, snapPoints, findNearestSnap, onClose]
  );

  const handleDragEndBasic = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 120 || info.velocity.y > 400) {
        onClose();
      }
      y.set(0);
    },
    [y, onClose]
  );

  const hasMultipleSnaps = snapPoints.length > 1;

  // Track content scroll for parallax header effect
  const handleContentScroll = useCallback(() => {
    if (contentRef.current) {
      setContentScrollTop(contentRef.current.scrollTop);
    }
  }, []);

  // Animation variants respecting reduced motion
  const sheetVariants = {
    initial: { y: "100%" },
    animate: { y: snapHeights[0] ?? 0 },
    exit: { y: "100%" },
  };

  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 0.5 },
    exit: { opacity: 0 },
  };

  const springTransition = reduced
    ? { duration: 0.2, ease: "easeOut" as const }
    : {
        type: "spring" as const,
        stiffness: 400,
        damping: 35,
        mass: 0.8,
      };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Premium backdrop with blur */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={backdropVariants}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ opacity: backdropOpacity }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Corner radius accent glow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 rounded-t-3xl pointer-events-none z-10"
            style={{
              background: "linear-gradient(180deg, var(--color-accent-glow) 0%, transparent 100%)",
              opacity: 0.3,
            }}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            drag={reduced ? false : "y"}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: snapHeights[0] ?? 300 }}
            dragElastic={{ top: 0.05, bottom: hasMultipleSnaps ? 0.1 : 0.5 }}
            onDragEnd={hasMultipleSnaps ? onDragEnd : handleDragEndBasic}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={sheetVariants}
            transition={springTransition}
            style={!reduced ? { y: springY } : undefined}
            className={cn(
              "relative w-full flex flex-col rounded-t-3xl overflow-hidden",
              "before:absolute before:inset-0 before:rounded-t-3xl before:border-t before:border-l before:border-r before:border-[var(--color-accent-border)] before:opacity-20 before:pointer-events-none",
              className
            )}
          >
            {/* Sheet background with subtle gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "var(--color-card)",
              }}
            />

            {/* Scroll shadow (appears as content scrolls) */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-20 pointer-events-none h-6"
              style={{
                opacity: scrollShadow,
                background: "linear-gradient(180deg, var(--color-card) 0%, transparent 100%)",
              }}
            />

            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-40 z-10" />

            {/* Drag handle area with parallax */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0 relative z-10 bg-app-card">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => controls.start(e)}
                  className="touch-none cursor-grab active:cursor-grabbing flex items-center justify-center rounded-full p-1 hover:bg-app-card-hover transition-colors min-h-[36px] min-w-[36px]"
                  aria-label="드래그로 크기 조절"
                >
                  <GripVertical className="h-3.5 w-3.5 text-app-text-muted" />
                </button>
                <div
                  className="mx-auto h-1 w-12 rounded-full bg-app-border/60 touch-none cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => controls.start(e)}
                />
              </div>

              {showCloseButton && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted hover:bg-[var(--color-accent-light)] hover:text-app-primary transition-all duration-200"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Title section with parallax scroll effect */}
            {title && (
              <motion.div
                className="shrink-0 relative z-10 bg-app-card"
                style={!reduced ? { opacity: titleOpacity, y: titleY } : undefined}
              >
                <div className="flex items-center justify-between px-5 pb-3">
                  <h2
                    className="text-sm font-semibold tracking-wide"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {title}
                  </h2>
                  {hasMultipleSnaps && (
                    <div className="flex items-center gap-1.5">
                      {snapPoints.map((point, i) => (
                        <button
                          key={point}
                          type="button"
                          onClick={() => {
                            const targetY = snapHeights[i];
                            if (targetY != null) {
                              setCurrentSnap(point);
                              y.set(targetY);
                            }
                          }}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            snapPoints.indexOf(currentSnap) === i
                              ? "w-5 bg-app-primary"
                              : "w-1.5 bg-app-border hover:bg-app-text-muted"
                          )}
                          aria-label={`${point}%`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* Animated gold divider */}
                <motion.div
                  className="h-px mx-5 bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent"
                  style={{ opacity: headerBorderOpacity }}
                />
              </motion.div>
            )}

            {/* Content area with scroll tracking */}
            <div
              ref={contentRef}
              onScroll={handleContentScroll}
              className="flex-1 overflow-y-auto px-5 py-4 pb-8 scrollbar-thin overscroll-contain"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
