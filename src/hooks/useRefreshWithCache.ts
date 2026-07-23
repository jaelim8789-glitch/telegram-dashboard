"use client";

import { useCallback } from "react";
import * as api from "@/lib/api";
import { useDataCache } from "@/store/useDataCache";

export function useRefreshWithCache() {
  const cache = useDataCache(s => s.set);
  const set = useDataCache(s => s.set);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      api.fetchAccounts(),
      api.fetchSchedulerStatus?.() || Promise.resolve(null),
    ]);
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        set(i === 0 ? "accounts" : "scheduler", r.value);
      }
    });
    return results;
  }, [set]);

  return { refresh };
}
