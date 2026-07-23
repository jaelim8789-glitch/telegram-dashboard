# ADR 002: Three-Panel Workspace Layout

**Date:** 2026-07-23
**Status:** Accepted

## Context
Dashboard needs to show account list, workspace tabs (41+), and contextual detail panels simultaneously.

## Decision
Three-panel layout: left sidebar (categories) → center (tab content) → right (contextual inspector).

## Consequences
- **Positive:** Familiar IDE-like UX; panel transitions feel fluid; inspector can show context without navigation
- **Negative:** Complex state management across three panels; mobile requires full-screen mode per panel
- **Mitigation:** Mobile uses single-panel mode with bottom nav; CategoryRouter centralizes tab registration

## Alternatives Considered
- **Single page per feature:** Cleaner routing but loses multi-panel context
- **Tabbed single panel:** Simpler but cannot show inspector alongside content
