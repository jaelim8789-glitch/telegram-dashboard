"use client";

import { useState, useCallback } from "react";
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

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <ChatListPanel
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={handleSelectRoom}
        onToggleFavorite={handleToggleFavorite}
      />
      <ChatConversationPanel
        room={activeRoom}
        messages={messages}
        onSend={handleSendMessage}
      />
      <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
    </div>
  );
}
