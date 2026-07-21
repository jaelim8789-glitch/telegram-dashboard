"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Clock, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAutoProfile } from "@/hooks/useAutoProfile";

const DISMISS_STORAGE_KEY = "telemon-profile-suggestion-dismiss-today";

interface ProfileSuggestionProps {
  onApply: (profileName: string) => void;
}

const TIMECONTEXT_LABELS: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  night: "야간",
};

export function ProfileSuggestion({ onApply }: ProfileSuggestionProps) {
  const { timeContext, dayType, profileName } = useAutoProfile();
  const [showChip, setShowChip] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [dismissedToday, setDismissedToday] = useState(false);

  useEffect(() => {
    try {
      const val = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (val === new Date().toISOString().slice(0, 10)) {
        setDismissedToday(true);
      }
    } catch { /* noop */ }
  }, []);

  const existingProfiles: string[] = (() => {
    try {
      const raw = localStorage.getItem("telemon-dashboard-profiles");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: any) => p.name).filter(Boolean);
    } catch {
      return [];
    }
  })();

  const shouldShow = !dismissedToday && existingProfiles.includes(profileName);

  useEffect(() => {
    if (shouldShow) {
      const t = setTimeout(() => setShowChip(true), 3000);
      return () => clearTimeout(t);
    } else {
      setShowChip(false);
    }
  }, [shouldShow]);

  const handleApply = useCallback(() => {
    onApply(profileName);
    setShowSheet(false);
    setShowChip(false);
  }, [onApply, profileName]);

  const dismissToday = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString().slice(0, 10));
    } catch { /* noop */ }
    setDismissedToday(true);
    setShowSheet(false);
    setShowChip(false);
  }, []);

  const dayTypeLabel = dayType === "weekday" ? "평일" : "주말";

  return (
    <>
      <AnimatePresence>
        {showChip && (
          <motion.button
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={() => setShowSheet(true)}
            type="button"
            className={cn(
              "mx-2 mb-1 flex items-center gap-2 rounded-xl border border-app-primary/20 bg-app-primary/5",
              "px-3 py-2 text-xs font-medium text-app-primary shadow-sm",
              "hover:bg-app-primary/10 active:scale-[0.98] transition-all",
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">{dayTypeLabel} {TIMECONTEXT_LABELS[timeContext]} — <strong>{profileName}</strong> 위젯 배치가 있습니다</span>
            <X
              className="h-3.5 w-3.5 shrink-0 text-app-text-muted hover:text-app-text"
              onClick={(e) => { e.stopPropagation(); setShowChip(false); }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <BottomSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        title={
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-app-primary" />
            프로필 추천
          </span>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-app-text-muted">
            현재 시간대({dayTypeLabel} {TIMECONTEXT_LABELS[timeContext]})에 맞는 위젯 배치 프로필이 있습니다.
          </p>

          <div className="rounded-xl border border-app-border bg-app-card-hover p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary/10 text-app-primary">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-app-text">{profileName}</p>
                  <p className="text-xs text-app-text-muted">{dayTypeLabel} {TIMECONTEXT_LABELS[timeContext]} 프로필</p>
                </div>
              </div>
              <span className="rounded-full bg-app-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-app-primary">추천</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            >
              적용
            </button>
            <button
              type="button"
              onClick={dismissToday}
              className="w-full rounded-xl border border-app-border py-2.5 text-xs font-medium text-app-text-muted hover:bg-app-card-hover transition-colors"
            >
              오늘 하루 보지 않기
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
