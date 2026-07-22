"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/components/ui/GlobalToast";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";

export function useBatchActions() {
  const toast = useToastStore(s => s.add);
  const fetchAccounts = useDashboardStore(s => s.fetchAccounts);

  const batchRetry = useCallback(async (ids: string[]) => {
    let success = 0, failed = 0;
    for (const id of ids) { try { await api.retryBroadcast(id); success++; } catch { failed++; } }
    toast({ type: failed === 0 ? "success" : "warning", title: `${ids.length}건 처리`, message: `${success}건 성공, ${failed}건 실패` });
    fetchAccounts();
  }, [toast, fetchAccounts]);

  const batchCancel = useCallback(async (ids: string[]) => {
    let success = 0;
    for (const id of ids) {
      try {
        await api.cancelBroadcasts(id); // 함수명 수정
        success++;
      } catch {}
    }
    const failed = ids.length - success;
    toast({ type: failed === 0 ? "success" : "warning", title: `${ids.length}건 처리`, message: `${success}건 성공, ${failed}건 실패` });
    fetchAccounts();
    return { success, failed };
  }, [toast, fetchAccounts]);

  return { batchRetry, batchCancel };
}
