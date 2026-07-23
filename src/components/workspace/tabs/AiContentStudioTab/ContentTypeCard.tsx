"use client";

import type { ContentType } from "@/lib/content-studio-api";
import { cn } from "@/lib/cn";

interface ContentTypeCardProps {
  id: ContentType;
  label: string;
  description: string;
  emoji: string;
  selected: boolean;
  onSelect: (id: ContentType) => void;
}

export function ContentTypeCard({ id, label, description, emoji, selected, onSelect }: ContentTypeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
        "min-w-[100px] flex-1",
        selected
          ? "border-app-primary bg-app-primary/10 shadow-sm ring-1 ring-app-primary/30"
          : "border-app-border bg-app-card hover:border-app-primary/30 hover:bg-app-card-hover"
      )}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span className={cn(
        "text-xs font-semibold",
        selected ? "text-app-primary" : "text-app-text"
      )}>
        {label}
      </span>
      <span className="text-[10px] leading-tight text-app-text-muted line-clamp-2">
        {description}
      </span>
    </button>
  );
}