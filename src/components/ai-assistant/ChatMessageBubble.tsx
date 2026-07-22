"use client";

import type { ChatMessage } from "./types";
import { MarkdownMessage } from "@/components/ai/MarkdownMessage";
import { Sparkles } from "lucide-react";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

export function ChatMessageBubble({ message, streaming }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {!isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        )}
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
      </div>
    </div>
  );
}
