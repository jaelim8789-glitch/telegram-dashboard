"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipContextValue {
  registerTooltip: (id: string, trigger: HTMLElement, content: ReactNode, placement: TooltipPlacement) => void;
  unregisterTooltip: (id: string) => void;
  openTooltip: (id: string) => void;
  closeTooltip: (id: string) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

interface TooltipProviderProps {
  children: ReactNode;
  /** Delay in ms before showing the tooltip (default: 300). */
  showDelay?: number;
  /** Delay in ms before hiding the tooltip (default: 150). */
  hideDelay?: number;
}

interface TooltipEntry {
  id: string;
  trigger: HTMLElement;
  content: ReactNode;
  placement: TooltipPlacement;
  visible: boolean;
}

export function TooltipProvider({
  children,
  showDelay = 300,
  hideDelay = 150,
}: TooltipProviderProps) {
  const [tooltips, setTooltips] = useState<Map<string, TooltipEntry>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const registerTooltip = useCallback(
    (id: string, trigger: HTMLElement, content: ReactNode, placement: TooltipPlacement) => {
      setTooltips((prev) => {
        const next = new Map(prev);
        next.set(id, { id, trigger, content, placement, visible: false });
        return next;
      });
    },
    []
  );

  const unregisterTooltip = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setTooltips((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openTooltip = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.set(
        id,
        setTimeout(() => {
          setTooltips((prev) => {
            const entry = prev.get(id);
            if (!entry) return prev;
            const next = new Map(prev);
            next.set(id, { ...entry, visible: true });
            return next;
          });
        }, showDelay)
      );
    },
    [showDelay]
  );

  const closeTooltip = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.set(
        id,
        setTimeout(() => {
          setTooltips((prev) => {
            const entry = prev.get(id);
            if (!entry) return prev;
            const next = new Map(prev);
            next.set(id, { ...entry, visible: false });
            return next;
          });
        }, hideDelay)
      );
    },
    [hideDelay]
  );

  return (
    <TooltipContext.Provider value={{ registerTooltip, unregisterTooltip, openTooltip, closeTooltip }}>
      {children}
      {/* Render only visible tooltips via portal to body */}
      {Array.from(tooltips.values())
        .filter((entry) => entry.visible)
        .map((entry) => (
          <TooltipPortal key={entry.id} entry={entry} />
        ))}
    </TooltipContext.Provider>
  );
}

// ── Portal renders each visible tooltip into document.body ──

function getPosition(trigger: HTMLElement, placement: TooltipPlacement) {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  switch (placement) {
    case "top":
      return {
        left: rect.left + rect.width / 2,
        top: rect.top - gap,
      };
    case "bottom":
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + gap,
      };
    case "left":
      return {
        left: rect.left - gap,
        top: rect.top + rect.height / 2,
      };
    case "right":
      return {
        left: rect.right + gap,
        top: rect.top + rect.height / 2,
      };
  }
}

const PLACEMENT_STYLES: Record<TooltipPlacement, string> = {
  top: "-translate-x-1/2 -translate-y-full",
  bottom: "-translate-x-1/2",
  left: "-translate-x-full -translate-y-1/2",
  right: "-translate-y-1/2",
};

const PLACEMENT_INITIAL: Record<TooltipPlacement, { y?: number; x?: number }> = {
  top: { y: 6 },
  bottom: { y: -6 },
  left: { x: 6 },
  right: { x: -6 },
};

function TooltipPortal({ entry }: { entry: TooltipEntry }) {
  const { trigger, content, placement, visible } = entry;
  const pos = getPosition(trigger, placement);
  const offset = PLACEMENT_INITIAL[placement];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, ...offset }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...offset }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "fixed z-[200] pointer-events-none",
            PLACEMENT_STYLES[placement]
          )}
          style={{ left: pos.left, top: pos.top }}
        >
          <div className="rounded-lg border border-app-border bg-app-card px-2.5 py-1.5 text-[11px] font-medium text-app-text shadow-lg whitespace-nowrap">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Trigger wrapper ──

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
}

export function Tooltip({
  children,
  content,
  placement = "top",
  className,
}: TooltipProps) {
  const ctx = useContext(TooltipContext);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!ctx || !wrapperRef.current) return;
    ctx.registerTooltip(id, wrapperRef.current, content, placement);
    ctx.openTooltip(id);
  }, [ctx, id, content, placement]);

  const handleMouseLeave = useCallback(() => {
    if (!ctx) return;
    ctx.closeTooltip(id);
  }, [ctx, id]);

  const handleFocus = useCallback(() => {
    if (!ctx || !wrapperRef.current) return;
    ctx.registerTooltip(id, wrapperRef.current, content, placement);
    ctx.openTooltip(id);
  }, [ctx, id, content, placement]);

  const handleBlur = useCallback(() => {
    if (!ctx) return;
    ctx.closeTooltip(id);
  }, [ctx, id]);

  return (
    <span
      ref={wrapperRef}
      className={cn("inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </span>
  );
}

// ── Standalone hook for imperative usage ──

export function useTooltip() {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("useTooltip must be used within a TooltipProvider");
  return ctx;
}
