"use client";

import { useCallback } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import { useToastStore } from "@/components/ui/GlobalToast";

export function useBroadcastToast() {
  const add = useToastStore(s => s.add);
  const sent = useCallback((count: number, success: number, failed: number) => {
    if (failed === 0) add({ type: "success", title: `${count}건 발송 완료`, message: `전체 성공 (${success}건)` });
    else if (success === 0) add({ type: "error", title: "발송 실패", message: `${failed}건 모두 실패` });
    else add({ type: "warning", title: `${count}건 발송 완료`, message: `${success}건 성공, ${failed}건 실패` });
  }, [add]);
  return { sent };
}
