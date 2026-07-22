"use client";

import { cn } from "@/lib/cn";
import { CompactCard } from "@/components/ui/CompactCard";

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  trend?: "up" | "down" | "neutral";
  onClick?: () => void;
}

interface MiniStatGridProps {
  items: StatItem[];
  className?: string;
}

export function MiniStatGrid({ items, className }: MiniStatGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {items.map((item, i) => (
        <CompactCard key={i} {...item} compact />
      ))}
    </div>
  );
}
