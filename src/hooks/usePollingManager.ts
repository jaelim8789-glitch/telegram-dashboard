"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToastStore } from "@/components/ui/GlobalToast";

export function usePollingManager(intervalMs = 30000) {
  const fetchAccounts = useDashboardStore(s => s.fetchAccounts);
  const toast = useToastStore(s => s.add);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const failCount = useRef(0);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        await fetchAccounts();
        failCount.current = 0;
      } catch {
        failCount.current++;
        if (failCount.current >= 3) {
          toast({ type: "warning", title: "데이터 갱신 실패", message: "네트워크를 확인해주세요" });
          failCount.current = 0;
        }
      }
    }, intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchAccounts, intervalMs, toast]);
}
