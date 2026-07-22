"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { cn } from "@/lib/cn";
import { NotificationCenter } from "./NotificationCenter";

export function MobileHeaderActions() {
  const [open, setOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" aria-label="알림">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className={cn("absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white", unreadCount > 9 ? "bg-red-500" : "bg-red-400")}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
