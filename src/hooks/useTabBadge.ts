import { useCallback } from "react";
import type { Account } from "@/types/account";

export function useTabBadge(accounts: Account[]) {
  // 수정: AccountStatus에 존재하는 실제 값들만 사용
  const errorCount = useCallback(() => 
    accounts.filter(a => a.status === "banned" || a.status === "suspended").length, 
    [accounts]
  );
  
  const queueCount = useCallback(() => 
    accounts.filter(a => a.status === "pending" || a.status === "connecting").length, 
    [accounts]
  );

  return { errorCount: errorCount(), queueCount: queueCount() };
}