---
name: adcelerate-design
description: Use this skill to generate well-branded interfaces and assets for Adcelerate, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `preview/`, `ui_kits/observability/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. Pull from:
- `colors_and_type.css` — the 12 themes, type scale, semantic CSS vars. Default to **dark** theme.
- `ui_kits/observability/` — pixel-close React recreations of header, filter panel, live pulse chart, event row, HITL card, and theme manager.
- `assets/hero.svg` and `assets/platform-overview.svg` — brand marks (dark-background only).
- `assets/pixel_avatar.png` — personal mark.

If working on production code, you can copy assets and read the rules in `README.md` (content voice, visual foundations, iconography) to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

**Quick brand reminders for Adcelerate:**
- Voice: terse, imperative, CLI-help-style. Third-person task framing. No marketing fluff.
- Emoji: load-bearing, not decorative. Used in README headers, event/tool chips, sign-offs — not button labels.
- Icons: inline Heroicons-style SVGs (stroke 1.5–2, 24×24, currentColor).
- Imagery: animated SVG diagrams (hub-and-spoke glow) and a pixel-art avatar. No photography.
- Density: tight — 4px Tailwind base, 12–16px card padding, 6px/8px radii.
- Colors: indigo `#6366F1` primary for brand, `dark` theme (`#111827` bg) for dashboards, `midnight-purple` for brand mark.
