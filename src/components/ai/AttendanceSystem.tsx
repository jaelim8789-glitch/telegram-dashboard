"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, Gift, Star, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getAttendanceData(): { lastDate: string; streak: number; total: number; checked: string[] } {
  if (typeof window === "undefined") return { lastDate: "", streak: 0, total: 0, checked: [] };
  try {
    const raw = localStorage.getItem("pixel_attendance");
    return raw ? JSON.parse(raw) : { lastDate: "", streak: 0, total: 0, checked: [] };
  } catch {
    return { lastDate: "", streak: 0, total: 0, checked: [] };
  }
}

function saveAttendance(data: { lastDate: string; streak: number; total: number; checked: string[] }) {
  localStorage.setItem("pixel_attendance", JSON.stringify(data));
}

const DAILY_REWARDS: Record<number, { label: string; icon: string }> = {
  1: { label: "경험치 50", icon: "⚡" },
  3: { label: "스킨: 별똥별 효과", icon: "🌠" },
  5: { label: "경험치 200", icon: "🔥" },
  7: { label: "VIP 모자 '왕관'", icon: "👑" },
  14: { label: "스킨: 무지개 사무실", icon: "🌈" },
  30: { label: "🏆 전설 직원 칭호", icon: "🏆" },
};

export function AttendanceSystem() {
  const [data, setData] = useState(getAttendanceData);
  const [justChecked, setJustChecked] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = new Date().getDay();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - todayDay);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const alreadyChecked = data.checked.includes(today);
  const reward = DAILY_REWARDS[data.streak];

  const handleCheckin = () => {
    if (alreadyChecked) return;
    const newChecked = [...data.checked, today];
    const prevDate = data.lastDate;
    const prev = new Date(prevDate);
    const now = new Date(today);
    const diffDays = Math.floor((now.getTime() - prev.getTime()) / 86400000);
    const newStreak = diffDays === 1 ? data.streak + 1 : 1;
    const newData = { lastDate: today, streak: newStreak, total: data.total + 1, checked: newChecked };
    saveAttendance(newData);
    setData(newData);
    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-app-border bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-app-primary" />
          <span className="text-xs font-semibold text-app-text">출석 체크</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-orange-400" />
          <span className="text-xs font-bold text-orange-400">{data.streak}일 연속</span>
          <span className="text-[9px] text-app-text-muted ml-1">총 {data.total}일</span>
        </div>
      </div>

      {/* Week calendar */}
      <div className="flex items-center gap-1 mb-2">
        {weekDays.map((day, i) => {
          const checked = data.checked.includes(day);
          const isToday = day === today;
          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-0.5">
              <span className="text-[8px] text-app-text-muted">{DAYS[(todayDay - 6 + i + 7) % 7]}</span>
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all",
                checked ? "bg-green-500 text-white" : isToday ? "border border-dashed border-app-primary text-app-text" : "text-app-text-muted bg-app-card-hover"
              )}>
                {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : new Date(day).getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Check-in button */}
      <button
        onClick={handleCheckin}
        disabled={alreadyChecked}
        className={cn(
          "w-full rounded-xl py-2 text-xs font-bold transition-all",
          alreadyChecked
            ? "bg-green-500/20 text-green-400 cursor-default"
            : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-95"
        )}
      >
        {alreadyChecked ? "✅ 오늘 출석 완료!" : "🎯 오늘 출석하기"}
      </button>

      {/* Reward info */}
      {reward && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-yellow-500/10 px-2 py-1.5">
          <Gift className="h-3 w-3 text-yellow-400" />
          <span className="text-[9px] text-yellow-400 font-medium">
            {data.streak}일 달성 보상: {reward.icon} {reward.label}
          </span>
        </div>
      )}

      {justChecked && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-lg bg-green-500/20 px-2 py-1.5 text-center">
          <p className="text-[10px] text-green-400 font-semibold">
            🎉 출석 완료! {data.streak}일 연속 달성!{reward && ` "${reward.label}" 보상 획득!`}
          </p>
        </motion.div>
      )}
    </div>
  );
}
