"use client";

import { useState } from "react";
import { useAutoProfile } from "@/hooks/useAutoProfile";

interface ProfileSuggestionProps {
  onApply?: (profileName: string) => void;
}

export default function ProfileSuggestion({ onApply }: ProfileSuggestionProps) {
  const { timeContext } = useAutoProfile();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedToday, setDismissedToday] = useState(false);

  if (dismissed || dismissedToday) return null;

  const labelByTime: Record<string, string> = {
    morning: "아침",
    afternoon: "오후",
    evening: "저녁",
    night: "야간",
  };

  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="text-xl">⏰</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          {labelByTime[timeContext] ?? "현재"} 시간대에 맞는 위젯 배치가 있습니다
        </p>
      </div>
      <button
        onClick={() => {
          onApply?.(timeContext);
          setDismissed(true);
        }}
        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-500"
      >
        적용
      </button>
      <button
        onClick={() => setDismissedToday(true)}
        className="text-xs text-amber-600 underline hover:text-amber-800"
      >
        오늘 보지 않기
      </button>
    </div>
  );
}
