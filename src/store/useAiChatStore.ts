import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/components/ai-assistant/types";

interface AiChatState {
  messages: ChatMessage[];
  addMessages: (msgs: ChatMessage[]) => void;
  clearHistory: () => void;
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessages: (msgs) =>
        set((state) => ({
          messages: [...state.messages, ...msgs].slice(-200),
        })),
      clearHistory: () => set({ messages: [] }),
    }),
    { name: "telemon-ai-chat" }
  )
);
