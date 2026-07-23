"use client";

import { useState, useCallback, useEffect } from "react";
import { create } from "zustand";

interface ConnectionTestState { testing: boolean; lastResult: { latency: number; status: string } | null; run: () => Promise<void>; }

export const useConnectionTest = create<ConnectionTestState>((set) => ({
  testing: false, lastResult: null,
  run: async () => {
    set({ testing: true });
    const start = Date.now();
    try {
      const res = await fetch("/api/health", { method: "HEAD" });
      set({ lastResult: { latency: Date.now() - start, status: res.ok ? "ok" : "error" }, testing: false });
    } catch {
      set({ lastResult: { latency: Date.now() - start, status: "timeout" }, testing: false });
    }
  },
}));

export function ConnectionStatusCard() {
  const { testing, lastResult, run } = useConnectionTest();
  return (
    <div className="rounded-xl border border-app-border p-4 space-y-2">
      <p className="text-xs font-semibold text-app-text">서버 연결 상태</p>
      {lastResult && (
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${lastResult.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-xs text-app-text-muted">{lastResult.latency}ms</span>
        </div>
      )}
      <button onClick={run} disabled={testing} className="text-xs text-app-primary font-medium hover:underline">{testing ? "테스트 중..." : "테스트 실행"}</button>
    </div>
  );
}
