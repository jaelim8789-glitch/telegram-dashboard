"use client";

import { create } from "zustand";

interface DataCache { [key: string]: { data: unknown; timestamp: number; }; }
interface CacheStore { cache: DataCache; set: (key: string, data: unknown) => void; get: (key: string) => unknown | null; isStale: (key: string, ttlMs?: number) => boolean; clear: () => void; }

export const useDataCache = create<CacheStore>((set, get) => ({
  cache: {},
  set: (key, data) => set(s => ({ cache: { ...s.cache, [key]: { data, timestamp: Date.now() } } })),
  get: (key) => { const c = get().cache[key]; return c ? c.data : null; },
  isStale: (key, ttlMs = 300000) => { const c = get().cache[key]; return !c || Date.now() - c.timestamp > ttlMs; },
  clear: () => set({ cache: {} }),
}));

export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttlMs = 300000): Promise<T> {
  const store = useDataCache.getState();
  if (!store.isStale(key, ttlMs)) return store.get(key) as T;
  try { const fresh = await fetcher(); store.set(key, fresh); return fresh; }
  catch { const cached = store.get(key); if (cached) return cached as T; throw new Error("no data"); }
}
