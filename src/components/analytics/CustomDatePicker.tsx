"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomDatePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CustomDatePicker({ startDate, endDate, onChange, onClose }: CustomDatePickerProps) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(startDate));
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [tempStart, setTempStart] = useState<Date>(startDate);
  const [tempEnd, setTempEnd] = useState<Date>(endDate);

  const monthStart = startOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function handleDayClick(day: Date) {
    if (selecting === "start") {
      setTempStart(day);
      setTempEnd(day);
      setSelecting("end");
    } else {
      if (day < tempStart) {
        setTempStart(day);
        setTempEnd(tempStart);
      } else {
        setTempEnd(day);
      }
      setSelecting("start");
    }
  }

  function apply() {
    if (tempStart > tempEnd) {
      onChange(tempEnd, tempStart);
    } else {
      onChange(tempStart, tempEnd);
    }
    onClose();
  }

  const inRange = (day: Date) => isWithinInterval(day, { start: tempStart, end: tempEnd })
    || isWithinInterval(day, { start: tempEnd, end: tempStart });

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-app-border bg-app-card p-4 shadow-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 rounded hover:bg-app-card-hover transition-all hover:scale-[1.05] active:scale-[0.95]">
          <ChevronLeft className="h-4 w-4 text-app-text-muted" />
        </button>
        <span className="text-sm font-medium text-app-text">{format(viewMonth, "yyyy년 M월")}</span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 rounded hover:bg-app-card-hover transition-all hover:scale-[1.05] active:scale-[0.95]">
          <ChevronRight className="h-4 w-4 text-app-text-muted" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-app-text-muted py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = isSameDay(day, tempStart) || isSameDay(day, tempEnd);
          const isStart = isSameDay(day, tempStart);
          const isEnd = isSameDay(day, tempEnd);
          const isOtherMonth = !isSameMonth(day, viewMonth);
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`text-center text-sm py-1.5 rounded transition-all hover:scale-[1.05] active:scale-[0.95] ${
                isSelected
                  ? "bg-violet-500 text-white"
                  : inRange(day)
                  ? "bg-violet-500/15 text-violet-300"
                  : isOtherMonth
                  ? "text-app-text-muted/30"
                  : "text-app-text-muted hover:bg-app-card-hover"
              } ${isStart ? "rounded-r-none" : ""} ${isEnd ? "rounded-l-none" : ""}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border">
        <div className="text-xs text-app-text-muted">
          {format(tempStart, "yyyy.MM.dd")} - {format(tempEnd, "yyyy.MM.dd")}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-all hover:scale-[1.02] active:scale-[0.98]">
            취소
          </button>
          <button onClick={apply} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
            적용
          </button>
        </div>
      </div>
    </motion.div>
  );
}
