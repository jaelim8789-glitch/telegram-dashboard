"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";

interface WeeklySummary { weekStart: string; totalSent: number; successRate: number; topAccount: string; failedCount: number; }
interface SummaryStore { summary: WeeklySummary | null; dismissed: boolean; fetch: () => Promise<void>; dismiss: () => void; }

const DISMISS_KEY = "telemon-weekly-summary-dismissed";

function getWeekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10);
}

export const useWeeklySummary = create<SummaryStore>((set) => ({
  summary: null,
  dismissed: false,
  fetch: async () => {
    try {
      const res = await fetch("/api/analytics/weekly");
      const data = await res.json();
      set({ summary: data });
    } catch (e) { console.warn('Unhandled error in WeeklySummaryCard', e) }
  },
  dismiss: () => {
    set({ dismissed: true });
    try { localStorage.setItem(DISMISS_KEY, getWeekStart()); } catch (e) { console.warn('Unhandled error in WeeklySummaryCard', e) }
  },
}));

export function WeeklySummaryCard() {
  const summary = useWeeklySummary(s => s.summary);
  const dismissed = useWeeklySummary(s => s.dismissed);
  const fetch = useWeeklySummary(s => s.fetch);
  const dismiss = useWeeklySummary(s => s.dismiss);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === getWeekStart()) {
      useWeeklySummary.setState({ dismissed: true });
    }
  }, []);

  useEffect(() => { if (!dismissed) fetch(); }, [dismissed, fetch]);

  if (!summary || dismissed) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-app-primary/20 to-app-primary/5 p-4 border border-app-primary/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-app-text">?“Š ?´ë²ˆì£??”ì•½</p>
        <button onClick={dismiss} className="text-[10px] text-app-text-muted hover:text-app-text">?«ê¸°</button>
      </div>
      <div className="flex items-center justify-between">
        <div><span className="text-lg font-bold text-app-text">{summary.totalSent.toLocaleString()}</span><span className="text-xs text-app-text-muted ml-1">ê±?ë°œì†¡</span></div>
        <div className="text-right"><span className="text-sm font-semibold text-emerald-500">{summary.successRate}%</span><span className="text-xs text-app-text-muted ml-1">?±ê³µë¥?/span></div>
      </div>
    </div>
  );
}
