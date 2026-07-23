"use client";

import { useCategoryStore, type CategoryId } from "@/store/useCategoryStore";

interface PanelVisibility {
  showLeftPanel: boolean;
  showCenterPanel: boolean;
  showRightPanel: boolean;
}

const PANEL_VISIBILITY: Record<CategoryId, PanelVisibility> = {
  dashboard: { showLeftPanel: false, showCenterPanel: true, showRightPanel: false },
  nicegram: { showLeftPanel: true, showCenterPanel: true, showRightPanel: true },
  send: { showLeftPanel: false, showCenterPanel: true, showRightPanel: false },
  macro: { showLeftPanel: true, showCenterPanel: true, showRightPanel: false },
  analytics: { showLeftPanel: false, showCenterPanel: true, showRightPanel: false },
  settings: { showLeftPanel: true, showCenterPanel: true, showRightPanel: false },
  "ai-chat": { showLeftPanel: false, showCenterPanel: true, showRightPanel: false },
};

export function usePanelVisibility(): PanelVisibility {
  const activeCategory = useCategoryStore((s) => s.activeCategory);
  return PANEL_VISIBILITY[activeCategory];
}
