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

export function MobileCategoryBar() {
  const activeCategory = useCategoryStore((s) => s.activeCategory);
  const setCategory = useCategoryStore((s) => s.setCategory);

  const handleNavigate = useCallback(
    (id: CategoryId) => {
      setCategory(id);
    },
    [setCategory],
  );

  return (
    <nav
      className="mobile-bottom-bar fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pt-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="navigation"
      aria-label="Mobile category navigation"
    >
      {CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id];
        const isActive = activeCategory === cat.id;
        return (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleNavigate(cat.id)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1 px-2 relative transition-colors"
            title={cat.label}
            aria-label={cat.label}
            aria-current={isActive ? "page" : undefined}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200${
                isActive
                  ? " text-[#8B5CF6] bg-[rgba(139,92,246,0.15)]"
                  : " text-[#686880] hover:text-[#e5e5ec]"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-200${
                  isActive ? " scale-110" : ""
                }`}
              />
            </div>
            {/* Active indicator ? subtle purple glow top edge */}
            {isActive && (
              <motion.span
                layoutId="mobile-category-indicator"
                className="absolute top-0 h-0.5 w-8 rounded-full"
                style={{
                  backgroundColor: "#8B5CF6",
                  boxShadow: "0 0 8px rgba(139,92,246,0.5)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-[8px] font-medium leading-none tracking-wider text-[#686880]">
              {cat.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
