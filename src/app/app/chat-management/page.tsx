"use client";

import { useState, useCallback } from "react";
import { ChatListPanel } from "@/components/chat-management/ChatListPanel";
import { ChatConversationPanel } from "@/components/chat-management/ChatConversationPanel";
import { AiMacroPanel } from "@/components/chat-management/AiMacroPanel";
import { CHAT_ROOMS, MESSAGES, AI_MACROS } from "@/components/chat-management/mockData";
import type { AiMacro } from "@/components/chat-management/mockData";

export default function ChatManagementPage() {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [macros, setMacros] = useState<AiMacro[]>(AI_MACROS);

  const activeRoom = CHAT_ROOMS.find((r) => r.id === activeRoomId) ?? null;
  const messages = activeRoomId ? MESSAGES[activeRoomId] ?? [] : [];

  const handleToggleMacro = useCallback((id: string, enabled: boolean) => {
    setMacros((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <ChatListPanel rooms={CHAT_ROOMS} activeRoomId={activeRoomId} onSelectRoom={setActiveRoomId} />
      <ChatConversationPanel room={activeRoom} messages={messages} />
      <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
    </div>
  );
}
