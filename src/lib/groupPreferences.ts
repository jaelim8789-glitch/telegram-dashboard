"use client";

import { useCallback, useState } from "react";

/** All group preference data (favorites/recent/tags) lives only in this browser's
 * localStorage — the backend has no concept of them, and adding one would mean touching
 * the DB schema, which is out of scope for this UI-only redesign. That means these
 * preferences don't sync across devices or browser profiles, and are lost if the user
 * clears site data. */

const FAVORITES_KEY = "group-favorites";
const RECENT_KEY = "group-recent";
const TAGS_KEY = "group-tags";
const MAX_RECENT = 8;

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

export function useFavoriteGroups() {
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []));

  const toggleFavorite = useCallback((groupId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId];
      writeJson(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((groupId: string) => favorites.includes(groupId), [favorites]);

  return { favorites, isFavorite, toggleFavorite };
}

export function useRecentGroups() {
  const [recent, setRecent] = useState<string[]>(() => readJson(RECENT_KEY, []));

  const markUsed = useCallback((groupIds: string[]) => {
    setRecent((prev) => {
      const next = [...groupIds, ...prev.filter((id) => !groupIds.includes(id))].slice(0, MAX_RECENT);
      writeJson(RECENT_KEY, next);
      return next;
    });
  }, []);

  return { recent, markUsed };
}

export function useGroupTags() {
  const [tagsByGroup, setTagsByGroup] = useState<Record<string, string[]>>(() => readJson(TAGS_KEY, {}));

  const addTag = useCallback((groupId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setTagsByGroup((prev) => {
      const existing = prev[groupId] ?? [];
      if (existing.includes(trimmed)) return prev;
      const next = { ...prev, [groupId]: [...existing, trimmed] };
      writeJson(TAGS_KEY, next);
      return next;
    });
  }, []);

  const removeTag = useCallback((groupId: string, tag: string) => {
    setTagsByGroup((prev) => {
      const next = { ...prev, [groupId]: (prev[groupId] ?? []).filter((t) => t !== tag) };
      writeJson(TAGS_KEY, next);
      return next;
    });
  }, []);

  const allTags = Array.from(new Set(Object.values(tagsByGroup).flat())).sort();

  return { tagsByGroup, addTag, removeTag, allTags };
}
