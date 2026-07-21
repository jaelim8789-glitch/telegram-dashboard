"use client";

import { useState, useCallback } from "react";

/**
 * Frequently used group combinations (13)
 */
const STORAGE_KEY = "telemon-group-combos";

export interface GroupCombo {
  id: string;
  name: string;
  groupIds: string[];
  createdAt: number;
}

export function useGroupCombos() {
  const [combos, setCombos] = useState<GroupCombo[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });

  const saveCombo = useCallback((name: string, groupIds: string[]) => {
    const combo: GroupCombo = {
      id: Date.now().toString(), name, groupIds, createdAt: Date.now(),
    };
    const updated = [combo, ...combos].slice(0, 20);
    setCombos(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, [combos]);

  const deleteCombo = useCallback((id: string) => {
    const updated = combos.filter((c) => c.id !== id);
    setCombos(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, [combos]);

  return { combos, saveCombo, deleteCombo };
}
