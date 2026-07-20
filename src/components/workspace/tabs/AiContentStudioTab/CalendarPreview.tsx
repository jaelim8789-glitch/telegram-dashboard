"use client";

import { useMemo } from "react";
import type { ContentType } from "@/lib/content-studio-api";
import { CONTENT_TYPES } from "@/lib/content-studio-api";
import { cn } from "@/lib/cn";

interface CalendarPreviewProps {
  dailyCount: number;
  selectedTypes: ContentType[];
}

const TIME_SLOTS: { time: string; label: string }[] = [
  { time: "08:00", label: "아침" },
  { time: "09:00", label: "오전" },
  { time: "10:00", label: "오전" },
  { time: "11:00", label: "오전" },
  { time: "12:00", label: "점심" },
  { time: "13:00", label: "오후" },
  { time: "14:00", label: "오후" },
  { time: "15:00", label: "오후" },
  { time: "16:00", label: "오후" },
  { time: "17:00", label: "저녁" },
  { time: "18:00", label: "저녁" },
  { time: "19:00", label: "야간" },
  { time: "20:00", label: "야간" },
  { time: "21:00", label: "야간" },
  { time: "22:00", label: "야간" },
];

const CONTENT_TYPE_ORDER: ContentType[] = [
  "promotional",
  "announcement",
  "engagement",
  "informational",
  "testimonial",
  "event",
];

function getEmoji(type: ContentType): string {
  return CONTENT_TYPES.find((c) => c.id === type)?.emoji ?? "📄";
}

function getLabel(type: ContentType): string {
  return CONTENT_TYPES.find((c) => c.id === type)?.label ?? type;
}

export function CalendarPreview({ dailyCount, selectedTypes }: CalendarPreviewProps) {
  const slots = useMemo(() => {
    if (selectedTypes.length === 0) return [];

    // Sort selected types by the preferred order
    const sorted = [...selectedTypes].sort(
      (a, b) => CONTENT_TYPE_ORDER.indexOf(a) - CONTENT_TYPE_ORDER.indexOf(b)
    );

    // Pick the first N available time slots (skip 12:00 for non-lunch types)
    const availableSlots = TIME_SLOTS.filter((_, i) => i < dailyCount * 3); // give some buffer
    const result: { time: string; content_type: ContentType; label: string; emoji: string }[] = [];

    for (let i = 0; i < Math.min(dailyCount, sorted.length); i++) {
      const type = sorted[i % sorted.length];
      const timeSlot = TIME_SLOTS[i] ?? { time: `${8 + i}:00`.padStart(5, "0"), label: "" };
      result.push({
        time: timeSlot.time,
        content_type: type,
        label: getLabel(type),
        emoji: getEmoji(type),
      });
    }

    return result;
  }, [dailyCount, selectedTypes]);

  if (selectedTypes.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-app-text-muted">
        콘텐츠 타입을 선택하면 시간대가 자동 배치됩니다
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {slots.map((slot, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
            "border-app-border bg-app-bg/50"
          )}
        >
          {/* Time */}
          <div className="flex shrink-0 flex-col items-center">
            <span className="text-xs font-bold text-app-text tabular-nums">{slot.time}</span>
          </div>

          {/* Timeline dot + line */}
          <div className="flex shrink-0 flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-app-primary/60" />
            {i < slots.length - 1 && <div className="mt-0.5 h-4 w-px bg-app-border" />}
          </div>

          {/* Content type info */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-base leading-none">{slot.emoji}</span>
            <span className="text-xs font-medium text-app-text">{slot.label}</span>
          </div>

          {/* Badge */}
          <span className="shrink-0 rounded-full bg-app-primary/10 px-2 py-0.5 text-[10px] font-medium text-app-primary">
            자동 배치
          </span>
        </div>
      ))}

      <p className="pt-1 text-[10px] text-app-text-muted text-center">
        하루 {dailyCount}개 · {slots.length}개 시간대 자동 배치됨
      </p>
    </div>
  );
}