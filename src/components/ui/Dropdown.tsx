"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
}

export function Dropdown({
  items,
  value,
  onChange,
  placeholder = "Select...",
  className,
  menuClassName,
  itemClassName,
  disabled,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = items.find((i) => i.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "focus-ring flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2 text-sm transition-all duration-200",
          "bg-[rgba(10,10,15,0.88)] backdrop-blur-xl saturate-[1.2]",
          "border border-[rgba(139,92,246,0.12)]",
          "hover:border-[rgba(139,92,246,0.25)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[rgba(139,92,246,0.40)] shadow-[0_0_0_3px_rgba(139,92,246,0.10)]",
          !selectedItem && "text-[#686880]"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedItem?.icon}
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#686880] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px] p-1",
            "bg-[rgba(10,10,15,0.92)] backdrop-blur-2xl saturate-[1.3]",
            "border border-[rgba(139,92,246,0.15)]",
            "shadow-[0_16px_48px_rgba(0,0,0,0.25),0_0_0_1px_rgba(139,92,246,0.04)]",
            "animate-scale-in origin-top",
            menuClassName
          )}
        >
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                onChange?.(item.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-[#e5e5ec] transition-all duration-150",
                "hover:bg-[rgba(139,92,246,0.10)] hover:text-[#8B5CF6]",
                item.value === value && "bg-[rgba(139,92,246,0.08)] text-[#8B5CF6] font-medium",
                item.disabled && "cursor-not-allowed opacity-40",
                itemClassName
              )}
            >
              {item.icon && (
                <span className="text-[#686880]">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
