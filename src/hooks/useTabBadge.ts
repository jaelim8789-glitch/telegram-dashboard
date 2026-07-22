import { useCallback } from "react";
import type { Account, AccountStatus } from "@/types";

export function useTabBadge(accounts: Account[]) {
  const errorCount = useCallback(() => 
    accounts.filter(a => a.status === "banned" || a.status === "suspended").length, 
    [accounts]
  );
  
  const queueCount = useCallback(() => 
    accounts.filter(a => (a.status as AccountStatus | "pending" | "connecting") === "pending" || (a.status as string) === "connecting").length, 
    [accounts]
  );

  return { errorCount: errorCount(), queueCount: queueCount() };
}