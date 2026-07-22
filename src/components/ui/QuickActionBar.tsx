"use client";

import { memo } from "react";
import { Send, MessageCircle, Settings, Zap } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import { cn } from "@/lib/cn";

interface QuickActionBarProps {
  onSendMessage?: () => void;
  onQuickReply?: () => void;
  onAutoReplyToggle?: () => void;
  onSettings?: () => void;
  className?: string;
}

const QuickActionBar = memo(function QuickActionBar({
  onSendMessage,
  onQuickReply,
  onAutoReplyToggle,
  onSettings,
  className
}: QuickActionBarProps) {
  const handleAction = async (callback?: () => void) => {
    try {
      await hapticFeedback.impactOccurred("light");
    } catch {}
    
    if (callback) callback();
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-1 pt-1.5",
      "pb-[calc(env(safe-area-inset-bottom)+4px)]",
      "bg-[var(--tg-theme-bg-color,#17212b)] border-[var(--tg-theme-section-separator-color,#3a4a5a)]",
      className
    )}>
      <button
        onClick={() => handleAction(onSendMessage)}
        className="flex flex-col items-center gap-0.5 p-3 min-w-[64px] transition-all active:scale-90"
        style={{ color: "var(--tg-theme-hint-color, #708499)" }}
        aria-label="메시지 보내기"
      >
        <div className="flex items-center justify-center h-6 w-6">
          <Send className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-medium opacity-60">보내기</span>
      </button>
      
      <button
        onClick={() => handleAction(onQuickReply)}
        className="flex flex-col items-center gap-0.5 p-3 min-w-[64px] transition-all active:scale-90"
        style={{ color: "var(--tg-theme-hint-color, #708499)" }}
        aria-label="빠른 답장"
      >
        <div className="flex items-center justify-center h-6 w-6">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-medium opacity-60">답장</span>
      </button>
      
      <button
        onClick={() => handleAction(onAutoReplyToggle)}
        className="flex flex-col items-center gap-0.5 p-3 min-w-[64px] transition-all active:scale-90"
        style={{ color: "var(--tg-theme-hint-color, #708499)" }}
        aria-label="자동 응답 전환"
      >
        <div className="flex items-center justify-center h-6 w-6">
          <Zap className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-medium opacity-60">자동</span>
      </button>
      
      <button
        onClick={() => handleAction(onSettings)}
        className="flex flex-col items-center gap-0.5 p-3 min-w-[64px] transition-all active:scale-90"
        style={{ color: "var(--tg-theme-hint-color, #708499)" }}
        aria-label="설정"
      >
        <div className="flex items-center justify-center h-6 w-6">
          <Settings className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-medium opacity-60">설정</span>
      </button>
    </div>
  );
});

export { QuickActionBar };