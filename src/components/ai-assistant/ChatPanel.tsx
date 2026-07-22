"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { MOCK_SUGGESTED_QUESTIONS } from "./mockData";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatInputBar } from "./ChatInputBar";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ChatPanel({ messages, onSendMessage, isLoading, error, onRetry }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
  }, [input, onSendMessage]);

  const handleSuggestedQuestion = useCallback((text: string) => {
    onSendMessage(text);
  }, [onSendMessage]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-app-border px-5 py-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-app-card bg-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-app-text">AI 비서</p>
          <p className="text-xs text-green-400">온라인</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">오류가 발생했습니다</p>
              <p className="mt-0.5 text-xs text-app-text-muted">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        )}
        {showSuggestions && messages.length === 0 ? (
          <SuggestedQuestions questions={MOCK_SUGGESTED_QUESTIONS} onSelect={handleSuggestedQuestion} />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                streaming={msg.role === "assistant" && isLoading && msg === messages[messages.length - 1]}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-app-border/50 bg-[#1a1a24] px-4 py-3">
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-violet-400" />
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-violet-400" />
                    <span className="typing-dot inline-block h-2 w-2 rounded-full bg-violet-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-app-border px-5 py-3">
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
          placeholder="AI 비서에게 무엇이든 물어보세요..."
        />
      </div>
    </div>
  );
}
