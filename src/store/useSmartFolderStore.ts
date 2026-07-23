"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SmartFolder { id: string; name: string; filter: { type?: string; status?: string; accountId?: string }; icon?: string; }

interface SmartFolderStore { folders: SmartFolder[]; add: (f: SmartFolder) => void; remove: (id: string) => void; }

export const useSmartFolderStore = create<SmartFolderStore>()(persist(
  (set) => ({ folders: [], add: (f) => set(s => ({ folders: [...s.folders, f] })), remove: (id) => set(s => ({ folders: s.folders.filter(x => x.id !== id) })) }),
  { name: "telemon-smart-folders" }
));
