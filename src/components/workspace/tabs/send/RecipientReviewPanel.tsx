"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Group } from "@/types";

interface RecipientReviewPanelProps {
  recipients: Group[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function RecipientReviewPanel({
  recipients,
  onRemove,
  onClearAll,
}: RecipientReviewPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (recipients.length === 0) return null;
  return (
    <div className="rounded-xl border border-app-border bg-app-card/70 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-app-card-hover/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-app-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-app-text-muted" />
          )}
          <div className="min-w-0">
            <div className="text-xs font-medium text-app-text-muted">수신자 검토</div>
            <div className="text-sm font-semibold text-app-text">
              {recipients.length}명 선택됨
            </div>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClearAll(); }} className="shrink-0">
          전체 해제
        </Button>
      </button>

      {expanded && (
        <div className="px-3 pb-3 max-h-40 space-y-1 overflow-y-auto">
          {recipients.map((recipient) => (
            <div
              key={recipient.id}
              className="flex items-start gap-2 rounded-lg border border-app-border/70 bg-app-bg/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-app-text">{recipient.title}</div>
                <div className="truncate font-mono text-[11px] text-app-text-subtle">{recipient.id}</div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(recipient.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-app-text-subtle transition-colors hover:bg-app-card-hover hover:text-app-text"
                aria-label={`${recipient.title} 제거`}
                title="제거"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
