"use client";

/**
 * AppShell ? Premium glass 3-column AI OS layout
 *
 * Desktop (sm:):
 * 忙式式式式式式式式式式式式成式式式式式式式式式式式式式式式式式式式式式式式式式式式式式成式式式式式式式式式式式式式式忖
 * 弛 Sidebar    弛       Main Content          弛 AI Panel     弛
 * 弛 (64px)     弛    (glass cards, KPIs)      弛 (320px)      弛
 * 弛 glass dark 弛       premium               弛 glass dark   弛
 * 弛 purple     弛       dashboard             弛 purple       弛
 * 弛 border-right弛                           弛 border-left  弛
 * 戌式式式式式式式式式式式式扛式式式式式式式式式式式式式式式式式式式式式式式式式式式式式扛式式式式式式式式式式式式式式戎
 *
 * Mobile (max-sm:): single panel + glass bottom bar with safe-area
 */

import { type ReactNode, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategorySidebar } from "@/components/layout/CategorySidebar";
import { MobileCategoryBar } from "@/components/layout/MobileCategoryBar";
import { useCategoryStore } from "@/store/useCategoryStore";
import { usePanelVisibility } from "@/hooks/usePanelVisibility";
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

  // 式式 Nicegram mode state 式式
  const [ngActiveChatId, setNgActiveChatId] = useState<number | null>(null);
  const [ngChatTitle, setNgChatTitle] = useState<string>("");
  const isNicegram = activeCategory === "nicegram";

  const handleSelectChat = useCallback((chatId: number) => {
    setNgActiveChatId(chatId);
    setNgChatTitle(Chat #);
  }, []);

  const handleBack = useCallback(() => {
    setNgActiveChatId(null);
    setNgChatTitle("");
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden" style={{ backgroundColor: "#0a0a0f" }}>
      {/* 式式 Ambient background glow (purple radial, top-right) 式式 */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 10%, rgba(139,92,246,0.06) 0%, transparent 70%)," +
            "radial-gradient(ellipse 60% 40% at 10% 80%, rgba(59,130,246,0.04) 0%, transparent 60%)",
        }}
      />

      {/* 式式 Category Icon Sidebar (desktop only) 式式 */}
      <div className="relative z-10">
        <CategorySidebar />
      </div>

      {/* 式式 Main content area 式式 */}
      <div className="relative z-10 flex flex-1 min-w-0 overflow-hidden">
        {/* Left Panel */}
        {isNicegram ? (
          <aside
            className="hidden sm:flex w-[300px] shrink-0 flex-col overflow-hidden glass-panel"
            role="complementary"
            aria-label="Chat list"
          >
            <NicegramDialogList
              activeChatId={ngActiveChatId}
              onSelectChat={handleSelectChat}
            />
          </aside>
        ) : showLeftPanel && leftPanel ? (
          <aside
            className="hidden sm:flex w-[300px] shrink-0 flex-col overflow-hidden glass-panel"
            role="complementary"
            aria-label="Left panel"
          >
            {leftPanel}
          </aside>
        ) : null}

        {/* Center Panel (main content) */}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {isNicegram && ngActiveChatId ? (
            <NicegramChatView
              accountId="0"
              chatId={ngActiveChatId}
              chatTitle={ngChatTitle}
              onBack={handleBack}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 overflow-y-auto px-6 py-6"
                style={{
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Right Panel ? glass with purple left border */}
        {isNicegram ? (
          <aside
            className="hidden sm:flex w-[320px] shrink-0 flex-col overflow-hidden glass-panel"
            role="complementary"
            aria-label="AI Assistant"
          >
            <AiAssistantPanel chatTitle={ngChatTitle || undefined} />
          </aside>
        ) : showRightPanel && rightPanel ? (
          <aside
            className="hidden sm:flex w-[320px] shrink-0 flex-col overflow-hidden glass-panel"
            role="complementary"
            aria-label="Right panel"
          >
            {rightPanel}
          </aside>
        ) : null}
      </div>

      {/* 式式 Mobile Bottom Tab Bar (glass) 式式 */}
      <div className="relative z-20 sm:hidden">
        <MobileCategoryBar />
      </div>
    </div>
  );
}
