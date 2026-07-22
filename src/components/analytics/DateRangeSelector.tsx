"use client";

import type { DateRangeKey } from "./mockData";
import { DATE_RANGE_LABELS } from "./mockData";

interface DateRangeSelectorProps {
  active: DateRangeKey;
  onChange: (key: DateRangeKey) => void;
}

export function DateRangeSelector({ active, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {DATE_RANGE_LABELS.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
            active === item.key
              ? "bg-violet-500 text-white"
              : "bg-app-card text-app-text-muted hover:bg-app-card-hover"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
