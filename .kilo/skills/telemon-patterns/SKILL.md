---
name: telemon-patterns
description: TeleMon development conventions, anti-patterns, and mandatory rules for all agents
---
# TeleMon Development Patterns

## Mandatory Rules (from AGENTS.md)
1. NEVER develop in main repo — always create git worktree
2. NEVER push directly to master — use release worktree
3. ALWAYS run `npm run build` before committing
4. Check `.kilo/PAUSE` before starting

## File Naming
- Components: PascalCase.tsx in `src/components/`
- Hooks: `use*.ts` in `src/hooks/`
- Store: `use*Store.ts` in `src/store/`
- Lib utilities: camelCase.ts in `src/lib/`
- API: `src/lib/api.ts` (monolith, avoid adding unless needed)
- Types: `src/types/index.ts`

## Common Mistakes (DO NOT)
1. JSX in `.ts` files — must use `.tsx`
2. `@tma.js/sdk-react` static imports — use lazy import with try/catch
3. `localStorage` without try/catch in mini app code
4. `Badge` with `onClick` — wrap in `<button>`
5. `Panel` with `onTouch*` — wrap in `<div>`
6. Hand-written Alembic revision IDs — always `--autogenerate`
7. `.tsx` generic arrow without trailing comma: `<T,>(x: T) =>`
8. Force-push or `--no-verify` without explicit user request

## Import Order
1. React/Next.js
2. Third-party (framer-motion, lucide-react, zustand)
3. UI components (`@/components/ui/`)
4. Workspace components (`@/components/workspace/`)
5. Store (`@/store/`)
6. Lib (`@/lib/`)
7. Types (`@/types/`)
8. Styles

## CSS Patterns
- Use Tailwind v4 tokens: `bg-app-bg`, `text-app-text`, `border-app-border`
- Mobile: `max-sm:` for mobile-first, `sm:` for desktop breakpoint
- Safe area: `env(safe-area-inset-bottom)` always included in mobile components
- Touch targets: minimum 44px (`min-h-11 min-w-11`)
- Dark mode: `data-theme="dark"` attribute, use `dark:` prefix
