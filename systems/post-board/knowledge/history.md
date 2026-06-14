---
system: "post-board"
type: history
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# History — post-board

## Build Log

### 2026-06-12 — Initial Build
- **Built by**: build-mode (team `post-board`: builder-scaffold, builder-server, builder-render, builder-editor, builder-skill; validator-final)
- **Plan**: `specs/post-board-social-creative-system.md` (feature, complex) — 11-task team orchestration.
- **Knowledge captured**: Brand-aware social creative production for Dragonhearted Labs. The deliverable is an **editable DOM/CSS slide editor** (not a flat image), modeled on SceneBoard but swapping "one composite image" for a Bun + Hono-served SPA where every layer is movable/editable under **brand-locked** fonts, palette, riso/ink-bleed treatments, logo container rule, and style modes — all sourced from `brand.json`. Cover is a CSS riso composition by default with an optional one-click Higgsfield background (via ImageEngine `:3002`, ported `image-client.ts`); export is headless Playwright PNG-per-slide + `pdf-lib` PDF. `client/` outputs are private.
- **Components**: `brand-loader.ts`, `project.ts` (Zod schema + disk persistence), `formats.ts` (4 presets), `image-client.ts` (ported), `cover-prompt.ts`, `cover.ts`, `copy-contract.ts`, `seed.ts`, `server.ts` (Hono API), `cli.ts` (new/serve/generate-cover/export), `export.ts`; editor SPA (`editor/src/*` + `brand.css`/`editor.css`); `/post-board` skill (SKILL.md + generate/iterate/manage + references).
- **Acceptance criteria**: 11 hard gates, 4 soft criteria (see [acceptance-criteria.md](acceptance-criteria.md)).
- **Validation**: E2E sample carousel PASS (see E2E Validation Log below); full acceptance validation tracked in Task #11.

## Fix Log
_Entries added by diagnosis workflow._

## Diagnosis Log
_Entries added when system issues are investigated._

## E2E Validation Log

### 2026-06-12 — End-to-end sample carousel (Task #10)
- **Run by**: builder-editor
- **Project**: `carousel-5-lessons-from-building-mqarxwpx` (carousel, ig-4x5 1080×1350, style mode `08-popart-screenprint`)
- **Output dir**: `client/dragonhearted_labs/post-board/carousel-5-lessons-from-building-mqarxwpx/`
- **Flow**:
  1. `cli new --brief tests/fixtures/sample-brief.txt --type carousel --format ig-4x5` → seeded draft.
  2. Applied `tests/fixtures/sample-copydoc.json` via `copyDocToSlides` → 7 slides: cover · content · stat · content · stat · quote · cta (real "5 lessons" pipeline copy).
  3. Server up: `GET /api/brand` 200, `GET /editor` 200, `GET /editor/dist/main.js` 200, `GET /api/projects/:id` 200. `PUT` round-trip (moved a layer +40px, edited text) persisted on re-GET.
  4. `generate-cover`: ImageEngine `:3002` was DOWN (`curl /api/budget` failed) → **skipped per spec**; `POST /api/generate` returned a clean **502** with the "CSS background path still works" hint and the cover background stayed `type:"css"` (graceful degradation, CSS cover is the acceptance default).
  5. `cli export --project … --pdf` → `slide-01.png … slide-07.png` all **exactly 1080×1350**, plus `carousel.pdf` with **7 pages** at 1080×1350 (page count == slide count).
  6. Visual sanity-check (exported PNGs): retro-white **textured** canvas (not flat white), Neue Machina display type with ink-bleed, IBM Plex Mono `[DRGN.LAB//00N]` kickers in Electric Blue, brand palette only, **no lime text on canvas**, logo riso-graphite placed container-free. The long cover hook initially overflowed its box; fitted via an in-editor operator nudge (`PUT` headline fontSize 119→58, reflowed box) then re-exported clean — exercising the edit→persist→export loop.
- **Result**: PASS. On-brand artifact (project.json + 7 PNGs + carousel.pdf) produced end-to-end; edits persist across reload.
- **Follow-up flagged**: `copyDocToSlides` cover geometry should auto-fit long full-sentence hooks (reduce display size / reflow) so the cover renders clean without a manual nudge — flagged to builder-skill.
