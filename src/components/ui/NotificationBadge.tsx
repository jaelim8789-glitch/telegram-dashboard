"use client";

import { useState, useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { useNotificationPrefs } from "@/store/useNotificationPrefs";

export function NotificationBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button onClick={onClick} className="relative flex h-7 w-7 items-center justify-center rounded-full bg-app-primary/10 active:scale-90" aria-label="알림">
      <Bell className="h-4 w-4 text-app-primary" />
      <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
}
