"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  label: string;
  description?: string;
  defaultOn?: boolean;
  /** Controlled mode: pass both `checked` and `onChange` to back this with real state
   * (e.g. a backend-persisted setting) instead of the local-only default below. */
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, defaultOn = false, checked, onChange, disabled }: ToggleProps) {
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
        <div className="text-sm text-neutral-200">{label}</div>
        {description && <div className="text-xs text-neutral-600">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          on ? "bg-sky-500" : "bg-neutral-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            on ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
