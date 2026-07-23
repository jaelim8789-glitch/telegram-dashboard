"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Send,
  Workflow,
  BarChart3,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronUp,
} from "lucide-react";
import { useCategoryStore, type CategoryId, CATEGORIES } from "@/store/useCategoryStore";

const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  nicegram: MessageSquare,
  send: Send,
  macro: Workflow,
  analytics: BarChart3,
  settings: Settings,
  "ai-chat": Sparkles,
};

export function CategorySidebar() {
  const activeCategory = useCategoryStore((s) => s.activeCategory);
  const setCategory = useCategoryStore((s) => s.setCategory);

  const handleNavigate = useCallback(
    (id: CategoryId) => {
      setCategory(id);
    },
    [setCategory],
  );

  return (
    <aside className="hidden sm:flex w-16 shrink-0 flex-col items-center glass-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-center pt-5 pb-6">
        <motion.button
          type="button"
          onClick={() => handleNavigate("dashboard")}
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title="TeleMon Home"
          aria-label="Go to dashboard"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </motion.button>
      </div>

      {/* Glass divider */}
      <div className="w-8 h-px mb-4 glass-divider" />

      {/* Category icons */}
      <nav className="flex flex-col items-center gap-1" role="navigation" aria-label="Category navigation">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isActive = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate(cat.id)}
              className={`sidebar-icon-btn${isActive ? " active" : ""}`}
              title={cat.tooltip}
              aria-label={cat.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {/* Active indicator ? purple dot on the right */}
              {isActive && (
                <motion.span
                  layoutId="category-active-indicator"
                  className="absolute -right-[1px] top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full"
                  style={{ backgroundColor: "#8B5CF6", boxShadow: "0 0 6px rgba(139,92,246,0.6)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {/* Tooltip on hover (desktop only) */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-[rgba(10,10,15,0.92)] backdrop-blur-xl px-2.5 py-1.5 text-[11px] font-medium text-[#e5e5ec] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-[rgba(139,92,246,0.15)]">
                {cat.tooltip}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Glass divider */}
      <div className="w-8 h-px mb-3 glass-divider" />

      {/* Bottom section: workspace/status */}
      <div className="flex flex-col items-center gap-3 pb-4">
        {/* AI status indicator */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[9px] font-medium text-[#686880] whitespace-nowrap">
              AI ON
            </span>
          </div>
          <span className="text-[8px] text-[#484860]">124 processed</span>
        </div>

        {/* Workspace toggle */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="sidebar-icon-btn"
          title="Workspace"
          aria-label="Toggle workspace"
        >
          <ChevronUp className="h-4 w-4 rotate-45" />
        </motion.button>

        {/* Pixel Office link */}
        <a
          href="https://pixeloffice.co"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-icon-btn"
          title="Pixel Office"
          aria-label="Open Pixel Office"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Open button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center h-8 w-8 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.10))",
            border: "1px solid rgba(139,92,246,0.20)",
          }}
          title="Open"
          aria-label="Open"
        >
          <span className="text-[8px] font-semibold text-[#8B5CF6] tracking-wider">?K</span>
        </motion.button>
      </div>
    </aside>
  );
}
