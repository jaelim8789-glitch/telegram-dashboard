import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1", className)} data-value={value} data-onchange={""}>
      {children}
    </div>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return <div className={cn("flex gap-1 rounded-lg bg-app-border/20 p-1", className)}>{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const parent = (e.currentTarget.closest("[data-value]") as HTMLElement);
        if (parent) parent.dataset.value = value;
      }}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        "data-[selected=true]:bg-app-card data-[selected=true]:shadow-sm",
        "text-app-text-muted hover:text-app-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  return <div className={cn("mt-2", className)}>{children}</div>;
}
