import { useMemo } from "react";
import type { Account } from "@/types/account";

export function useAccountFilter(accounts: Account[]) {
  const statusCounts = useMemo(() => {
    // 수정: AccountStatus에 존재하는 실제 값들만 사용
    const all = accounts.length;
    const active = accounts.filter(a => a.status === "active").length;
    // 기존 "error" 대신 실제 enum 값인 "banned", "suspended", "inactive" 등을 사용
    const error = accounts.filter(a => a.status === "banned" || a.status === "suspended").length;
    const other = accounts.filter(a => a.status !== "active" && a.status !== "banned" && a.status !== "suspended").length;
    
    return { all, active, error, other };
  }, [accounts]);

  return { statusCounts };
}