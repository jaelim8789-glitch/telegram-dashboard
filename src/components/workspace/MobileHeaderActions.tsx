"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { cn } from "@/lib/cn";
import { NotificationCenter } from "./NotificationCenter";
import { OneTouchStateToggle } from "@/components/ui/OneTouchStateToggle"; // 상태 토글 컴포넌트 추가

export function MobileHeaderActions() {
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // 상태 토글을 위한 상태들
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // 상태 아이템 정의
  const stateItems = [
    {
      id: 'autoreply',
      name: '자동 응답',
      icon: Bell,
      enabled: autoReplyEnabled,
      onToggle: () => setAutoReplyEnabled(!autoReplyEnabled),
      color: 'text-green-500',
      bgColor: 'bg-green-500/20'
    },
    {
      id: 'dnd',
      name: '방해금지',
      icon: Bell,
      enabled: doNotDisturb,
      onToggle: () => setDoNotDisturb(!doNotDisturb),
      color: 'text-red-500',
      bgColor: 'bg-red-500/20'
    },
    {
      id: 'focus',
      name: '집중모드',
      icon: Bell,
      enabled: focusMode,
      onToggle: () => setFocusMode(!focusMode),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    }
  ];

  return (
    <>
      <div className="flex items-center gap-1">
        {/* 상태 토글 추가 */}
        <OneTouchStateToggle states={stateItems} />
        
        <button 
          type="button" 
          onClick={() => setNotificationOpen(true)} 
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" 
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white",
              unreadCount > 9 ? "bg-red-500" : "bg-red-400"
            )}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
      
      <NotificationCenter open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </>
  );
}