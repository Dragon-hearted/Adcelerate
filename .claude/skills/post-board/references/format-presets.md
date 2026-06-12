# Format Presets & Platform Guidance

PostBoard pins one fixed-pixel preset per project (`project.format = { preset, width, height }`). The editor stage and headless export both render at these exact post-ready dimensions. Source of truth: `systems/post-board/src/formats.ts`.

## The 4 Presets

| Preset id | Label | Pixels | Aspect | Default platform | Notes |
|---|---|---|---|---|---|
| `ig-4x5` | Instagram 4:5 Portrait | **1080×1350** | 4:5 | **Instagram feed (default)** | Tallest allowed feed crop — maximum scroll real estate. Best default for carousels + single feed posts. |
| `ig-1x1` | Instagram 1:1 Square | **1080×1080** | 1:1 | Instagram feed (grid) | Square; safest for grid-consistent sets and cross-posting. Slightly less vertical presence than 4:5. |
| `story-9x16` | Story / Reel 9:16 | **1080×1920** | 9:16 | Stories, Reel covers | Full-screen vertical. Keep key content in the central safe zone (avoid top ~250px / bottom ~250px UI chrome). |
| `linkedin-4x5` | LinkedIn 4:5 Portrait | **1080×1350** | 4:5 | LinkedIn feed + document carousel | Same pixels as `ig-4x5`; use for LinkedIn document/carousel posts and portrait feed. |

`DEFAULT_FORMAT_ID` is `ig-4x5`.

## Choosing a Preset

1. **Platform named in the brief?** Map it:
   - Instagram feed / carousel → `ig-4x5` (or `ig-1x1` if the user wants square).
   - Instagram Story / Reel cover → `story-9x16`.
   - LinkedIn → `linkedin-4x5`.
2. **No platform named?** Default to `ig-4x5` and confirm at the Format gate.
3. **Cross-posting IG + LinkedIn?** `ig-4x5` and `linkedin-4x5` share 1080×1350 — one render serves both.

## Pixel-Discipline Notes

- All presets are 1080px wide — type sizes in the templates are fractions of width, so copy scales consistently across presets.
- `story-9x16` is much taller (1920px): the cover hook has more vertical room, but respect platform UI safe zones.
- The cover-background generator (`generate-cover`) maps the preset to the nearest ImageEngine aspect ratio automatically (`4:5`, `1:1`, `9:16`).

## Carousel Length

- Default carousel ≈ **cover + 3–5 body slides + CTA** (5–7 total).
- Instagram allows up to 10 (now 20) slides; LinkedIn documents allow more — but momentum dies after ~7. Prefer fewer, stronger slides.
- One idea per slide. If a slide needs two thoughts, split it.
