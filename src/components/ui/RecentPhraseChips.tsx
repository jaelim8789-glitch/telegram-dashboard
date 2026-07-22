"use client";

import { cn } from "@/lib/cn";

interface RecentPhraseChipsProps {
  phrases: string[];
  onSelect: (phrase: string) => void;
  className?: string;
}

export function RecentPhraseChips({ phrases, onSelect, className }: RecentPhraseChipsProps) {
  if (phrases.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {phrases.map((phrase, i) => (
        <button
          key={`${i}-${phrase.slice(0, 12)}`}
          type="button"
          onClick={() => onSelect(phrase)}
          title={phrase}
          className="max-w-[160px] truncate rounded-full border border-app-border bg-app-card-hover px-2.5 py-1 text-[11px] text-app-text-muted transition-colors hover:border-app-primary/40 hover:text-app-primary"
        >
          {phrase}
        </button>
      ))}
    </div>
  );
}
