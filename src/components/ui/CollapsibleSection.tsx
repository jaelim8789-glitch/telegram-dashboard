"use client";

import { useState, useId, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  groupKey?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

function getInitialState(key: string | undefined, fallback: boolean): boolean {
  if (typeof window === "undefined" || !key) return fallback;
  try { const stored = localStorage.getItem(`collapsible:${key}`); if (stored !== null) return stored === "true"; } catch (e) { console.warn('Unhandled error in CollapsibleSection', e) }
  return fallback;
}

function persistState(key: string | undefined, open: boolean) {
  if (!key) return;
  try { localStorage.setItem(`collapsible:${key}`, String(open)); } catch (e) { console.warn('Unhandled error in CollapsibleSection', e) }
}

export function CollapsibleSection({ title, icon, defaultOpen = true, badge, children, groupKey, className, headerClassName, contentClassName }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => getInitialState(groupKey, defaultOpen));
  const contentId = useId();

  const toggle = () => setOpen(p => { const n = !p; persistState(groupKey, n); return n; });

  return (
    <div className={cn("collapsible-root", className)}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={contentId} className={cn("collapsible-header w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-app-card-hover/50 hover:bg-app-card-hover transition-colors", headerClassName)}>
        <span className="flex items-center gap-2">
          {icon && <span className="collapsible-icon">{icon}</span>}
          <span className="text-sm font-medium text-app-text">{title}</span>
          {badge && <span className="collapsible-badge">{badge}</span>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="collapsible-chevron text-app-text-muted"><ChevronDown className="h-4 w-4" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={contentId} key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className={cn("pt-2", contentClassName)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
