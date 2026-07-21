"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Undo Manager — 발송 후 N초 내 취소 가능한 토스트 표시
 */
export function useUndoBroadcast() {
  const { toast } = useToast();
  const undoHandlers = useRef<Map<string, () => void>>(new Map());

  return {
    showUndo: (broadcastId: string, label: string, onUndo: () => void) => {
      undoHandlers.current.set(broadcastId, onUndo);
      toast("success", `✅ "${label.slice(0, 30)}" 발송됨`, {
        description: (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => {
                const handler = undoHandlers.current.get(broadcastId);
                if (handler) { handler(); undoHandlers.current.delete(broadcastId); }
              }}
              className="rounded-lg bg-app-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              실행 취소
            </button>
            <span className="text-[10px] text-app-text-muted">5초 후 자동 처리됩니다</span>
          </div>
        ),
        duration: 5000,
      });
      setTimeout(() => undoHandlers.current.delete(broadcastId), 6000);
    },
  };
}
