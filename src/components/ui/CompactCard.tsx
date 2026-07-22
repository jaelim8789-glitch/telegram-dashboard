"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface CompactCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color: "indigo" | "emerald" | "rose" | "amber" | "cyan" | "violet" | "orange";
  compact?: boolean;
  onClick?: () => void;
}

const ICON_BG: Record<string, string> = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600", emerald: "bg-gradient-to-br from-emerald-500 to-teal-500",
  rose: "bg-gradient-to-br from-rose-500 to-pink-500", amber: "bg-gradient-to-br from-amber-500 to-orange-500",
  cyan: "bg-gradient-to-br from-cyan-500 to-blue-500", violet: "bg-gradient-to-br from-violet-500 to-purple-500",
  orange: "bg-gradient-to-br from-orange-500 to-red-500",
};

export function CompactCard({ icon, label, value, trend, color, compact, onClick }: CompactCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (compact) { setExpanded(true); setTimeout(() => setExpanded(false), 2000); }
    onClick?.();
  };

  return (
    <motion.button onClick={handleClick} layout transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn("relative flex flex-col items-center justify-center rounded-xl border border-app-border bg-app-card transition-colors hover:border-app-border-strong active:scale-[0.97]", compact ? "min-h-[72px] gap-0.5 px-2 py-2 text-center" : "p-3")}>
      <div className={cn("flex items-center justify-center rounded-lg text-white", ICON_BG[color], compact ? "h-7 w-7" : "h-9 w-9")}>{icon}</div>
      <span className={cn("font-bold tracking-tight text-app-text", compact ? "text-base" : "text-lg")}>{value}</span>
      <AnimatePresence mode="wait">
        {(!compact || expanded) && (
          <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden text-xs text-app-text-muted">{label}</motion.span>
        )}
      </AnimatePresence>
      {compact && expanded && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-1 right-0 z-10 rounded-full bg-app-text px-1.5 py-0.5 text-[9px] font-medium text-app-bg">{label}</motion.div>
      )}
    </motion.button>
  );
}
