"use client";

import { cn } from "@/lib/cn";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface WidgetGroupProps {
  title: string;
  icon?: React.ReactNode;
  groupKey?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function WidgetGroup({ title, icon, groupKey, defaultOpen = true, children, className }: WidgetGroupProps) {
  return (
    <div className={cn("rounded-xl border border-app-border/60 bg-app-card", className)}>
      <CollapsibleSection title={title} icon={icon} groupKey={groupKey} defaultOpen={defaultOpen}>
        {children}
      </CollapsibleSection>
    </div>
  );
}
