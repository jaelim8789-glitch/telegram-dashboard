# TeleMon UI Foundation

Shared primitives consumed by every page/tab. Tokens live in
`src/app/globals.css`; components live in this directory.

## Color tokens

Single accent, TeleMon orange (`--accent` / `app-primary`). Don't introduce a
second brand color — if a page needs visual variety (e.g. multiple stat
cards), prefer neutral cards with one accent, not a different gradient per
card.

| Tailwind class | Use for |
|---|---|
| `bg-app-bg` / `text-app-text` | Page background / primary text |
| `bg-app-card`, `bg-app-card-hover` | Card/panel surfaces |
| `border-app-border`, `border-app-border-strong` | Default / emphasized borders |
| `text-app-text-secondary` / `-muted` / `-subtle` | Decreasing text emphasis |
| `bg-app-primary`, `text-app-primary`, `bg-app-primary-muted` | Brand accent (orange) |
| `bg-app-success` / `-warning` / `-danger` / `-info` (+ `-muted`) | Semantic status only — pick by *meaning*, not by "which color looks nice here" |

`info` (cyan) and `primary` (orange) are deliberately different colors now —
don't use `primary` for informational/neutral status badges.

Legacy CSS-class components (`.btn-primary`, `.btn-secondary`, `.input-premium`,
`.badge-premium`, `.tab-premium`, `.card-premium`) still exist in
`globals.css` for the public/marketing and login pages and already read from
the same `:root` tokens. They're migration debt, not a second design system —
new pages should use the React components below instead. `.card-premium`,
`.badge-premium`, and the `hero-orb-2`/`hero-orb-3` decorations still use a
purple/cyan accent independent of `--accent`; that's a page-level brand
decision for whoever owns the public pages, not changed here.

## Components

- **Button** — `variant`: `primary | secondary | ghost | danger`. `size`:
  `sm | md | lg` (defaults to `md`, matching the original single size).
  `loading` shows a spinner + `aria-busy` and implies `disabled`.
- **Badge** — `tone`: `neutral | success | warning | danger | info`.
- **Field / Input / Textarea / Select** — `Field` wraps a label + optional
  `hint` or `error` (error takes priority, announced via `role="alert"`).
  `Input`/`Textarea`/`Select` accept `invalid` for the matching danger
  border + `aria-invalid`.
- **SearchInput** — icon-prefixed input, same focus/disabled treatment as Field.
- **Panel** — bordered section with optional `title` (string or node, e.g.
  icon + label), `description`, `action` slot.
- **Card** — interactive (button) or static (div) surface, `selected` state.
- **Badge / Skeleton / EmptyState / Toggle** — unchanged API, accessibility
  touch-ups only (see below).
- **InlineError** — standard danger-toned error box: `title?`, message via
  children, optional `action` (e.g. a retry button). `role="alert"`.
- **Table / TableHeader / TableBody / TableRow / TableHead / TableCell /
  TableEmptyState** — composable, no sorting/pagination/virtualization.
  `Table` handles horizontal overflow; `TableEmptyState` spans the full row
  via `colSpan` and reuses `EmptyState`.
- **Modal** — controlled (`open`, `onClose`) portal dialog. `title`,
  `description`, `children` (scrollable body), `footer`, `size`
  (`sm | md | lg`), `preventClose` (blocks Escape/backdrop/× while a pending
  action is in flight). Focus-trapped, restores focus on close, locks body
  scroll, ARIA `dialog`/`aria-modal`/`aria-labelledby`/`aria-describedby`.
- **ConfirmDialog** — built on `Modal`. `open`, `title`, `description`,
  `confirmLabel`, `cancelLabel`, `variant` (`default | danger`), `onConfirm`
  (may return a `Promise` — dialog shows a loading state and blocks dismissal
  until it resolves), `onCancel`. Use this instead of `window.confirm`.

## Loading / error / empty presentation

- **Loading**: `<Skeleton />` shapes matching the content that will appear.
  (`aria-hidden` — if a screen-reader announcement is needed, wrap the
  loading section itself in one `aria-live`/`aria-busy` region rather than
  putting it on every Skeleton.)
- **Error**: `<InlineError>` instead of ad hoc danger `<p>`/`<div>` blocks.
- **Empty**: `<EmptyState icon title description? action?}` (or
  `<TableEmptyState>` inside a table body).

## Accessibility notes

- Interactive elements that shouldn't show a ring on mouse click (buttons,
  toggle, interactive Card) use the shared `.focus-ring` CSS class
  (`:focus-visible` only). Text inputs keep their existing always-on focus
  ring, which is the expected pattern for fields.
- None of the above has been run through an automated contrast/WCAG checker —
  treat these as verified-by-inspection fixes (missing focus states, ARIA
  roles, disabled semantics), not a compliance guarantee.
