"use client";

import { useCallback, useState } from "react";

/**
 * Account-level favorites and tags stored in localStorage only.
 * Follows the same pattern as groupPreferences.ts — no backend changes.
 */

const ACCOUNT_FAVORITES_KEY = "account-favorites";
const ACCOUNT_TAGS_KEY = "account-tags";

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
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useAccountFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readJson(ACCOUNT_FAVORITES_KEY, []));

  const toggleFavorite = useCallback((accountId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId];
      writeJson(ACCOUNT_FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((accountId: string) => favorites.includes(accountId), [favorites]);

  return { favorites, isFavorite, toggleFavorite };
}

export function useAccountTags() {
  const [tagsByAccount, setTagsByAccount] = useState<Record<string, string[]>>(() => readJson(ACCOUNT_TAGS_KEY, {}));

  const addTag = useCallback((accountId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setTagsByAccount((prev) => {
      const existing = prev[accountId] ?? [];
      if (existing.includes(trimmed)) return prev;
      const next = { ...prev, [accountId]: [...existing, trimmed] };
      writeJson(ACCOUNT_TAGS_KEY, next);
      return next;
    });
  }, []);

  const removeTag = useCallback((accountId: string, tag: string) => {
    setTagsByAccount((prev) => {
      const next = { ...prev, [accountId]: (prev[accountId] ?? []).filter((t) => t !== tag) };
      writeJson(ACCOUNT_TAGS_KEY, next);
      return next;
    });
  }, []);

  const allTags = Array.from(new Set(Object.values(tagsByAccount).flat())).sort();

  return { tagsByAccount, addTag, removeTag, allTags };
}