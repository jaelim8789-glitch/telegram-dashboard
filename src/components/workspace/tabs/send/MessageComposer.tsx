"use client";

import { memo, useRef, useState, type ChangeEvent } from "react";
import { Field } from "@/components/ui/Field";
import { RecentPhraseChips } from "@/components/ui/RecentPhraseChips";
import { SmartKeyboardToolbar } from "@/components/ui/SmartKeyboardToolbar"; // 스마트 키보드 툴바 추가

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
  const [toolbarVisible, setToolbarVisible] = useState(false);

  // 템플릿 데이터
  const templates = [
    { id: '1', name: '기본 인사', content: '안녕하세요, 잘 부탁드립니다.' },
    { id: '2', name: '업무 안내', content: '업무시간은 평일 09:00~18:00입니다.' },
    { id: '3', name: '감사 인사', content: '항상 감사합니다.' },
  ];

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onMessageChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 320) + "px";
  }

  const handleInsertTemplate = (template: string) => {
    const newText = message + template;
    onMessageChange(newText);
    setToolbarVisible(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    const newText = message + emoji;
    onMessageChange(newText);
    setToolbarVisible(false);
  };

  const handleInsertSpecialChar = (char: string) => {
    const newText = message + char;
    onMessageChange(newText);
    setToolbarVisible(false);
  };

  const handleInsertRecentMessage = (recentMsg: string) => {
    const newText = message + recentMsg;
    onMessageChange(newText);
    setToolbarVisible(false);
  };

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
          onFocus={() => setToolbarVisible(true)}
          onBlur={() => setTimeout(() => setToolbarVisible(false), 200)}
        />
      </Field>
      
      {/* 스마트 키보드 툴바 */}
      <SmartKeyboardToolbar
        onInsertTemplate={handleInsertTemplate}
        onInsertEmoji={handleInsertEmoji}
        onInsertSpecialChar={handleInsertSpecialChar}
        onInsertRecentMessage={handleInsertRecentMessage}
        templates={templates}
        recentMessages={recentMessages}
        isVisible={toolbarVisible}
        onClose={() => setToolbarVisible(false)}
      />
    </div>
  );
});