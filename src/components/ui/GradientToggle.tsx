"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface GradientToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function GradientToggle({ checked, onChange, disabled, label }: GradientToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-app-text">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative flex items-center rounded-full transition-colors duration-200",
          "h-7 min-w-11 w-11",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-gradient-to-r from-[var(--color-accent)] to-[#B8860B]"
            : "bg-app-border-strong"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute h-6 w-6 rounded-full bg-white shadow-md"
          style={{ left: checked ? 20 : 2, top: 2 }}
        />
      </button>
    </div>
  );
}
