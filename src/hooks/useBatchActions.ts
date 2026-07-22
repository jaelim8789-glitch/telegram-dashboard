import { useCallback } from "react";
import * as api from "@/lib/api";

export function useBatchActions() {
  const batchDeleteBroadcasts = useCallback(async (ids: string[]) => {
    let success = 0;
    for (const id of ids) {
      try {
        // 수정: 함수명을 실제 존재하는 함수명으로 변경
        await api.deleteBroadcasts([id]); // 기존: deleteBroadcast, 수정: deleteBroadcasts
        success++;
      } catch {}
    }
    return { success, failed: ids.length - success };
  }, []);

  const batchCancelBroadcasts = useCallback(async (ids: string[]) => {
    let success = 0;
    for (const id of ids) {
      try {
        // 수정: 함수명을 실제 존재하는 함수명으로 변경
        await api.cancelBroadcasts([id]); // 기존: cancelBroadcast, 수정: cancelBroadcasts
        success++;
      } catch {}
    }
    return { success, failed: ids.length - success };
  }, []);

  return { batchDeleteBroadcasts, batchCancelBroadcasts };
}