"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, AccountHealthState } from "@/types";
import { useAccountFavorites } from "@/lib/accountLabels";

const RECENT_KEY = "telemon-account-recent";
const MAX_RECENT = 10;

interface AccountHealthItem {
  accountId: string;
  status: AccountHealthState;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* silently ignore */ }
}

export function useRecentAccounts(selectedAccountId: string | null) {
  const [recent, setRecent] = useState<string[]>(() => readJson(RECENT_KEY, []));
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId === prevIdRef.current) return;
    prevIdRef.current = selectedAccountId;
    setRecent((prev) => {
      if (prev[0] === selectedAccountId) return prev;
      const next = [selectedAccountId, ...prev.filter((id) => id !== selectedAccountId)].slice(0, MAX_RECENT);
      writeJson(RECENT_KEY, next);
      return next;
    });
  }, [selectedAccountId]);

  return { recent };
}

const HEALTH_SORT_ORDER: Record<AccountHealthState, number> = {
  healthy: 0,
  unknown: 1,
  not_configured: 2,
  unauthorized: 3,
  rate_limited: 4,
  error: 5,
  restricted: 6,
  banned: 7,
};

export function useAccountSort(
  accounts: Account[],
  healthByAccountId: Record<string, AccountHealthItem>,
  selectedAccountId: string | null,
) {
  const { isFavorite } = useAccountFavorites();
  const { recent } = useRecentAccounts(selectedAccountId);

  const sorted = useMemo(() => {
    const recents = [...recent];

    const favoritePool: Account[] = [];
    const recentPool: Account[] = [];
    const rest: Account[] = [];

    for (const acc of accounts) {
      if (isFavorite(acc.id)) {
        favoritePool.push(acc);
        continue;
      }
      if (recents.indexOf(acc.id) !== -1) {
        recentPool.push(acc);
        continue;
      }
      rest.push(acc);
    }

    favoritePool.sort((a, b) => a.id.localeCompare(b.id));

    recentPool.sort((a, b) => {
      const ai = recents.indexOf(a.id);
      const bi = recents.indexOf(b.id);
      return ai - bi;
    });

    rest.sort((a, b) => {
      const ah = healthByAccountId[a.id]?.status;
      const bh = healthByAccountId[b.id]?.status;
      const aOrder = ah ? (HEALTH_SORT_ORDER[ah] ?? 99) : 99;
      const bOrder = bh ? (HEALTH_SORT_ORDER[bh] ?? 99) : 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return [...favoritePool, ...recentPool, ...rest];
  }, [accounts, isFavorite, recent, healthByAccountId]);

  return sorted;
}
