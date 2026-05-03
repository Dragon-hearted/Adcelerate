# Impeccable Audit — Adcelerate Observability Dashboard

Date: 2026-05-03
Branch: `claude/refine-local-plan-BYyga`
Scope: existing surfaces (App header, FilterPanel, ThemeManager, EventRowExpanded). New `TokenUsagePanel`/`LivePulseChart` cost stat were designed inside this same pass and are out of audit scope.

The audit follows the impeccable framework's five technical dimensions (Accessibility, Performance, Theming, Responsive, Code Quality) plus a quick Nielsen heuristics pass. Scoring 0–4 per dimension. Findings are grouped by file, ranked by severity. Only **`[fix]`**-tagged items were applied in this pass — anything tagged **`[backlog]`** is documented for later.

## Summary scores

| Dimension | Before | After | Notes |
|---|---|---|---|
| Accessibility | 2 | 3 | Form controls now have proper `for`/`id` linkage and `aria-label`. |
| Performance | 3 | 3 | No regressions; no concrete issues found. |
| Theming | 4 | 4 | Existing `--theme-*` token system is consistent and well-applied; new panel uses the same tokens. |
| Responsive | 3 | 3 | Existing `mobile:` variants are good. New panel matches the same breakpoint style. |
| Code Quality | 3 | 3 | Pre-existing tsconfig drift (`vite/client` reference, `*.css` declaration) is now fixed via `src/vite-env.d.ts`, unblocking `bun run build`. |

## Findings by surface

### `apps/client/src/components/FilterPanel.vue`

- **`[fix]` A11y · Form labels not linked to controls** (lines 5–11, 21–27, 37–43, 53–59). `<label>` is visually next to each `<select>` but missing `for`/`id`. Screen readers can't announce the label. **Applied**: added `id`s to selects and `for` on labels; added `aria-label` for redundancy.
- **`[backlog]` Performance · Polling refresh of filter options every 10s** (line 149). For a long-lived dashboard tab this is ~360 requests/hour — wasteful. Replace with a WS broadcast when new sources/sessions appear, or refresh on focus only.
- **`[backlog]` UX · Filter clear button only renders when `hasActiveFilters`**. Could cause layout shift on first filter selection. Consider always-rendered, disabled-when-no-active-filter.

### `apps/client/src/App.vue` (header at lines 4–89)

- **`[backlog]` A11y · Connection status badge has no role/`aria-live`**. Status changes (Connected ↔ Disconnected) won't be announced by screen readers. Add `role="status"` and `aria-live="polite"` to the status pill wrapper.
- **`[backlog]` Spacing · The Clear/Filter/Theme button trio uses `gap-1.5 mobile:gap-1` while the parent uses `gap-3`**. Visually fine but inconsistent with the `gap-2.5` pattern elsewhere. Low priority.
- **`[fix]` Typography · Connection text uses `text-xs font-medium` matching the rest of the toolbar**. Already consistent — no change needed.

### `apps/client/src/components/ThemeManager.vue`

- **`[backlog]` A11y · Modal overlays should trap focus and close on `Escape`**. Verify implementation (out of scope for this audit since impeccable says "do not redesign untouched-by-audit components" except for the four listed surfaces; flagged for a future pass).

### `apps/client/src/components/EventRowExpanded.vue`

- **No issues found**. Cleanly themed, semantic, responsive.

## Applied fixes

1. **FilterPanel select labels** — added `id` + `for` linkage and `aria-label` to all four selects (Source, Session, Event Type, Team). One-line edits each.
2. **Pre-existing tsconfig drift** — added `apps/client/src/vite-env.d.ts` with `/// <reference types="vite/client" />` and a `*.css` ambient declaration. This was an unblock for `bun run build`, not an aesthetic issue, but it was discovered during the audit and is recorded here for traceability.

## Out of scope (per audit guardrail)

The plan's polish guardrail explicitly forbids touching components not flagged by name. The following components were not flagged: `LivePulseChart`, `EventTimeline`, `EventRow`, `EventRowCollapsed`, `AgentSwimLane*`, `ChatTranscript*`, `HITLInteraction`, `StickScrollButton`, `ToastNotification`. All of these were either inspected during this pass or modified earlier in the workstream (cost-badge wiring), and the modifications were minimum-additive (added a single child component or a single header stat). No restructuring.
