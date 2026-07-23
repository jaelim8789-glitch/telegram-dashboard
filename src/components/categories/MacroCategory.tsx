"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Plus, Workflow, Code, MessageSquare } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

const ReplyMacroTab = dynamic(
  () => import("@/components/workspace/tabs/ReplyMacroTab").then((m) => ({ default: m.ReplyMacroTab })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-app-border" />
        <div className="h-64 animate-pulse rounded-xl bg-app-border" />
      </div>
    ),
  },
);

type MacroView = "list" | "editor" | "flow";

const MACRO_ITEMS = [
  { id: "auto-reply", label: "자동 응답", icon: MessageSquare, description: "조건 기반 자동 답장" },
  { id: "action-chain", label: "액션 체인", icon: Workflow, description: "연속 동작 실행" },
  { id: "custom-script", label: "커스텀 스크립트", icon: Code, description: "JavaScript 기반 매크로" },
];

export function MacroCategory({ panel }: { panel: "left" | "center" | "right" }) {
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);

  if (panel === "left") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h2 className="text-sm font-semibold text-app-text">매크로</h2>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-app-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            새 매크로
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {MACRO_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedMacro === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMacro(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-text-muted hover:text-app-text hover:bg-app-card",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-app-text-subtle truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  if (panel === "center") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-app-border bg-app-surface px-4 py-2">
          <h3 className="text-xs font-medium text-app-text-muted">
            {selectedMacro
              ? MACRO_ITEMS.find((m) => m.id === selectedMacro)?.label ?? "매크로 편집기"
              : "매크로 편집기"}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedMacro ? (
            <div className="p-4">
              <ReplyMacroTab />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Workflow className="mx-auto h-10 w-10 text-app-text-subtle mb-2" />
                <p className="text-sm text-app-text-muted">왼쪽에서 매크로를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
