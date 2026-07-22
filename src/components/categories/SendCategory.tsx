"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Send, Clock, History, Zap } from "lucide-react";
import { useCategoryStore } from "@/store/useCategoryStore";
import { cn } from "@/lib/cn";

const SendTab = dynamic(
  () => import("@/components/workspace/tabs/SendTab").then((m) => ({ default: m.SendTab })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-app-border" />
        <div className="h-96 animate-pulse rounded-xl bg-app-border" />
      </div>
    ),
  },
);

export function SendCategory({ panel }: { panel: "left" | "center" | "right" }) {
  if (panel !== "center") return null;

  return (
    <div className="flex h-full flex-col">
      {/* Quick action bar */}
      <div className="flex items-center gap-2 border-b border-app-border bg-app-surface px-4 py-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-app-primary/10 px-3 py-1.5 text-xs font-medium text-app-primary hover:bg-app-primary/20 transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          빠른 발송
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text hover:bg-app-card transition-colors"
        >
          <Clock className="h-3.5 w-3.5" />
          예약 발송
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text hover:bg-app-card transition-colors"
        >
          <History className="h-3.5 w-3.5" />
          발송 이력
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-app-text-subtle">
          <Send className="h-3 w-3 inline mr-1" />
          발송
        </span>
      </div>
      {/* Main content — existing SendTab */}
      <div className="flex-1 overflow-y-auto">
        <SendTab />
      </div>
    </div>
  );
}
