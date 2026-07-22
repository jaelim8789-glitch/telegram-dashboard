"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  onTest: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  saved: boolean;
}

export function TopBar({ onTest, onSave, saving, saved }: TopBarProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("새 매크로");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="flex items-center justify-between border-b border-violet-500/20 bg-app-surface px-6 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 rounded-lg p-1.5 text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          title="돌아가기"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
              if (e.key === "Escape") {
                setName("새 매크로");
                setEditing(false);
              }
            }}
            className="rounded-lg border border-violet-500/30 bg-app-bg px-2 py-1 text-sm font-medium text-app-text outline-none focus:border-violet-500/60"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-sm font-medium text-app-text transition-colors hover:bg-app-card-hover"
          >
            {name}
          </button>
        )}

        <div className="ml-2 flex items-center gap-1.5">
          {saving ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] text-amber-400">저장 중...</span>
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-[11px] text-green-400">저장됨</span>
            </>
          ) : (
            <span className="text-[11px] text-app-text-muted">
              클릭하여 편집
            </span>
          )}
        </div>
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
          className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
