"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [mobileMacroOpen, setMobileMacroOpen] = useState(false);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const messages = activeRoomId ? messagesByRoom[activeRoomId] ?? [] : [];

  const handleSelectRoom = useCallback((id: string) => {
    setActiveRoomId(id);
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, unreadCount: 0 } : r))
    );
    setMobileMacroOpen(false);
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveRoomId(null);
    setMobileMacroOpen(false);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  }, []);

  const handleTogglePin = useCallback((id: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPinned: !r.isPinned } : r))
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
        status: "sent",
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
      if (e.key === "Escape") {
        if (mobileMacroOpen) {
          e.preventDefault();
          setMobileMacroOpen(false);
        } else if (activeRoomId) {
          e.preventDefault();
          handleBackToList();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRoomId, handleBackToList, mobileMacroOpen]);

  useEffect(() => {
    if (mobileMacroOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMacroOpen]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <div className={`${activeRoomId ? "hidden sm:block" : "block"}`}>
        <ChatListPanel
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onToggleFavorite={handleToggleFavorite}
          onTogglePin={handleTogglePin}
        />
      </div>

      <div
        className={`flex flex-1 flex-col ${
          activeRoomId ? "flex" : "hidden sm:flex"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-violet-500/20 bg-app-surface px-3 py-2 sm:hidden">
          <button
            onClick={handleBackToList}
            aria-label="채팅 목록으로 돌아가기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 truncate text-sm font-medium text-app-text">
            {activeRoom?.name ?? ""}
          </span>
          <button
            onClick={() => setMobileMacroOpen(true)}
            aria-label="AI 매크로 열기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-400 transition-colors hover:bg-violet-500/10"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1">
          <ChatConversationPanel
            room={activeRoom}
            messages={messages}
            onSend={handleSendMessage}
          />
        </div>
      </div>

      <div className="hidden lg:block">
        <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
      </div>

      <AnimatePresence>
        {mobileMacroOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileMacroOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed right-0 top-[3.5rem] bottom-0 z-50 lg:hidden"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setMobileMacroOpen(false)}
                  aria-label="AI 매크로 닫기"
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-app-card text-app-text-muted transition-colors hover:text-app-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <AiMacroPanel macros={macros} onToggle={handleToggleMacro} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
