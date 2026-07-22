"use client";

import { Panel } from "@/components/ui/Panel";

export function NicegramCategory({ panel }: { panel: "left" | "center" | "right" }) {
  if (panel === "center") {
    return (
      <div className="flex h-full flex-col">
        <Panel className="flex-1 m-4">
          <div className="flex h-full items-center justify-center text-app-text-muted text-sm">
            나이스그램 채팅이 여기에 표시됩니다.
          </div>
        </Panel>
      </div>
    );
  }
  // Right panel for AI assistant (placeholder)
  if (panel === "right") {
    return (
      <div className="flex h-full flex-col p-3">
        <Panel className="flex-1">
          <div className="flex h-full items-center justify-center text-app-text-muted text-xs">
            AI 어시스턴트
          </div>
        </Panel>
      </div>
    );
  }
  return null;
}
