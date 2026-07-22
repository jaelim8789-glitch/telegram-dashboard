"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  groupKey?: string;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
  groupKey,
  className,
}: CollapsibleSectionProps) {
  const id = useId();
  const contentId = `collapsible-content-${id}`;
  const [open, setOpen] = useState(() => {
    if (groupKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`collapsible-${groupKey}`);
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (groupKey) {
      try {
        localStorage.setItem(`collapsible-${groupKey}`, String(open));
      } catch {}
    }
  }, [open, groupKey]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className={cn("overflow-hidden", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-app-text hover:bg-app-card-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-app-text-muted">{icon}</span>}
          {title}
        </span>
        <span className="flex items-center gap-2">
          {badge != null && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-app-primary/20 px-1.5 text-[10px] font-semibold text-app-primary">
              {badge}
            </span>
          )}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-app-text-muted"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
