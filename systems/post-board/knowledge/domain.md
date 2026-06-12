---
system: "post-board"
type: domain
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# Domain Knowledge — post-board

## Core Domain
On-brand **social creative production** (Instagram/Facebook/LinkedIn posts & carousels) for the **Dragonhearted Labs** personal brand. The key concept is that the deliverable is an **editable DOM/CSS document**, not a flat render: each slide is a fixed-pixel HTML "stage" containing absolutely-positioned **layers** (`text`, `image`, `element`, `logo`), each with `x,y,w,h,rotation,z` plus type-specific props. The **brand system is the law** — fonts, palette, brand elements, logo rules, and the riso/ink-bleed treatment system all come from `client/dragonhearted_labs/brand-identity/brand.json` (v2.0.0, light-first). The editor's job is to make on-brand output the *only* output the operator can produce.

Format presets (1080px wide): `ig-4x5` (1080×1350), `ig-1x1` (1080×1080), `story-9x16` (1080×1920), `linkedin-4x5` (1080×1350).

## Process Knowledge
1. **Load brand** — `brand-loader.ts` reads `brand.json`, resolves font files to base64 `@font-face` CSS, and emits a normalized token bundle (`palette`, `fonts`, `styleModes`, `elements`, `logo`, riso rules, `voice`, `positioning`). Missing optional assets are tolerated.
2. **Generate copy** — the `/post-board` skill drives `copywriting`/`ad-creative`/`social-content`/`marketing-psychology` to produce the cover hook, body-slide copy, and CTA in brand voice, mapped into Project `slides[].layers[]` per the copy contract (`copy-contract.ts`).
3. **Seed project** — `seed.ts` builds a populated draft `Project` (chosen format + style mode + slides with layers), persisted via `project.ts` to `client/dragonhearted_labs/post-board/<id>/project.json`.
4. **Cover** — default is a CSS riso composition with editable text. Optionally `cover-prompt.ts` composes a Higgsfield GPT-Image-2 background prompt (PromptWriter methodology) and `cover.ts`/`image-client.ts` fetch it through ImageEngine (`:3002`), dropping the image *behind* still-editable text.
5. **Edit** — the served SPA renders layers as DOM nodes; `moveable` + `selecto` provide drag/resize/rotate; text layers are `contenteditable`; the inspector restricts fonts/colors/treatments to brand tokens. Autosave → `PUT /api/projects/:id`.
6. **Export** — `export.ts` headlessly screenshots each slide stage at exact pixel size (elevated `deviceScaleFactor`) → `slide-NN.png`; `pdf-lib` assembles `carousel.pdf`.

## Quality Signals
- **Brand fidelity is the bar.** Output must use only brand fonts (Neue Machina display, IBM Plex Mono labels, Inter fallback) and the brand palette. The light-first retro-white canvas with **always-on texture** is mandatory — flat white is off-brand.
- The **cover is the most important slide** — it must be catchy and stop the scroll while staying on-brand.
- Riso/ink-bleed treatments must render faithfully (SVG `feTurbulence`/`feDisplacementMap`, texture-field multiply overlays, halftone) and survive headless export.
- Logo must obey the **Graphite-container rule**; **body text stays "clean"** (no bleed) per `brand.json` `typography[].treatment`.
- Exported PNGs must be **exactly** the preset's pixel dimensions.

## Edge Cases & Gotchas
- **ImageEngine (`:3002`) down** → cover-generation must surface a clear message and keep the CSS cover path fully working (never hard-fail the flow). The CSS cover is always the safe default.
- **Fonts in headless export** — Playwright must wait for `@font-face`/textures to load before screenshotting or type/riso renders wrong.
- **Neue Machina licensing** — "Free for Personal Use"; fine for personal-brand organic, but flag before any paid-media use.
- **`client/` is gitignored** — all project outputs are private and never committed.
- **Brand guardrails are preventive** — the editor must *disallow* non-brand fonts/colors rather than merely discourage them.

## Tacit Expertise
- PostBoard deliberately clones SceneBoard's shape (skill-driven system + runnable engine) but swaps "one flat composite image" for an **editable DOM/CSS editor** — chosen because CSS/SVG reproduce riso/ink-bleed far better than canvas and keep everything editable post-generation.
- `image-client.ts` is a near-verbatim port from SceneBoard; ImageEngine is the cover-background transport (Higgsfield GPT Image 2 default → gemini fallback), never a hard dependency.
- v1 scope is **Dragonhearted Labs + the four presets**; reading any `client/<slug>/brand.json` is a natural follow-up, not required for acceptance.
- The precedent hand-built file `client/dragonhearted_labs/lead-magnets/build-systems-breakdown/index.html` is the source the editor's `brand.css` (`@font-face` + canonical-token CSS) was mined from.
