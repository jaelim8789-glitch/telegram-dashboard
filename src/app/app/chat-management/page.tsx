"use client";

import { useState, useCallback } from "react";
import { ChatListPanel } from "@/components/chat-management/ChatListPanel";
import { ChatConversationPanel } from "@/components/chat-management/ChatConversationPanel";
import { AiMacroPanel } from "@/components/chat-management/AiMacroPanel";
import { CHAT_ROOMS, MESSAGES, AI_MACROS } from "@/components/chat-management/mockData";
import type { AiMacro } from "@/components/chat-management/mockData";
import { useAiWhisper } from "@/hooks/useAiWhisper";
import { WhisperPanel } from "@/components/ai/WhisperPanel";

export default function ChatManagementPage() {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [macros, setMacros] = useState<AiMacro[]>(AI_MACROS);

  const activeRoom = CHAT_ROOMS.find((r) => r.id === activeRoomId) ?? null;
  const messages = activeRoomId ? MESSAGES[activeRoomId] ?? [] : [];

  const {
    whisper,
    loading: whisperLoading,
    dismissed: whisperDismissed,
    send: whisperSend,
    dismiss: whisperDismiss,
    editAndSend: whisperEditAndSend,
    show: whisperShow,
  } = useAiWhisper(activeRoomId, {
    customerName: activeRoom?.name || "",
    recentMessages: messages.slice(-10).map((m) => ({ role: m.sender === "other" ? "user" : "assistant", content: m.content })),
  });

  const handleToggleMacro = useCallback((id: string, enabled: boolean) => {
    setMacros((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <ChatListPanel rooms={CHAT_ROOMS} activeRoomId={activeRoomId} onSelectRoom={setActiveRoomId} />
      <div className="flex flex-1 flex-col min-w-0">
        {activeRoomId && (
          <div className="px-4 pt-3">
            <WhisperPanel
              whisper={whisper}
              loading={whisperLoading}
              dismissed={whisperDismissed}
              onShow={whisperShow}
              onSend={whisperSend}
              onEdit={whisperEditAndSend}
              onDismiss={whisperDismiss}
            />
          </div>
        )}
        <ChatConversationPanel room={activeRoom} messages={messages} />
      </div>
      <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
    </div>
  );
}
