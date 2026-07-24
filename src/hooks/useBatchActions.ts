"use client";

import { useCallback } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";

export function useBatchActions() {
  const toast = useToastStore(s => s.add);
  const fetchAccounts = useDashboardStore(s => s.fetchAccounts);

  const batchDeleteBroadcasts = useCallback(async (ids: string[]) => {
    let success = 0;
    for (const id of ids) {
      try {
        await api.deleteBroadcasts([id]);
        success++;
      } catch (e) { console.warn('Unhandled error in useBatchActions', e) }
    }
    const failed = ids.length - success;
    if (failed > 0) {
      toast({ 
        type: "warning", 
        title: `${ids.length}ê±?ì²˜ë¦¬`, 
        message: `${success}ê±??±ê³µ, ${failed}ê±??¤íŒ¨` 
      });
    } else {
      toast({ 
        type: "success", 
        title: `${ids.length}ê±??? œ??, 
        message: `${success}ê±??±ê³µ` 
      });
    }
    fetchAccounts();
    return { success, failed };
  }, [toast, fetchAccounts]);

  const batchCancelBroadcasts = useCallback(async (ids: string[]) => {
    let success = 0;
    for (const id of ids) {
      try {
        await api.cancelBroadcasts([id]); // Use plural form with array parameter
        success++;
      } catch (e) { console.warn('Unhandled error in useBatchActions', e) }
    }
    const failed = ids.length - success;
    if (failed > 0) {
      toast({ 
        type: "warning", 
        title: `${ids.length}ê±?ì²˜ë¦¬`, 
        message: `${success}ê±??±ê³µ, ${failed}ê±??¤íŒ¨` 
      });
    } else {
      toast({ 
        type: "success", 
        title: `${ids.length}ê±?ì·¨ì†Œ??, 
        message: `${success}ê±??±ê³µ` 
      });
    }
    fetchAccounts();
    return { success, failed };
  }, [toast, fetchAccounts]);

  return { batchDeleteBroadcasts, batchCancelBroadcasts };
}
