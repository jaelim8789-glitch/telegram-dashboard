"use client";

import { DashboardTab } from "@/components/workspace/tabs/DashboardTab";
import { Panel } from "@/components/ui/Panel";

export function DashboardCategory({ panel }: { panel: "left" | "center" | "right" }) {
  if (panel !== "center") return null;
  return (
    <div className="p-4">
      <DashboardTab />
    </div>
  );
}
