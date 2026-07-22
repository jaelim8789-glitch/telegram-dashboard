"use client";

import { useRef, KeyboardEvent } from "react";
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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-full border border-violet-500/30 bg-app-card px-4 py-2.5 transition-colors focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/10">
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
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
        className="min-h-[24px] max-h-32 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-app-text placeholder:text-app-text-muted/60 outline-none disabled:opacity-50"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="전송"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
