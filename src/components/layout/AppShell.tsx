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
 */

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategorySidebar } from "@/components/layout/CategorySidebar";
import { MobileCategoryBar } from "@/components/layout/MobileCategoryBar";
import { useCategoryStore } from "@/store/useCategoryStore";
import { usePanelVisibility } from "@/hooks/usePanelVisibility";
import { cn } from "@/lib/cn";

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

  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg">
      {/* ── Category Icon Sidebar (desktop only) ── */}
      <CategorySidebar />

      {/* ── Main content area ── */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Left Panel (category-specific list) */}
        {showLeftPanel && leftPanel && (
          <aside
            className="hidden sm:flex w-[300px] shrink-0 flex-col border-r border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="왼쪽 패널"
          >
            {leftPanel}
          </aside>
        )}

        {/* Center Panel (main content) */}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
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
        </main>

        {/* Right Panel (AI assistant — nicegram only) */}
        {showRightPanel && rightPanel && (
          <aside
            className="hidden sm:flex w-[350px] shrink-0 flex-col border-l border-app-border bg-app-surface overflow-hidden"
            role="complementary"
            aria-label="오른쪽 패널"
          >
            {rightPanel}
          </aside>
        )}
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <MobileCategoryBar />
    </div>
  );
}