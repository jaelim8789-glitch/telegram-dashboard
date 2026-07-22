"use client";

import { useRef, KeyboardEvent, useCallback, useEffect } from "react";
import { Send, Mic } from "lucide-react";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInputBar({ value, onChange, onSend, disabled, placeholder }: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-violet-500/20 bg-app-card px-4 py-2.5 transition-colors focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/10">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
        aria-label="음성 입력"
      >
        <Mic className="h-4 w-4" />
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "메시지를 입력하세요..."}
        disabled={disabled}
        rows={1}
        className="min-h-[40px] max-h-[120px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-app-text placeholder:text-app-text-muted/60 outline-none disabled:opacity-50"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="전송"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
