"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatListPanel } from "@/components/chat-management/ChatListPanel";
import { ChatConversationPanel } from "@/components/chat-management/ChatConversationPanel";
import { AiMacroPanel } from "@/components/chat-management/AiMacroPanel";
import { CHAT_ROOMS, MESSAGES, AI_MACROS } from "@/components/chat-management/mockData";
import type { AiMacro, ChatMessage, ChatRoom } from "@/components/chat-management/mockData";

let msgCounter = 1000;
function nextMsgId() {
  return `sent-${++msgCounter}`;
}

export default function ChatManagementPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>(CHAT_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>(MESSAGES);
  const [macros, setMacros] = useState<AiMacro[]>(AI_MACROS);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const messages = activeRoomId ? messagesByRoom[activeRoomId] ?? [] : [];

  const handleSelectRoom = useCallback((id: string) => {
    setActiveRoomId(id);
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, unreadCount: 0 } : r))
    );
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveRoomId(null);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!activeRoomId) return;
      const newMsg: ChatMessage = {
        id: nextMsgId(),
        chatRoomId: activeRoomId,
        sender: "me",
        senderName: "나",
        content: text,
        timestamp: new Date(),
      };
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] ?? []), newMsg],
      }));
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? { ...r, lastMessage: text, lastMessageTime: new Date() }
            : r
        )
      );
    },
    [activeRoomId]
  );

  const handleToggleMacro = useCallback((id: string, enabled: boolean) => {
    setMacros((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && activeRoomId) {
        e.preventDefault();
        handleBackToList();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRoomId, handleBackToList]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* ── Desktop: Panel 1 (chat list) ── */}
      {/* ── Mobile: shown only when no room selected ── */}
      <div className={`${activeRoomId ? "hidden sm:block" : "block"}`}>
        <ChatListPanel
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* ── Desktop: Panel 2 (conversation) ── */}
      {/* ── Mobile: shown only when room selected ── */}
      <div
        className={`flex flex-1 flex-col ${
          activeRoomId ? "flex" : "hidden sm:flex"
        }`}
      >
        {/* Mobile back button */}
        <div className="flex items-center gap-2 border-b border-violet-500/20 bg-app-surface px-3 py-2 sm:hidden">
          <button
            onClick={handleBackToList}
            aria-label="채팅 목록으로 돌아가기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="truncate text-sm font-medium text-app-text">
            {activeRoom?.name ?? ""}
          </span>
        </div>

        <div className="flex-1">
          <ChatConversationPanel
            room={activeRoom}
            messages={messages}
            onSend={handleSendMessage}
          />
        </div>
      </div>

      {/* ── AI Macro panel — desktop only ── */}
      <div className="hidden lg:block">
        <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
      </div>
    </div>
  );
}
