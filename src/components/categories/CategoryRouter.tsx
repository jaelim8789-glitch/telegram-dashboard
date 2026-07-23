"use client";

import { useCategoryStore } from "@/store/useCategoryStore";
import { DashboardCategory } from "./DashboardCategory";
import { NicegramCategory } from "./NicegramCategory";
import { SendCategory } from "./SendCategory";
import { MacroCategory } from "./MacroCategory";
import { AnalyticsCategory } from "./AnalyticsCategory";
import { SettingsCategory } from "./SettingsCategory";

function LeftPanel({ category }: { category: string }) {
  switch (category) {
    case "macro":
      return <MacroCategory panel="left" />;
    case "settings":
      return <SettingsCategory panel="left" />;
    default:
      return null;
  }
}

function CenterPanel({ category }: { category: string }) {
  switch (category) {
    case "dashboard":
      return <DashboardCategory panel="center" />;
    case "nicegram":
      return <NicegramCategory panel="center" />;
    case "send":
      return <SendCategory panel="center" />;
    case "macro":
      return <MacroCategory panel="center" />;
    case "analytics":
      return <AnalyticsCategory panel="center" />;
    case "settings":
      return <SettingsCategory panel="center" />;
    default:
      return null;
  }
}

function RightPanel({ category }: { category: string }) {
  switch (category) {
    case "nicegram":
      return <NicegramCategory panel="right" />;
    default:
      return null;
  }
}

export function CategoryRouter({ panel }: { panel: "left" | "center" | "right" }) {
  const category = useCategoryStore((s) => s.activeCategory);
  if (panel === "left") return <LeftPanel category={category} />;
  if (panel === "center") return <CenterPanel category={category} />;
  if (panel === "right") return <RightPanel category={category} />;
  return null;
}
