"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type BookmarkType = "account" | "broadcast" | "log" | "message";

interface Bookmark { id: string; type: BookmarkType; label: string; sublabel?: string; createdAt: number; }

interface BookmarkStore { bookmarks: Bookmark[]; add: (b: Omit<Bookmark, "createdAt">) => void; remove: (id: string) => void; has: (id: string) => boolean; }

export const useBookmarkStore = create<BookmarkStore>()(persist(
  (set, get) => ({
    bookmarks: [],
    add: (b) => set(s => ({ bookmarks: [{ ...b, createdAt: Date.now() }, ...s.bookmarks].slice(0, 50) })),
    remove: (id) => set(s => ({ bookmarks: s.bookmarks.filter(x => x.id !== id) })),
    has: (id) => get().bookmarks.some(x => x.id === id),
  }),
  { name: "telemon-bookmarks" }
));
