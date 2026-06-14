---
system: "post-board"
type: execution
driver: skill
skill: post-board
mode: delegate
gates: native
version: 1
lastUpdated: "2026-06-12"
lastUpdatedBy: build-mode
---

# Execution — post-board

How Execute Mode (`/adcelerate-execute`) runs this system. Execute Mode reads ONLY this manifest to decide how to run, then branches on `driver`.

## Invocation
Invoke the `post-board` skill via the Skill tool, relaying the engineer's task input (the brief, target platform/format, and any provided copy or references). Do NOT reconstruct its stages — the skill runs its own approval-gated dynamic pipeline.

The skill itself drives the underlying engine, whose runnable surface is:
- `bun run src/cli.ts new --brief <file|string> --type <post|carousel> --format <ig-4x5|ig-1x1|story-9x16|linkedin-4x5> [--style-mode <id>]` — seed a draft project.
- `bun run src/cli.ts serve [--port <n>]` (binds `127.0.0.1:4300`, override via `POST_BOARD_PORT` / `--port`) — start the editor + REST API; hand the operator `http://127.0.0.1:4300/editor?project=<id>`.
- `bun run src/cli.ts generate-cover --project <id> [--slide <id>]` — fetch a Higgsfield/ImageEngine cover background.
- `bun run src/cli.ts export --project <id> [--pdf]` — render `slide-NN.png` per slide (+ `carousel.pdf`).

Server endpoints: `GET /api/brand`, `GET/PUT /api/projects/:id`, `POST /api/projects`, `POST /api/generate`, `POST /api/export`, `POST /api/upload`, static `/editor`, `/assets/:id/*`, `/brand-assets/*`, `/fonts/*`.

## Natural flow (awareness only — the system drives this on the skill path)
1. **copy-generation** — generate on-brand cover hook, body-slide copy, and CTA via the best copy skills.
2. **project-seeding** — seed a populated draft Project (`post-board new`) under `client/dragonhearted_labs/post-board/<id>/`.
3. **cover-generation** — build the cover (CSS riso default, or Higgsfield background via `generate-cover`).
4. **interactive-editing** — `post-board serve`; operator edits in the browser editor; autosave to `project.json`.
5. **export** — `post-board export --pdf` → PNG-per-slide + `carousel.pdf`.

On the skill path this list is FYI only — the skill owns the flow and its own [A]/[M]/[R] approval gates.

## Where the agent must check / supply input
- **Brief intake** — relay the engineer's brief; the skill classifies provided vs. missing components and asks for what it needs (platform, format, type, voice cues).
- **Copy approval gate** — relay the skill's approval of generated copy before it lands in the project.
- **Cover approval gate** — relay the choice between CSS riso cover and Higgsfield-generated background (and approval of the generated image).
- **Editor handoff** — surface the served editor URL to the operator; editing + autosave happen interactively.
- **Export** — confirm the target project id and whether a PDF is required.
- **ImageEngine availability** — if `:3002` is down, relay the clear fallback message and proceed with the CSS cover path.

## Validation
After execution, validate the output against [acceptance-criteria.md](acceptance-criteria.md) (hard gates inline, soft criteria via the validator). Applies to both drivers.
