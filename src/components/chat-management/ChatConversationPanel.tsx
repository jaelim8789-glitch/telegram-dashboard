"use client";

import {
  Send,
  MessagesSquare,
  Copy,
  Reply,
  Trash2,
  Paperclip,
  Search,
  X,
  Check,
  CheckCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, ChatRoom } from "./mockData";

interface ChatConversationPanelProps {
  room: ChatRoom | null;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  messageId: string;
}

function formatTimeOnly(date: Date): string {
  return date.toLocaleString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateDivider(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "오늘";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "어제";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DateDivider({ date }: { date: Date }) {
  return (
    <div className="my-4 flex items-center gap-2">
      <div className="h-px flex-1 bg-violet-500/10" />
      <span className="shrink-0 text-[10px] text-app-text-muted">
        {formatDateDivider(date)}
      </span>
      <div className="h-px flex-1 bg-violet-500/10" />
    </div>
  );
}

function TimeGapLabel({ time }: { time: string }) {
  return (
    <div className="my-2 text-center">
      <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] text-app-text-muted">
        {time}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="mt-3 flex justify-start"
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#1a1a24] px-4 py-3">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-text-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-text-muted" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-text-muted" />
      </div>
    </motion.div>
  );
}

function StatusIcon({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (!status) return null;
  if (status === "sent") {
    return <Check className="h-3 w-3 text-white/60" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 text-white/60" />;
  }
  return <CheckCheck className="h-3 w-3 text-violet-300" />;
}

export function ChatConversationPanel({
  room,
  messages,
  onSend,
}: ChatConversationPanelProps) {
  const [input, setInput] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [convSearchIdx, setConvSearchIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convSearchRef = useRef<HTMLInputElement>(null);
  const scrollMemory = useRef<Map<string, number>>(new Map());
  const prevRoomIdRef = useRef<string | null>(null);

  const saveScroll = useCallback(() => {
    if (prevRoomIdRef.current && scrollRef.current) {
      scrollMemory.current.set(
        prevRoomIdRef.current,
        scrollRef.current.scrollTop
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      saveScroll();
    };
  }, [saveScroll]);

  useEffect(() => {
    if (!room || !scrollRef.current) return;

    if (prevRoomIdRef.current && prevRoomIdRef.current !== room.id) {
      saveScroll();
    }

    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const saved = scrollMemory.current.get(room.id);
      if (saved !== undefined) {
        scrollRef.current.scrollTop = saved;
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    prevRoomIdRef.current = room.id;
    setShowConvSearch(false);
    setConvSearch("");

    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [room, saveScroll]);

  useEffect(() => {
    if (!scrollRef.current || !room) return;
    const saved = scrollMemory.current.get(room.id);
    if (saved !== undefined) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, room]);

  useEffect(() => {
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const matchedIds = useMemo(() => {
    if (!convSearch) return [];
    return messages
      .map((m, i) => (m.content.includes(convSearch) ? m.id : null))
      .filter(Boolean) as string[];
  }, [messages, convSearch]);

  const highlightedIdx = matchedIds.length > 0 ? convSearchIdx % matchedIds.length : -1;

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");

    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleContextMenu(
    e: React.MouseEvent,
    messageId: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId });
  }

  function handleCopy(msg: ChatMessage) {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setContextMenu(null);
  }

  function handleReply(msg: ChatMessage) {
    setInput(`[답장] @${msg.senderName}: `);
    setContextMenu(null);
    inputRef.current?.focus();
  }

  function handleDelete(msgId: string) {
    setContextMenu(null);
  }

  function handleToggleConvSearch() {
    const next = !showConvSearch;
    setShowConvSearch(next);
    setConvSearch("");
    setConvSearchIdx(0);
    if (next) {
      setTimeout(() => convSearchRef.current?.focus(), 50);
    }
  }

  function handleConvSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (matchedIds.length > 0) {
        setConvSearchIdx((p) => (p + 1) % matchedIds.length);
      }
    }
    if (e.key === "Escape") {
      setShowConvSearch(false);
      setConvSearch("");
    }
  }

  function handleConvSearchUp() {
    setConvSearchIdx((p) => (matchedIds.length + p - 1) % matchedIds.length || 0);
  }

  function handleConvSearchDown() {
    setConvSearchIdx((p) => (p + 1) % matchedIds.length);
  }

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center bg-app-bg">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <MessagesSquare className="h-8 w-8 text-violet-400" />
          </div>
          <p className="text-sm text-app-text-muted">대화를 선택해주세요</p>
        </div>
      </div>
    );
  }

  const chatNodes: React.ReactNode[] = [];
  let lastDate: string | null = null;
  let lastSender: string | null = null;
  let lastSenderIndex = -1;
  let prevTimestamp: number | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = msg.timestamp.toDateString();
    const isNewDate = msgDate !== lastDate;
    const isNewSender = msg.sender !== lastSender;

    if (isNewDate) {
      chatNodes.push(
        <DateDivider key={`date-${msg.id}`} date={msg.timestamp} />
      );
      lastDate = msgDate;
      lastSender = null;
      prevTimestamp = null;
    }

    if (prevTimestamp !== null) {
      const gapMs = msg.timestamp.getTime() - prevTimestamp;
      if (gapMs > 5 * 60 * 1000) {
        chatNodes.push(
          <TimeGapLabel
            key={`gap-${msg.id}`}
            time={formatTimeOnly(new Date(prevTimestamp))}
          />
        );
      }
    }
    prevTimestamp = msg.timestamp.getTime();

    const isMe = msg.sender === "me";
    const prevConsecutive =
      !isNewDate && !isNewSender && lastSenderIndex >= 0;
    const spacingClass = prevConsecutive ? "mt-0.5" : "mt-3";
    const isMatch = matchedIds.includes(msg.id);
    const isActiveMatch = isMatch && highlightedIdx >= 0 && msg.id === matchedIds[highlightedIdx];

    const renderContent = () => {
      if (!convSearch || !isMatch) return msg.content;
      const idx = msg.content.indexOf(convSearch);
      if (idx === -1) return msg.content;
      return (
        <>
          {msg.content.slice(0, idx)}
          <mark
            className={`rounded-sm px-0.5 ${
              isActiveMatch
                ? "bg-orange-400/40 text-white"
                : "bg-violet-500/30 text-white"
            }`}
          >
            {msg.content.slice(idx, idx + convSearch.length)}
          </mark>
          {msg.content.slice(idx + convSearch.length)}
        </>
      );
    };

    chatNodes.push(
      <div
        key={msg.id}
        className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in ${spacingClass} ${
          isActiveMatch ? "rounded-lg ring-2 ring-violet-400/50" : ""
        }`}
      >
        <div
          className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}
          onContextMenu={(e) => handleContextMenu(e, msg.id)}
        >
          {!isMe && !prevConsecutive && (
            <div className="mb-1 ml-0.5 flex items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-bold text-white">
                {msg.senderName[0]}
              </div>
              <span className="text-[11px] font-medium text-app-text-muted">
                {msg.senderName}
              </span>
            </div>
          )}
          <div
            className={`cursor-context-menu select-text px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isMe
                ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-2xl rounded-br-sm ml-auto"
                : "bg-[#1a1a24] text-app-text rounded-2xl rounded-bl-sm"
            }`}
          >
            {renderContent()}
          </div>
          <span
            className={`mt-0.5 flex items-center gap-1 px-1 text-[10px] text-app-text-subtle ${
              isMe ? "justify-end" : "justify-start"
            }`}
          >
            {formatTimeOnly(msg.timestamp)}
            {isMe && <StatusIcon status={msg.status} />}
          </span>
        </div>
      </div>
    );

    lastSender = msg.sender;
    lastSenderIndex = i;
  }

  const contextMessage = contextMenu
    ? messages.find((m) => m.id === contextMenu.messageId) ?? null
    : null;

  return (
    <div className="relative flex flex-1 flex-col bg-app-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-violet-500/20 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
            {room.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-app-text">
                {room.name}
              </span>
              {room.isOnline !== undefined && (
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    room.isOnline
                      ? "bg-green-500 animate-pulse"
                      : "bg-app-text-subtle"
                  }`}
                />
              )}
              {isTyping && (
                <span className="shrink-0 text-[10px] text-green-400 animate-pulse">
                  입력 중...
                </span>
              )}
            </div>
            {room.subscriberCount != null && (
              <span className="text-[11px] text-app-text-muted">
                구독자 {room.subscriberCount.toLocaleString()}명
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleToggleConvSearch}
          aria-label="대화 내 검색"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            showConvSearch
              ? "bg-violet-500/20 text-violet-400"
              : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
          }`}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {showConvSearch && (
        <div className="flex items-center gap-1.5 border-b border-violet-500/20 px-4 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-app-text-muted" />
          <input
            ref={convSearchRef}
            type="text"
            placeholder="대화 내용 검색..."
            value={convSearch}
            onChange={(e) => {
              setConvSearch(e.target.value);
              setConvSearchIdx(0);
            }}
            onKeyDown={handleConvSearchKeyDown}
            className="flex-1 bg-transparent text-xs text-app-text outline-none placeholder:text-app-text-subtle"
          />
          {convSearch && (
            <>
              <span className="text-[10px] text-app-text-subtle">
                {matchedIds.length > 0
                  ? `${highlightedIdx + 1}/${matchedIds.length}`
                  : "0/0"}
              </span>
              <button
                onClick={handleConvSearchUp}
                disabled={matchedIds.length === 0}
                className="rounded p-0.5 text-app-text-muted transition-colors hover:text-app-text disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleConvSearchDown}
                disabled={matchedIds.length === 0}
                className="rounded p-0.5 text-app-text-muted transition-colors hover:text-app-text disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowConvSearch(false);
              setConvSearch("");
            }}
            className="rounded p-0.5 text-app-text-muted transition-colors hover:text-app-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3"
      >
        {chatNodes}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
      </div>

      <div className="border-t border-violet-500/20 p-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="파일 첨부"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-full border border-violet-500/20 bg-app-card px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {contextMenu && contextMessage && (
        <div
          className="fixed z-50 min-w-[140px] rounded-xl border border-violet-500/30 bg-app-card shadow-xl shadow-black/40 backdrop-blur-xl"
          style={{ left: contextMenu.x + 4, top: contextMenu.y + 4 }}
        >
          <button
            onClick={() => handleCopy(contextMessage)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text transition-colors hover:bg-violet-500/10 rounded-t-xl"
          >
            <Copy className="h-3.5 w-3.5 text-app-text-muted" />
            복사
          </button>
          <button
            onClick={() => handleReply(contextMessage)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text transition-colors hover:bg-violet-500/10"
          >
            <Reply className="h-3.5 w-3.5 text-app-text-muted" />
            답장
          </button>
          <button
            onClick={() => handleDelete(contextMessage.id)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-danger transition-colors hover:bg-red-500/10 rounded-b-xl"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
