---
name: telemon-component
description: TeleMon React component patterns — how to structure, name, and write components
---
# TeleMon Component Patterns

## Component Structure
```tsx
"use client";
import { ... } from "...";
import { cn } from "@/lib/cn";

interface Props { ... }

export function ComponentName({ ... }: Props) {
  // hooks
  const store = useStore();
  
  // handlers
  function handleSubmit() { ... }
  
  // render
  return (
    <div className={cn("base", condition && "conditional")}>
      ...
    </div>
  );
}
```

## UI Components (`src/components/ui/`)
- Generic, reusable: `Button`, `Badge`, `Modal`, `Skeleton`
- Import from `@/components/ui/`
- Use `memo()` for performance

## Workspace Tabs (`src/components/workspace/tabs/`)
- One file per tab: `SendTab.tsx`, `GroupTab.tsx`
- Dynamic import in `Workspace.tsx` TAB_CONTENT
- Must handle: loading, empty, error, edge cases

## Layout Components (`src/components/layout/`)
- `DashboardShell.tsx` — main layout
- `Sidebar.tsx` — account list
- `Header.tsx` — top bar
- `Workspace.tsx` — tab rendering

## Mobile Components
- Prefix `Mobile` or suffix `Sheet`: `MobileSendSheet`, `MobileFab`
- Always include safe-area-inset
- Touch targets >= 44px
- Framer Motion `AnimatePresence` for transitions

## Mini App (`src/app/miniapp/`)
- Separate route: `/miniapp`
- Telegram WebView only — no SSR
- Use `var(--tg-theme-*)` CSS variables
- Never static import `@tma.js/sdk-react`
