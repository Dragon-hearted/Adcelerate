---
system: "post-board"
type: acceptance-criteria
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# Acceptance Criteria — post-board

## Hard Gates
_Binary pass/fail criteria. ALL must pass for output to be considered valid._

- [ ] `bun install` succeeds and `bunx tsc --noEmit` typechecks clean.
- [ ] `bun run lint` (Biome) passes and `bun test` is green (brand-loader, project round-trip, cover-prompt, presets, export dims).
- [ ] `post-board serve` boots a Hono server; `GET /api/brand` returns the brand token bundle + font `@font-face` CSS derived from `brand.json`; `GET /editor` loads (HTTP 200) with brand fonts served.
- [ ] Editor enforces **brand-only choices**: fonts limited to brand fonts/weights, colors limited to the brand palette; non-brand fonts/colors cannot be selected.
- [ ] Layers can be selected/moved/resized/rotated, text edited inline; slides added/reordered/deleted; brand elements dragged; an uploaded image attached; format presets switched — with changes **autosaved** to `project.json` and **restored on reload**.
- [ ] A cover renders as a CSS riso composition **and** can have a Higgsfield-generated background swapped in via one click, with cover text remaining editable on top.
- [ ] When ImageEngine (`:3002`) is unavailable, cover generation surfaces a clear message and the CSS cover path keeps working (no hard failure).
- [ ] `post-board export --pdf` produces **one PNG per slide at exactly the preset's pixel dimensions** plus a combined `carousel.pdf`, in `client/dragonhearted_labs/post-board/<project>/`.
- [ ] Copy for posts/carousels is generated via the best copy skills and lands in the Project as editable layers reflecting brand voice/positioning.
- [ ] `/post-board` skill is discoverable and drives the approval-gated flow end-to-end.
- [ ] `post-board` is registered in `systems.yaml` and `knowledge/graph.yaml`; `just systems-validate` and `just systems-health` pass.

## Soft Criteria
_Quality guidance for human judgment at approval gates. Surfaced to the engineer for review._

### Cover Catchiness
The cover is the scroll-stopper. **Good** = a hook that earns the tap, hierarchy that reads in under a second, and a composition that feels designed (not templated). The headline should use brand display type with intent, and any generated background must **support** the text, never fight it. Weak covers bury the hook, over-crowd the frame, or rely on a generic background.

### On-Brand Rendering
Output should be unmistakably Dragonhearted Labs: **light-first retro-white canvas with always-on texture** (never flat white), correct brand fonts (Neue Machina display, IBM Plex Mono labels, Inter fallback), palette-only color, faithful **riso/ink-bleed** treatments, the logo honoring its **Graphite-container rule**, and **body text kept clean** (no bleed). Off-brand tells: flat-white backgrounds, non-brand fonts/colors, bleed applied to body copy, or a logo without its required container.

### Editor Fluidity & Persistence
Editing should feel direct and safe: drag/resize/rotate are responsive, inline text edits are obvious, and **autosave reliably round-trips** so a reload restores the exact state. Brand guardrails should feel like rails, not roadblocks — the operator is steered toward on-brand choices without friction.

### Export Crispness
Exported PNGs match preset pixels exactly and stay **crisp** — riso textures and type render sharply (elevated `deviceScaleFactor`, fonts/textures fully loaded before capture), with no missing glyphs or untextured flat fills bleeding through from a headless render.
