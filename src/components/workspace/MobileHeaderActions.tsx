"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNotificationStore } from "@/store/useNotificationStore";
import { NotificationCenter } from "@/components/workspace/NotificationCenter";

export function MobileHeaderActions() {
  const [open, setOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
