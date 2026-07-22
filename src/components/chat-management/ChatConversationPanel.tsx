"use client";

import { Send, Users } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage, ChatRoom } from "./mockData";

interface ChatConversationPanelProps {
  room: ChatRoom | null;
  messages: ChatMessage[];
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: isToday ? undefined : "2-digit",
    minute: isToday ? "2-digit" : undefined,
    hour12: true,
    ...(isToday ? {} : {}),
  });
}

function formatTimeOnly(date: Date): string {
  return date.toLocaleString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function TimestampDivider({ date }: { date: Date }) {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="h-px flex-1 bg-violet-500/10" />
      <span className="text-xs text-app-text-muted">{formatTimestamp(date)}</span>
      <div className="h-px flex-1 bg-violet-500/10" />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isMe = message.sender === "me";

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && (
          <span className="mb-1 block px-1 text-[10px] font-medium text-app-text-muted">
            {message.senderName}
          </span>
        )}
        <div
          className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isMe
              ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-2xl rounded-br-sm ml-auto"
              : "bg-app-card text-app-text rounded-2xl rounded-bl-sm border border-app-border"
          }`}
        >
          {message.content}
        </div>
        <span
          className={`mt-0.5 block px-1 text-[10px] text-app-text-subtle ${isMe ? "text-right" : "text-left"}`}
        >
          {formatTimeOnly(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export function ChatConversationPanel({ room, messages }: ChatConversationPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, room]);

  function handleSend() {
    if (!input.trim()) return;
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center bg-app-bg">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <Users className="h-8 w-8 text-violet-400" />
          </div>
          <p className="text-sm text-app-text-muted">대화를 선택해주세요</p>
          <p className="mt-1 text-xs text-app-text-subtle">왼쪽 패널에서 채팅방을 선택하면 메시지가 표시됩니다</p>
        </div>
      </div>
    );
  }

  let lastDate: string | null = null;
  const messagesWithDividers: React.ReactNode[] = [];

  for (const msg of messages) {
    const msgDate = msg.timestamp.toDateString();
    if (msgDate !== lastDate) {
      messagesWithDividers.push(<TimestampDivider key={`div-${msg.id}`} date={msg.timestamp} />);
      lastDate = msgDate;
    }
    messagesWithDividers.push(<MessageBubble key={msg.id} message={msg} />);
  }

  return (
    <div className="flex flex-1 flex-col bg-app-bg">
      <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
            {room.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-app-text">{room.name}</span>
              {room.isOnline !== undefined && (
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    room.isOnline ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" : "bg-app-text-subtle"
                  }`}
                />
              )}
            </div>
            {room.subscriberCount != null && (
              <div className="flex items-center gap-1 text-[11px] text-app-text-muted">
                <Users className="h-3 w-3" />
                <span>구독자 {room.subscriberCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        <div className="space-y-1">{messagesWithDividers}</div>
      </div>

      <div className="border-t border-violet-500/20 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-full border border-violet-500/30 bg-app-card px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white transition-all hover:from-violet-600 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
