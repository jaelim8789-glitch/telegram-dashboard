"use client";

import { useCallback, useMemo, useRef } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

const SWIPE_THRESHOLD = 50;

export function useAccountSwipe() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const selectAccount = useDashboardStore((s) => s.selectAccount);

  const currentIndex = useMemo(() => {
    if (!selectedAccountId || accounts.length === 0) return -1;
    return accounts.findIndex((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const goNext = useCallback(() => {
    if (accounts.length === 0) return;
    const next = (currentIndex + 1) % accounts.length;
    selectAccount(accounts[next].id);
  }, [accounts, currentIndex, selectAccount]);

  const goPrev = useCallback(() => {
    if (accounts.length === 0) return;
    const prev = (currentIndex - 1 + accounts.length) % accounts.length;
    selectAccount(accounts[prev].id);
  }, [accounts, currentIndex, selectAccount]);

  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
      if (Math.abs(dx) > SWIPE_THRESHOLD && dy < Math.abs(dx)) {
        if (dx > 0) goPrev();
        else goNext();
      }
    },
    [goNext, goPrev]
  );

  return {
    accounts,
    currentIndex,
    goNext,
    goPrev,
    swipeHandlers: { onTouchStart, onTouchEnd },
  };
}
