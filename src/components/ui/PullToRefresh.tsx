"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring, type PanInfo } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";

type RefreshState = "idle" | "pulling" | "ready" | "refreshing" | "success" | "error";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, threshold = 80, className = "" }: PullToRefreshProps) {
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  const [state, setState] = useState<RefreshState>("idle");
  const stateTimer = useRef<ReturnType<typeof setTimeout>>();
  const stateRef = useRef(state);
  const mountedRef = useRef(true);

  // Keep ref in sync with state
  stateRef.current = state;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (stateTimer.current) {
        clearTimeout(stateTimer.current);
      }
    };
  }, []);

  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const indicatorOpacity = useTransform(y, [0, 20], [0, 1]);
  const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
  const containerHeight = useTransform(y, [0, threshold], [0, 60]);

  const handleDragEnd = useCallback(
    async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const currentY = info.offset.y;
      // Use ref instead of state to avoid stale closure
      if (currentY >= threshold && stateRef.current !== "refreshing") {
        setState("refreshing");
        y.set(0);
        try {
          await onRefresh();
          if (mountedRef.current) {
            setState("success");
            stateTimer.current = setTimeout(() => {
              if (mountedRef.current) setState("idle");
            }, 1200);
          }
        } catch {
          if (mountedRef.current) {
            setState("error");
            stateTimer.current = setTimeout(() => {
              if (mountedRef.current) setState("idle");
            }, 2000);
          }
        }
      } else {
        setState("idle");
        y.set(0);
      }
    },
    [y, threshold, onRefresh]
  );

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const currentY = info.offset.y;
      if (currentY <= 0) return;
      if (currentY >= threshold) {
        setState("ready");
      } else if (currentY > 10) {
        setState("pulling");
      } else {
        setState("idle");
      }
    },
    [threshold]
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator area */}
      <motion.div
        style={{ height: containerHeight }}
        className="flex items-center justify-center overflow-hidden"
      >
        <motion.div
          style={{
            opacity: state === "refreshing" || state === "success" || state === "error" ? 1 : indicatorOpacity,
            scale: indicatorScale,
          }}
          className="flex flex-col items-center gap-1"
        >
          {state === "refreshing" && (
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
              <div className="absolute inset-0 h-6 w-6 animate-ping rounded-full bg-app-primary/10" />
            </div>
          )}
          {state === "success" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center gap-1.5"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-success/20">
                <CheckCircle2 className="h-4 w-4 text-app-success" />
              </div>
              <span className="text-xs font-medium text-app-success">업데이트 완료</span>
            </motion.div>
          )}
          {state === "error" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center gap-1.5"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-danger/20">
                <AlertCircle className="h-4 w-4 text-app-danger" />
              </div>
              <span className="text-xs font-medium text-app-danger">새로고침 실패</span>
            </motion.div>
          )}
          {state === "pulling" && (
            <div className="flex flex-col items-center gap-0.5">
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ArrowDown className="h-5 w-5 text-app-text-muted" />
              </motion.div>
              <span className="text-[10px] font-medium text-app-text-muted">당겨서 새로고침</span>
              {/* Gold progress bar */}
              <motion.div
                className="mt-1 h-0.5 rounded-full bg-app-border/30 overflow-hidden w-24"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    scaleX: pullProgress,
                    transformOrigin: "left",
                    background: "linear-gradient(90deg, var(--color-accent), var(--color-gold-deep))",
                  }}
                />
              </motion.div>
            </div>
          )}
          {state === "ready" && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-0.5"
            >
              {/* Gold accent circle */}
              <div className="relative">
                <div
                  className="h-7 w-7 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: "var(--color-accent)",
                    boxShadow: "0 0 12px var(--color-accent-glow)",
                  }}
                >
                  <ArrowDown className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div
                  className="absolute inset-0 h-7 w-7 animate-ping rounded-full"
                  style={{ backgroundColor: "var(--color-accent-glow)" }}
                />
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                놓으면 새로고침
              </span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Content with spring-based drag */}
      <motion.div
        style={{ y: springY }}
        drag="y"
        dragConstraints={{ top: 0, bottom: threshold + 30 }}
        dragElastic={{ top: 0, bottom: state === "refreshing" || state === "success" || state === "error" ? 0 : 0.45 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative"
        whileTap={{ cursor: state === "refreshing" ? "default" : "grabbing" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
