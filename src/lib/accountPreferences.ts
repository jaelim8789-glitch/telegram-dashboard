"use client";

import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "telemon-account-favorites";
const RECENT_KEY = "telemon-account-recent";
const MAX_RECENT = 10;

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
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Unhandled error in accountPreferences', e) }
}

export function useAccountFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []));

  const toggleFavorite = useCallback((accountId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId];
      writeJson(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((accountId: string) => favorites.includes(accountId), [favorites]);

  return { favorites, isFavorite, toggleFavorite };
}

export function useRecentAccounts(selectedAccountId: string | null) {
  const [recent, setRecent] = useState<string[]>(() => readJson(RECENT_KEY, []));

  useEffect(() => {
    if (!selectedAccountId) return;
    setRecent((prev) => {
      const filtered = prev.filter((id) => id !== selectedAccountId);
      const next = [selectedAccountId, ...filtered].slice(0, MAX_RECENT);
      writeJson(RECENT_KEY, next);
      return next;
    });
  }, [selectedAccountId]);

  return { recent };
}

export function useAccountSort(
  accounts: Array<{ id: string; status?: string }>,
  selectedAccountId: string | null
) {
  const { isFavorite } = useAccountFavorites();
  const { recent } = useRecentAccounts(selectedAccountId);

  const sorted = [...accounts].sort((a, b) => {
    const aFav = isFavorite(a.id) ? 0 : 1;
    const bFav = isFavorite(b.id) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;

    const aIdx = recent.indexOf(a.id);
    const bIdx = recent.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;

    const healthOrder = ["healthy", "unknown", "not_configured", "unauthorized", "rate_limited", "error", "restricted", "banned"];
    const aHealth = healthOrder.indexOf(a.status ?? "unknown");
    const bHealth = healthOrder.indexOf(b.status ?? "unknown");
    return aHealth - bHealth;
  });

  return sorted;
}
