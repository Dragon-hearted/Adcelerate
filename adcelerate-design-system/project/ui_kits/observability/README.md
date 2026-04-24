# Observability UI Kit

Pixel-perfect-ish recreation of the **Multi-Agent Observability** dashboard from `apps/client/` in the Adcelerate repo.

## Files

- `index.html` — Entry point. Loads React + Babel, renders the full dashboard.
- `App.jsx` — Root, header + layout.
- `Header.jsx` — Logo, title, connection badge, toolbar.
- `FilterPanel.jsx` — Source-app / session / event-type filters.
- `LivePulseChart.jsx` — Bar chart of events over time, time-range selector, app legend.
- `EventTimeline.jsx` — Scrollable event stream.
- `EventRow.jsx` — One row: left-accent bar, badges, tool info, timestamp.
- `HITLCard.jsx` — Human-in-the-loop approve/deny card.
- `ThemeManager.jsx` — Theme modal.
- `Icons.jsx` — Heroicons-style inline SVG set.
- `mockData.js` — Static sample events + app color hashing.

## Interactions (click-through)

- Clear button → removes all events; new events stream back in.
- Filters toggle → shows/hides filter panel.
- Theme toggle → opens theme picker modal; pick any theme to recolor everything live.
- Event row click → expand/collapse (shows payload JSON).
- Approve/Deny on the HITL card → resolves it (border turns green/red, buttons disappear).
- Time range pills (1m / 3m / 5m) → swap pulse chart window.

## Notes

- Colors, radii, and spacing mirror `themes.css` → `dark` theme with indigo primary.
- Icons are the exact `<svg>` definitions lifted from `App.vue` and `EventRowCollapsed.vue`.
- Emoji for events/tools use the mapping from `composables/useEventEmojis.ts`.
- Source-app hue is hashed deterministically from the app name (`useEventColors.ts`).
