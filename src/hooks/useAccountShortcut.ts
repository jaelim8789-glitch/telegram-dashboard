"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useAccountShortcut() {
  const setActiveAccount = useDashboardStore(s => s.setActiveAccountId);

  return { setActiveAccount };
}
