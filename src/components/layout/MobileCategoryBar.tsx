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
} from "lucide-react";
import { useCategoryStore, type CategoryId, CATEGORIES } from "@/store/useCategoryStore";
import { cn } from "@/lib/cn";

const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  nicegram: MessageSquare,
  send: Send,
  macro: Workflow,
  analytics: BarChart3,
  settings: Settings,
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
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-app-border bg-app-surface/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="navigation"
      aria-label="모바일 카테고리 탐색"
    >
      {CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id];
        const isActive = activeCategory === cat.id;
        return (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleNavigate(cat.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1.5 px-2 transition-colors relative",
              isActive
                ? "text-app-primary"
                : "text-app-text-muted hover:text-app-text",
            )}
            title={cat.label}
            aria-label={cat.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110",
              )}
            />
            {/* Active indicator dot */}
            {isActive && (
              <motion.span
                layoutId="mobile-category-indicator"
                className="absolute -top-0.5 h-1 w-4 rounded-full"
                style={{ backgroundColor: "#8B5CF6" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-[9px] font-medium leading-none">{cat.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}