"use client";

/**
 * AppShell — TeleMon VS Code-style 3-column layout
 *
 * Desktop (sm:):
 * ┌──────────┬──────────────┬─────────────────┬─────────────────┐
 * │ Category │ Left Panel   │  Center Panel   │ Right Panel     │
 * │ Sidebar  │ (300px)      │  (flex-1)       │ (350px)         │
 * │ (64px)   │              │                 │                 │
 * └──────────┴──────────────┴─────────────────┴─────────────────┘
 *
 * Mobile (max-sm:): 1 panel + bottom MobileCategoryBar
 *
 * Nicegram mode: 3 panels all visible (DialogList + ChatView + AiAssistantPanel)
 */

import { type ReactNode, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategorySidebar } from "@/components/layout/CategorySidebar";
import { MobileCategoryBar } from "@/components/layout/MobileCategoryBar";
import { useCategoryStore } from "@/store/useCategoryStore";
import { usePanelVisibility } from "@/hooks/usePanelVisibility";
import { cn } from "@/lib/cn";
import { NicegramDialogList } from "@/components/nicegram/DialogList";
import { NicegramChatView } from "@/components/nicegram/ChatView";
import { AiAssistantPanel } from "@/components/nicegram/AiAssistantPanel";

interface AppShellProps {
  children: ReactNode;
  /** Optional: Left panel content (category-specific) */
  leftPanel?: ReactNode;
  /** Optional: Right panel content (AI assistant, etc.) */
  rightPanel?: ReactNode;
}

export function AppShell({ children, leftPanel, rightPanel }: AppShellProps) {
  const activeCategory = useCategoryStore((s) => s.activeCategory);
  const { showLeftPanel, showRightPanel } = usePanelVisibility();

  // ── Nicegram mode state ──
  const [ngActiveChatId, setNgActiveChatId] = useState<number | null>(null);
  const [ngChatTitle, setNgChatTitle] = useState<string>("");
  const isNicegram = activeCategory === "nicegram";

  const handleSelectChat = useCallback((chatId: number) => {
    setNgActiveChatId(chatId);
    // In real implementation, load chat title from API
    // For now, set a placeholder
    setNgChatTitle(`대화방 #${chatId}`);
  }, []);

  const handleBack = useCallback(() => {
    setNgActiveChatId(null);
    setNgChatTitle("");
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg">
      {/* ── Category Icon Sidebar (desktop only) ── */}
      <CategorySidebar />

      {/* ── Main content area ── */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Left Panel */}
        {isNicegram ? (
          /* Nicegram: DialogList (300px) */
          <aside
            className="hidden sm:flex w-[300px] shrink-0 flex-col border-r border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="채팅방 목록"
          >
            <NicegramDialogList
              activeChatId={ngActiveChatId}
              onSelectChat={handleSelectChat}
            />
          </aside>
        ) : showLeftPanel && leftPanel ? (
          /* Generic: left panel */
          <aside
            className="hidden sm:flex w-[300px] shrink-0 flex-col border-r border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="왼쪽 패널"
          >
            {leftPanel}
          </aside>
        ) : null}

        {/* Center Panel (main content) */}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {isNicegram && ngActiveChatId ? (
            /* Nicegram: ChatView */
            <NicegramChatView
              accountId="0"
              chatId={ngActiveChatId}
              chatTitle={ngChatTitle}
              onBack={handleBack}
            />
          ) : (
            /* Generic: page content */
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex-1 overflow-y-auto"
                style={{
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Right Panel */}
        {isNicegram ? (
          /* Nicegram: AiAssistantPanel (350px) */
          <aside
            className="hidden sm:flex w-[350px] shrink-0 flex-col border-l border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="AI 비서"
          >
            <AiAssistantPanel chatTitle={ngChatTitle || undefined} />
          </aside>
        ) : showRightPanel && rightPanel ? (
          /* Generic: right panel */
          <aside
            className="hidden sm:flex w-[350px] shrink-0 flex-col border-l border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="오른쪽 패널"
          >
            {rightPanel}
          </aside>
        ) : null}
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <MobileCategoryBar />
    </div>
  );
}
