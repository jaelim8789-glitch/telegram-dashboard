"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "./types";
import { MarkdownMessage } from "@/components/ai/MarkdownMessage";
import { Sparkles, Copy, Check } from "lucide-react";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

export function ChatMessageBubble({ message, streaming }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [message.content]);

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {!isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        <div className="relative">
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isUser
                ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-br-sm"
                : "bg-[#1a1a24] text-app-text rounded-bl-sm border border-app-border/50"
            }`}
          >
            {isUser ? (
              message.content
            ) : (
              <MarkdownMessage content={message.content} />
            )}
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-400 align-text-bottom" />
            )}
          </div>
          {!isUser && message.content && !streaming && (
            <button
              onClick={handleCopy}
              className="absolute -top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-app-card border border-app-border/50 text-app-text-muted opacity-0 transition-all hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] group-hover:opacity-100 cursor-pointer"
              aria-label={copied ? "복사됨" : "복사"}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
