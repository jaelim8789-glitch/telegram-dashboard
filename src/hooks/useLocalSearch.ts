"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SearchIndex { accounts: { id: string; phone: string; status: string }[]; groups: { id: string; title: string }[]; broadcasts: { id: string; message: string; status: string }[]; }

export function useLocalSearch() {
  const [index, setIndex] = useState<SearchIndex>({ accounts: [], groups: [], broadcasts: [] });
  const loaded = useRef(false);

  const loadIndex = useCallback(async () => {
    if (loaded.current) return;
    try {
      const [acc, grp, brd] = await Promise.all([
        import("@/lib/api").then(m => m.fetchAccounts()).catch(() => []),
        import("@/lib/api").then(m => m.fetchGroups?.("")?.catch(() => []) || Promise.resolve([])),
        import("@/lib/api").then(m => m.fetchRecentBroadcasts?.()?.catch(() => []) || Promise.resolve([])),
      ]);
      setIndex({ accounts: acc || [], groups: grp || [], broadcasts: brd || [] });
      loaded.current = true;
    } catch {}
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < 2) return { accounts: [], groups: [], broadcasts: [] };
    const lower = q.toLowerCase();
    return {
      accounts: index.accounts.filter(a => a.phone.includes(lower) || a.status.includes(lower)),
      groups: index.groups.filter(g => g.title.toLowerCase().includes(lower)),
      broadcasts: index.broadcasts.filter(b => b.message.toLowerCase().includes(lower)),
    };
  }, [index]);

  return { loadIndex, search, loaded: loaded.current };
}
