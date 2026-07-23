"use client";

import { useCallback, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useAccountBulkAction() {
  const accounts = useDashboardStore(s => s.accounts);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]), []);
  const selectAll = useCallback(() => setSelected(accounts.filter(a => a.status === "active").map(a => a.id)), [accounts]);
  const clear = useCallback(() => setSelected([]), []);

  return { selected, toggle, selectAll, clear, count: selected.length };
}
