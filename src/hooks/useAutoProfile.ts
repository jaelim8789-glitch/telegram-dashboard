"use client";

import { useMemo } from "react";

export type TimeContext = "morning" | "afternoon" | "evening" | "night";
export type DayType = "weekday" | "weekend";

const PROFILE_MAP: Record<DayType, Record<TimeContext, string>> = {
  weekday: {
    morning: "업무 시작",
    afternoon: "업무 집중",
    evening: "마무리",
    night: "간편",
  },
  weekend: {
    morning: "여유",
    afternoon: "활동",
    evening: "휴식",
    night: "간편",
  },
};

function getTimeContext(): TimeContext {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

function getDayType(): DayType {
  const d = new Date().getDay();
  return d === 0 || d === 6 ? "weekend" : "weekday";
}

export function useAutoProfile() {
  return useMemo(() => {
    const timeContext = getTimeContext();
    const dayType = getDayType();
    const profileName = PROFILE_MAP[dayType][timeContext];
    return { timeContext, dayType, profileName };
  }, []);
}
