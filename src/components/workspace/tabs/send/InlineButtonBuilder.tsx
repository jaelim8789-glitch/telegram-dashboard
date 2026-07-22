"use client";

import { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, Trash2, GripVertical, ExternalLink, TabletSmartphone } from "lucide-react";

interface InlineButton {
  label: string;
  url: string;
}

interface InlineButtonBuilderProps {
  buttons: InlineButton[];
  onChange: (buttons: InlineButton[]) => void;
}

export function InlineButtonBuilder({ buttons, onChange }: InlineButtonBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);

  const addButton = useCallback(() => {
    onChange([...buttons, { label: "", url: "" }]);
  }, [buttons, onChange]);

  const removeButton = useCallback((index: number) => {
    onChange(buttons.filter((_, i) => i !== index));
  }, [buttons, onChange]);

  const updateButton = useCallback((index: number, field: keyof InlineButton, value: string) => {
    const next = [...buttons];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }, [buttons, onChange]);

  const validButtons = buttons.filter((b) => b.label.trim() && b.url.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-text-muted">인라인 버튼 (선택)</span>
        <div className="flex items-center gap-1">
          {buttons.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
            >
              <TabletSmartphone className="h-3 w-3" />
              {showPreview ? "편집" : "미리보기"}
            </button>
          )}
          <button
            type="button"
            onClick={addButton}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-primary hover:bg-app-primary-muted/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> 버튼 추가
          </button>
        </div>
      </div>

      {buttons.length === 0 && !showPreview && (
        <p className="text-[11px] text-app-text-subtle italic">
          버튼을 추가하면 Telegram 메시지 하단에 클릭 가능한 링크가 표시됩니다.
        </p>
      )}

      {showPreview ? (
        <div className="rounded-xl border border-app-border bg-app-bg p-3">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {validButtons.length > 0 ? validButtons.map((btn, i) => (
              <a
                key={`btn-${i}`}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-card px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-app-primary" />
                {btn.label}
              </a>
            )) : (
              <p className="text-[11px] text-app-text-subtle italic py-2">
                버튼 이름과 URL을 입력하면 여기에 미리보기가 표시됩니다.
              </p>
            )}
          </div>
        </div>
      ) : (
        <Reorder.Group axis="y" values={buttons} onReorder={onChange} className="space-y-1.5">
          {buttons.map((btn, idx) => (
            <Reorder.Item
              key={btn.label || `btn-${idx}`}
              value={btn}
              className="flex items-start gap-2 rounded-xl border border-app-border bg-app-card/50 p-2.5 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center pt-2 text-app-text-subtle cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={btn.label}
                  onChange={(e) => updateButton(idx, "label", e.target.value)}
                  placeholder="버튼 이름"
                  maxLength={32}
                  className="rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60 placeholder:text-app-text-subtle"
                />
                <input
                  value={btn.url}
                  onChange={(e) => updateButton(idx, "url", e.target.value)}
                  placeholder="https://..."
                  className="rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60 placeholder:text-app-text-subtle font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => removeButton(idx)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted/20 transition-colors mt-1"
                aria-label="버튼 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
