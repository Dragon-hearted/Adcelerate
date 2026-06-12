---
system: "post-board"
type: dependencies
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# Dependencies — post-board

## Runtime Dependencies
_Required for the system to execute._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| bun | ≥1.3 | JavaScript/TypeScript runtime + package manager + test runner + bundler (editor SPA). |
| hono | ^4.12.25 | HTTP server: REST API (brand/projects/generate/export/upload) + static editor + brand asset/font routes. |
| zod | ^4.4.3 | Project document schema — validation and disk round-trip of `project.json`. |
| playwright | ^1.60.0 | Headless Chromium render of each slide stage at exact pixel size for PNG export. |
| pdf-lib | ^1.17.1 | Assembles the per-slide PNGs into a combined `carousel.pdf`. |
| moveable | ^0.53.0 | Editor: drag / resize / rotate of selected layers on the slide stage. |
| selecto | ^1.26.3 | Editor: marquee / click selection of layers (pairs with moveable). |

## Build Dependencies
_Required for development and building._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @biomejs/biome | ^1.9.0 | Lint + format (`bun run lint` / `check`). |
| @types/bun | latest | Bun type definitions for the TS toolchain. |
| typescript | ^5.7.0 | `tsc --noEmit` typechecking. |
| ms-playwright (Chromium) | bundled w/ playwright 1.60 | Browser binary installed via `bunx playwright install chromium`; required for headless export. |

## Optional Dependencies
_Enhance functionality but not required._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| image-engine | local (`:3002`) | Cover-background transport (HTTP). When absent, the CSS riso cover path is used and the flow continues. |
| higgsfield | env (global CLI + auth) | Default GPT Image 2 provider behind ImageEngine for cover backgrounds. Optional — CSS cover is the safe default. |

## Path Dependencies
_Files outside the system that it reads at runtime._

| Path | Purpose |
|------|---------|
| `client/dragonhearted_labs/brand-identity/brand.json` | **Canonical brand tokens** (v2.0.0): palette, typography + font paths, background/riso system, logo + container rules, brand elements, style modes, voice, positioning. The editor's entire constraint set derives from this. |
| `client/dragonhearted_labs/brand-identity/fonts/**` | Neue Machina (.otf, display), IBM Plex Mono (.ttf, labels) embedded as base64 `@font-face`. Inter via Google Fonts/OFL fallback (not bundled). |
| `client/dragonhearted_labs/brand-identity/assets/elements/*-sheet.png` | Brand-element palette sprites (barcode, starbursts, wireframe-globes, texture/halftone fields). |
| `client/dragonhearted_labs/brand-identity/assets/logo*` | Logo + riso variants (with Graphite-container rule). |
| `client/dragonhearted_labs/post-board/<id>/` | Output dir — `project.json`, uploaded images, `slide-NN.png`, `carousel.pdf` (gitignored / private). |

## External Services
_APIs, models, or services the system depends on._

| Service | Purpose | Failure Impact |
|---------|---------|---------------|
| ImageEngine (`localhost:3002`) | HTTP transport for cover-background generation (Higgsfield GPT Image 2 default → gemini fallback). | **Degraded, not broken** — cover generation surfaces a clear message; the CSS riso cover path keeps working. All other functionality (editor, copy, export) is unaffected. |
| Higgsfield (via ImageEngine) | Default GPT Image 2 generation provider for cover backgrounds. | Same as above — falls back to gemini inside ImageEngine, else CSS cover. |
