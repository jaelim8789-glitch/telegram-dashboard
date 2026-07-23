"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface ToggleProps {
  label: string;
  description?: string;
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({
  label,
  description,
  defaultOn = false,
  checked,
  onChange,
  disabled,
}: ToggleProps) {
  const [uncontrolledOn, setUncontrolledOn] = useState(defaultOn);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : uncontrolledOn;

  function toggle() {
    if (disabled) return;
    if (onChange) {
      onChange(!on);
    } else {
      setUncontrolledOn((v) => !v);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="text-sm text-[#e5e5ec]">{label}</div>
        {description && (
          <div className="text-xs text-[#686880]">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "focus-ring relative h-5 w-9 shrink-0 rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-11 min-w-11 sm:min-h-5 sm:min-w-9",
          "flex items-center justify-center",
          "bg-[rgba(10,10,15,0.88)] backdrop-blur-xl saturate-[1.2]",
          "border border-[rgba(139,92,246,0.12)]",
          on
            ? "border-[rgba(139,92,246,0.30)] shadow-[0_0_12px_rgba(139,92,246,0.10),inset_0_0_0_1px_rgba(139,92,246,0.08)]"
            : "border-[rgba(139,92,246,0.08)]"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={cn(
            "absolute h-4 w-4 rounded-full",
            on
              ? "bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-[0_0_8px_rgba(139,92,246,0.30)]"
              : "bg-[rgba(104,104,128,0.50)]"
          )}
          style={{ left: on ? 18 : 2 }}
        />
      </button>
    </div>
  );
}
