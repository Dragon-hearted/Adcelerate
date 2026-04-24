# Adcelerate Design System

Single source of truth for tokens, adapters, and brand context across all surfaces.

## What's here

| File | Purpose |
|---|---|
| `tokens.css` | Master CSS custom properties — all 12 themes, type scale, spacing, radii, motion |
| `tokens.ts` | TypeScript mirror — typed `themes`, `fontFamilies`, `textScale`, `spacing`, `radii`, `motion`, `appHashColors` |
| `adapters/svg.ts` | Drop-in replacement for `readme-engine` SVG design-tokens |
| `adapters/remotion.ts` | COLORS + FONT + theme variants for Remotion compositions |
| `adapters/chalk.ts` | Chalk hex wrappers + `caption()` helper for pinboard TUI |
| `adapters/ai-brand.ts` | `brandContextPrompt()` — multiline AI image-gen context string |
| `adapters/pdf.ts` | react-pdf Font + StyleSheet (peer-dep: `@react-pdf/renderer`) |
| `adapters/gif.ts` | Remotion composition constants — sizes, fps, motion timings |
| `preview/index.html` | Static 12-card theme preview — open in browser, no build needed |

## Token sources

All values originate from `adcelerate-design-system/project/colors_and_type.css`.
The 9 non-DS themes (modern, earth, glass, high-contrast, dark-blue, colorblind-friendly, ocean,
sunset-orange, mint-fresh) are copied verbatim from `apps/client/src/styles/themes.css` so the
dashboard retains all 12 themes after migration.

## Consumer trail

```
apps/client/
  src/styles/themes.css  →  replace with symlink / import to design-system/tokens.css
  src/types/theme.ts     →  import ThemeColors from design-system/tokens.ts

systems/*/               →  copy via `just sync-design` into vendor/design-system/
  readme-engine          →  adapters/svg.ts replaces src/renderers/svg/design-tokens.ts
  pinboard/tui           →  adapters/chalk.ts replaces tui/src/theme.ts
  pinboard/demo          →  adapters/remotion.ts replaces demo/src/theme.ts
  scene-board            →  adapters/ai-brand.ts → brandContextPrompt() in skill handler
  image-engine           →  adapters/ai-brand.ts → --brand flag context injection
  pdf-kit (future)       →  adapters/pdf.ts
  gif-kit (future)       →  adapters/gif.ts + adapters/remotion.ts
```

## Voice rules summary

- Terse, imperative, CLI-help-style. Third-person task framing.
- No marketing fluff. No exclamation points. No "we" / "you".
- Emoji are load-bearing (README headers, event chips, sign-offs) — not decorative.
- Casing: `kebab-case` skill IDs, `CamelCase` system names, sentence-case UI labels,
  `PascalCase` event types (`PreToolUse`, `SubagentStart`).

## Theme rename

`light` → `paper`. The dashboard localStorage migration maps `"light"` → `"paper"` on load.
No `.theme-light` class exists in `tokens.css` — use `.theme-paper`.
