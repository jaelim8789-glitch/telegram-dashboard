"use client";

import { memo, useRef, type ChangeEvent } from "react";
import { Field } from "@/components/ui/Field";
import { RecentPhraseChips } from "@/components/ui/RecentPhraseChips";

interface MessageComposerProps {
  message: string;
  recentMessages: string[];
  onMessageChange: (value: string) => void;
  onRecentSelect: (phrase: string) => void;
}

export const MessageComposer = memo(function MessageComposer({
  message,
  recentMessages,
  onMessageChange,
  onRecentSelect,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onMessageChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 320) + "px";
  }

  return (
    <div>
      <RecentPhraseChips
        phrases={recentMessages}
        onSelect={onRecentSelect}
        className="mb-1"
      />
      <Field label="메시지 내용">
        <textarea
          ref={textareaRef}
          rows={5}
          value={message}
          onChange={handleChange}
          placeholder="발송할 메시지를 입력하세요."
          required
          className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 resize-none min-h-[88px]"
        />
      </Field>
    </div>
  );
});
