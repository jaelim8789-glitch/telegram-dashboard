"use client";

import type { TabGroup } from "@/types";
import { DashboardOverview } from "./categories/DashboardOverview";
import { SendHub } from "./categories/SendHub";
import { OpsHub } from "./categories/OpsHub";
import { AiHub } from "./categories/AiHub";
import { SettingsHub } from "./categories/SettingsHub";

export function CategoryDashboard({ category }: { category: TabGroup }) {
  switch (category) {
    case "dashboard":
      return <DashboardOverview />;
    case "send":
      return <SendHub />;
    case "ops":
      return <OpsHub />;
    case "ai":
      return <AiHub />;
    case "settings":
      return <SettingsHub />;
    case "new":
      return (
        <div className="flex flex-col items-center justify-center py-16 text-app-text-muted">
          <p className="text-sm font-medium">준비 중인 기능</p>
          <p className="text-xs mt-1">곧 새로운 기능이 추가됩니다</p>
        </div>
      );
    default:
      return null;
  }
}
