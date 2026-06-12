---
system: "post-board"
type: index
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# post-board

## Summary
PostBoard is a **brand-aware social post & carousel studio** for the Dragonhearted Labs personal brand. It turns a short brief into on-brand Instagram/Facebook/LinkedIn posts and carousels — fast. The defining deliverable is **not** a flat image but an **editable DOM/CSS web app**: each slide is a fixed-size HTML "stage" of absolutely-positioned, draggable/resizable layers (text, images, brand elements, logo). The operator generates copy via the platform's best copy skills, gets a catchy on-brand cover (CSS riso by default, optional Higgsfield background), then moves/edits/recolors layers using **brand-locked fonts and palette**, saves the project to disk, and exports one PNG per slide plus a combined PDF. The brand JSON (`client/dragonhearted_labs/brand-identity/brand.json`) is the single source of truth that constrains every editor choice.

## Entry Points
- **CLI**: `src/cli.ts` — commands `new`, `serve`, `generate-cover`, `export`.
- **Server**: `src/server.ts` — Hono server (REST API + static editor + brand asset/font routes), binds `127.0.0.1:4300` (override via `POST_BOARD_PORT` / `--port`).
- **Editor (browser)**: `http://127.0.0.1:4300/editor?project=<id>` — the DOM/CSS slide editor SPA (`editor/index.html` + `editor/src/main.ts`).
- **Skill**: `/post-board` (`.claude/skills/post-board/SKILL.md`) — conversational front door with approval gates.

## Stage Definitions
Execute Mode routing stages (mirrors `systems.yaml`):
1. **copy-generation** — on-brand copy (cover hook, body slides, CTA) via `copywriting`/`ad-creative`/`social-content`/`marketing-psychology`, mapped to brand voice + positioning banners.
2. **project-seeding** — a populated draft Project document (format preset, style mode, slides+layers) persisted to `client/dragonhearted_labs/post-board/<id>/project.json`.
3. **cover-generation** — catchy cover slide: CSS riso composition by default, or an optional Higgsfield/ImageEngine background with editable text on top.
4. **interactive-editing** — operator edits slides in the served DOM/CSS editor (move/resize/rotate, brand-only fonts & colors, treatments, add/reorder/delete slides), autosaved to `project.json`.
5. **export** — one PNG per slide at exact preset pixel dimensions + a combined `carousel.pdf` in the project dir.

## Knowledge Files
- [Domain Knowledge](domain.md) — Domain expertise and tacit knowledge
- [Execution](execution.md) — How Execute Mode runs this system
- [Acceptance Criteria](acceptance-criteria.md) — Hard gates and soft quality criteria
- [Dependencies](dependencies.md) — Runtime, build, and optional dependencies
- [History](history.md) — Build, fix, and diagnosis history

## Cross-References
- **image-engine** (optional) — cover-background transport over HTTP (`:3002`); Higgsfield GPT Image 2 default. CSS cover always works when it's down.
- **prompt-writer** — methodology for composing the Higgsfield cover-background prompt (`src/cover-prompt.ts`).
- **scene-board** — the model PostBoard is cloned from; ports its ImageEngine `image-client.ts` and shares the `client/<slug>/<system-slug>/` convention.
- **moodboarder** — related per-client visual reference system under the same `client/` convention.
