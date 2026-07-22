"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface WidgetGroupProps {
  title: ReactNode;
  icon?: ReactNode;
  groupKey: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function WidgetGroup({ title, icon, groupKey, defaultOpen = true, children, className }: WidgetGroupProps) {
  return (
    <CollapsibleSection groupKey={groupKey} defaultOpen={defaultOpen} icon={icon} title={title} className={cn("widget-group", className)}>
      {children}
    </CollapsibleSection>
  );
}
