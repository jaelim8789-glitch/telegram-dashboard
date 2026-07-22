"use client";

import { ChevronRight } from "lucide-react";

interface TopBarProps {
  onTest: () => void;
  onSave: () => void;
  saving?: boolean;
}

export function TopBar({ onTest, onSave, saving }: TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-violet-500/20 bg-app-surface px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-app-text-muted">매크로</span>
        <ChevronRight className="h-3.5 w-3.5 text-app-text-muted" />
        <span className="font-medium text-app-text">새 매크로</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onTest}
          className="rounded-xl border border-violet-500 px-4 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
        >
          테스트
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
