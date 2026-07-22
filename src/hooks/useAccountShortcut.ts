"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useAccountShortcut() {
  // 수정: 존재하는 함수명 사용
  const setActiveAccount = useDashboardStore(s => s.selectAccount); // 기존: setSelectedAccount, 수정: selectAccount

  return { setActiveAccount };
}
