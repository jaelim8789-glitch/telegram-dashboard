"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useAccountShortcut() {
  const accounts = useDashboardStore(s => s.accounts);
  const setActiveAccount = useDashboardStore(s => s.setActiveAccount);
  const selectedAccountId = useDashboardStore(s => s.selectedAccountId);

  const processInput = useCallback((text: string): string => {
    const match = text.match(/^@(\d+)$/);
    if (match) {
      const idx = parseInt(match[1]) - 1;
      const accts = accounts.filter(a => a.status === "active");
      if (accts[idx]) { setActiveAccount(accts[idx].id); return ""; }
    }
    return text;
  }, [accounts, setActiveAccount]);

  const shortcutHints = useCallback(() => {
    return accounts.filter(a => a.status === "active").map((a, i) => ({ key: `@${i + 1}`, label: a.phone }));
  }, [accounts]);

  return { processInput, shortcutHints, currentAccount: selectedAccountId };
}
