# Plan: Pinboard Terminal Rewrite (Warp-styled TUI + ImageEngine + PromptWriter + Pinterest Import)

**Target save destination (after approval):** `specs/pinboard-terminal-rewrite.md`

## Context

Pinboard is currently a web app (React+Vite client, Hono+Bun server) that calls Google Gemini and fal.ai directly from its own server. The user wants to retire the web UI and replace it with a **Warp-styled terminal app (TUI)** that:

1. Preserves functional parity with today's Pinboard (upload references, generate, iterate via use-as-reference, `@N` prompt syntax, model selection, history).
2. Stops paying for the Claude API for vision/prompt-drafting work — instead shells out to the already-subscribed `claude` CLI in non-interactive mode (`claude -p`) so reference images can be vision-analyzed and drafted into prompts for free.
3. Delegates image generation to **ImageEngine** (the central WisGate/NanoBanana service) instead of Pinboard's own Google/fal providers — unifying generation, token budgeting, and cost tracking across the monorepo.
4. Uses **PromptWriter**'s model knowledge registry (16 model `.md` files) to format the final prompt per selected model — e.g. always appending `"No text in image."` for NanoBanana Pro, respecting aspect ratios, system-instruction budgets, reference-image caps.
5. Adds a **Pinterest URL import** feature — paste a Pin/board URL → download image → register as a reference → feed into the iteration loop.
6. Looks and feels like Warp: warm parchment (#faf9f6) on near-black, Matter-like typography cues, dark pill buttons, semi-transparent borders, flat depth (per `WARP.md`).

## Task Description

Rewrite `systems/pinboard/` from a web app to a terminal-first TUI (Ink + React) that preserves all existing flows, adds Pinterest import, integrates ImageEngine for generation and PromptWriter for model-aware prompt formatting, and uses `claude -p` for vision-assisted prompt drafting. The old `client/` and `server/` directories are removed; SQLite schema is preserved for continuity.

## Objective

Ship a `pinboard` CLI binary that launches a full-screen TUI with gallery / prompt editor / generation panels, supports the full upload→generate→iterate loop, imports Pinterest images by URL, drafts prompts via Claude Code vision, formats final prompts via PromptWriter, and produces images via ImageEngine — all styled per `WARP.md`.

## Problem Statement

- Pinboard's web-app UX is overkill for a solo power-user workflow; the user lives in the terminal alongside Claude Code.
- The in-house Google/fal providers duplicate what ImageEngine already does (rate limiting, budget, retry, token ledger).
- Prompts go to models raw — no model-specific formatting, no per-model template, no automatic `"No text in image."` for NanoBanana.
- Vision analysis + prompt drafting currently implies paid Claude API calls; the Claude Code subscription already covers this if invoked via CLI.
- Pinterest is a primary reference source; there's no ingestion path today.

## Solution Approach

**Stack:** Bun + TypeScript + **Ink** (React for CLI) + `@inkjs/ui` for primitives (TextInput, Spinner, Select). Rationale: the whole monorepo is React+TypeScript; Ink lets us translate WARP design tokens to terminal directly and reuse React patterns the Pinboard client already used.

**Design language mapping (WARP.md → terminal):**

| WARP.md token | Terminal mapping |
|---------------|------------------|
| Warm Parchment `#faf9f6` | Primary text via `chalk.hex('#faf9f6')` (truecolor terminals; Kitty/iTerm2/Alacritty/WezTerm all supported) |
| Ash Gray `#afaeac` | Secondary labels, inactive list rows |
| Stone Gray `#868584` | Tertiary/hint text |
| Earth Gray `#353534` | Pill background (rendered as single-cell padded block with bg color) |
| Mist Border `rgba(226,226,226,0.35)` | Box borders via Ink `borderStyle="round"` + dimmed color |
| Near-black page bg | Default terminal bg (no override; works on any dark theme) |
| Matter Regular | Default monospace (terminals enforce mono); we lean on size-equivalent *spacing*, uppercase tracking for captions |
| Uppercase + letter-spacing for captions | `chalk.dim` + uppercase + `' '.repeat(2)` word-spacing |
| Flat depth, no shadows | Single-line rounded borders only; no drop-shadow hacks |

**Architecture:**

```
pinboard CLI (bun bin)
   │
   ├─ Ink TUI (screens/, components/, hooks/)
   │       │
   │       ├─ service: imageengine.ts  ──HTTP──►  ImageEngine @ :3002
   │       │                                        (auto-start if not running)
   │       │
   │       ├─ service: promptwriter.ts ──import──► systems/prompt-writer
   │       │           (readRegistry, read model .md, apply template)
   │       │
   │       ├─ service: claudevision.ts ──spawn──► `claude -p "Describe..." @ref.jpg`
   │       │           (vision draft → piped through promptwriter format)
   │       │
   │       ├─ service: pinterest.ts   ──fetch──► Pin URL → og:image → download → /uploads/
   │       │           (Playwright fallback for auth-walled boards, phase 3+)
   │       │
   │       └─ service: db.ts         ──────────► pinboard.db (SQLite, existing schema)
```

**Existing SQLite schema is preserved** (tables `images`, `generations`). New columns may be added via ALTER TABLE migration (e.g. `source` = 'upload' | 'pinterest' | 'generation-copy') without breaking existing data.

**Claude Code vision integration pattern:**

```bash
claude -p "Analyze this reference image. Write a concise image-generation prompt (subject, lighting, composition, mood, style). Output ONLY the prompt text, no preamble." < /dev/null --attach /abs/path/ref.jpg
```

(Exact flag spelling confirmed at build time by the services builder — may be `--image`, `--attach`, or `@path` shorthand depending on Claude Code version. The builder probes `claude --help` before wiring.)

**PromptWriter integration pattern:**

```ts
import { readRegistry } from '../../prompt-writer/src/registry';
const models = await readRegistry();
const entry = models.find(m => m.model === selectedModel);
const guide = await Bun.file(`.../knowledge/models/${entry.file}`).text();
// Parse 'Prompt Structure' + 'Constraints' sections; apply template to draft prompt;
// auto-append required suffixes (e.g. "No text in image." for NanoBanana Pro).
```

**Pinterest import pattern:**

1. User pastes URL in the Pinterest modal (triggered by `p` keybinding).
2. `pinterest.ts` normalises the URL, fetches the page, extracts `<meta property="og:image">` → high-res image URL.
3. Downloads via `fetch` + `Bun.write` to `uploads/{uuid}.{ext}`.
4. Inserts a row into `images` with `source='pinterest'` + original URL for provenance.
5. Surfaces as `@N` reference in the gallery immediately.

**Keybindings (vim-ish, shown in footer):**

| Key | Action |
|-----|--------|
| `j`/`k` or arrows | Navigate gallery |
| `a` | Add reference (file picker via `@inkjs/ui`) |
| `p` | Paste Pinterest URL |
| `v` | Vision-draft prompt from highlighted reference (Claude Code) |
| `Enter` | Focus prompt editor |
| `g` | Generate |
| `r` | Use highlighted generation as reference |
| `m` | Model picker modal |
| `?` | Help overlay |
| `q` | Quit |

## Relevant Files

**Read-only references (understand, don't modify unless noted):**
- `/Users/dragonhearted/Desktop/Adcelerate/WARP.md` — design language source of truth
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/README.md` — functional spec of current app
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/server/src/db.ts` — existing SQLite schema to preserve
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/server/src/routes/generate.ts` — reference for generation flow semantics (incl. `@N` + generation-vs-promptOnly distinction)
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/client/src/hooks/useReferenceImages.ts` + `useImageGeneration.ts` — state-machine logic to port to Ink hooks
- `/Users/dragonhearted/Desktop/Adcelerate/systems/image-engine/src/types.ts` — `GenerationRequest`, `BatchRequest`, `WisGateModel` types
- `/Users/dragonhearted/Desktop/Adcelerate/systems/image-engine/src/routes/generate.ts`, `gallery.ts`, `budget.ts` — endpoint contracts the TUI will consume
- `/Users/dragonhearted/Desktop/Adcelerate/systems/scene-board/src/image-client.ts` — existing HTTP client to ImageEngine, copy/adapt
- `/Users/dragonhearted/Desktop/Adcelerate/systems/prompt-writer/src/registry.ts` — library exports
- `/Users/dragonhearted/Desktop/Adcelerate/systems/prompt-writer/knowledge/models/_registry.md` + per-model `.md` files — model knowledge
- `/Users/dragonhearted/Desktop/Adcelerate/systems/instagram-scrapper/src/browser-login.ts` + `media-downloader.ts` — Playwright + fetch-download pattern, mirror for Pinterest fallback

**To be removed (phase 5 cleanup, only after TUI parity + approval):**
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/client/` (entire directory)
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/server/` (entire directory)
- `/Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/demo/` — keep (Remotion demo video, unrelated to app runtime)

### New Files

```
systems/pinboard/
├── package.json                     # Workspace root: scripts → tui, removes dev:server/dev:client
├── justfile                         # Updated: `just start` → runs TUI
├── bin/
│   └── pinboard                     # Node/Bun shim: `#!/usr/bin/env bun` → run tui/src/cli.tsx
├── tui/
│   ├── package.json                 # ink, @inkjs/ui, chalk, zod, better-sqlite3 (or bun:sqlite)
│   ├── tsconfig.json
│   └── src/
│       ├── cli.tsx                  # Parse argv, mount <App/> via render()
│       ├── App.tsx                  # Root: layout + global keybindings + router
│       ├── theme.ts                 # WARP.md color/tracking tokens → chalk helpers
│       ├── screens/
│       │   ├── Gallery.tsx          # Left pane: references + history with @N tags
│       │   ├── PromptPanel.tsx      # Center pane: prompt editor, @N autocomplete
│       │   ├── Preview.tsx          # Right pane: current generation preview (in-terminal image via Kitty/iTerm protocol)
│       │   ├── ModelPicker.tsx      # Modal (listed from PromptWriter registry + availability via ImageEngine)
│       │   ├── PinterestModal.tsx   # Paste URL → download progress → insert
│       │   └── HelpOverlay.tsx      # ? key: keybinding cheatsheet
│       ├── components/
│       │   ├── Pill.tsx             # Earth Gray 50px-radius-equivalent pill
│       │   ├── Card.tsx             # Rounded border + Mist-Border dimmed color
│       │   ├── Header.tsx           # App header (Warm Parchment heading, uppercase tracked subtitle)
│       │   ├── StatusBar.tsx        # Bottom: tokens spent, budget %, model, ImageEngine health
│       │   ├── ImageThumb.tsx       # Terminal image (kitty `\x1b]1337;File=...` iTerm2 proto, Sixel fallback)
│       │   └── KeyHint.tsx          # Tracked-uppercase caption style
│       ├── hooks/
│       │   ├── useReferences.ts     # Porting useReferenceImages logic
│       │   ├── useGenerations.ts    # Porting useImageGeneration logic
│       │   ├── useKeyboard.ts       # Global key dispatcher
│       │   └── useImageEngine.ts    # Health + generate + budget wrappers
│       ├── services/
│       │   ├── imageengine.ts       # HTTP client @ localhost:3002, auto-spawn if not up
│       │   ├── promptwriter.ts      # Load registry, parse model guide, apply template
│       │   ├── claudevision.ts      # spawn `claude -p ... @image`, capture stdout
│       │   ├── pinterest.ts         # URL → og:image → download → register
│       │   └── db.ts                # SQLite (existing schema + new `source` column via migration)
│       ├── migrations/
│       │   └── 001_add_source_column.sql
│       └── utils/
│           ├── imageProtocol.ts     # Detect terminal (Kitty/iTerm/Sixel/unsupported); render or fallback to ASCII
│           ├── ensureImageEngineUp.ts # Spawn `bun run systems/image-engine/src/index.ts` if health check fails
│           └── atSyntax.ts          # Parse `@N` references from prompt text
└── .env.example                     # Updated: WISDOM_GATE_KEY (ImageEngine), CLAUDE_BIN (optional)
```

## Implementation Phases

### Phase 1: Foundation
- Scaffold `tui/` workspace package (Ink + @inkjs/ui).
- Build `theme.ts` mapping all WARP.md tokens to chalk hex helpers.
- Build base `Pill`, `Card`, `Header`, `StatusBar`, `KeyHint` components to validate design language in the terminal.
- Stub service files with typed contracts; no business logic yet.
- SQLite migration adds `source` column without breaking existing rows.
- `pinboard` bin shim runs with a static "hello world" full-screen layout.

### Phase 2: Core Implementation
- `imageengine.ts`: health-check, auto-spawn, generate, batch, gallery, use-as-reference.
- `db.ts`: port read/write for `images` + `generations`, preserve existing schema semantics.
- `promptwriter.ts`: load registry + model guide, parse Prompt Structure + Constraints, build `applyTemplate(draft, modelName)` function that auto-appends model-required suffixes and enforces prompt length / aspect ratio.
- Gallery + PromptPanel + Preview wired end-to-end for the **upload → generate → use-as-reference** loop via ImageEngine.
- Model picker lists only models that appear in BOTH PromptWriter registry AND ImageEngine's supported `WisGateModel` list.

### Phase 3: Integration & Polish
- `claudevision.ts`: probe `claude --help`, shell out with correct image-attach flag, capture stdout as draft prompt.
- `pinterest.ts`: public Pin URL → og:image → download → register. Error paths: private board, 404, oversized file.
- In-terminal image preview via Kitty/iTerm2 graphics protocol; Sixel fallback for WezTerm/mlterm; ASCII art last resort.
- Help overlay (`?` key) listing every keybinding.
- StatusBar live-polls ImageEngine budget endpoint; shows warnings at 80%, errors at 100%.
- Retire `client/` and `server/` (move to `.legacy/` first for one commit, then delete in a follow-up after user confirms parity).

## Team Orchestration

- As team lead, I coordinate — I do not write code.
- The user explicitly instructed: **use team agents, not local/subagents**. All execution runs through `team/builder` and `team/validator` deployed via `Task` tool calls.
- Builders run in parallel where dependencies allow; `TaskUpdate` + `addBlockedBy` encodes the graph.

### Team Members

- **Builder**
  - Name: `builder-scaffold`
  - Role: Scaffold `tui/` package, theme tokens, base WARP-styled components, SQLite migration. No business logic.
  - Agent Type: `team/builder`
  - Resume: true

- **Builder**
  - Name: `builder-services-core`
  - Role: Implement `imageengine.ts`, `db.ts`, `promptwriter.ts` service modules with typed contracts + unit tests. Does NOT wire UI.
  - Agent Type: `team/builder`
  - Resume: true

- **Builder**
  - Name: `builder-services-external`
  - Role: Implement `claudevision.ts` (probe + shell out) and `pinterest.ts` (og:image + download; no auth yet). Isolated from UI.
  - Agent Type: `team/builder`
  - Resume: true

- **Builder**
  - Name: `builder-flows`
  - Role: Wire the three screens (Gallery, PromptPanel, Preview) + ModelPicker + PinterestModal to the services built by `builder-services-*`. Implements `useReferences`, `useGenerations`, `useKeyboard`, `useImageEngine`.
  - Agent Type: `team/builder`
  - Resume: true

- **Builder**
  - Name: `builder-polish`
  - Role: In-terminal image preview (Kitty/iTerm/Sixel), HelpOverlay, StatusBar live budget, keybinding footer. Ensures visual matches WARP.md.
  - Agent Type: `team/builder`
  - Resume: true

- **Builder**
  - Name: `builder-cleanup`
  - Role: Retire `client/` and `server/` directories (move → `.legacy/` then delete), update root `package.json`, `justfile`, README, `.env.example`, monorepo registry (`systems.yaml`, `library.yaml` if needed).
  - Agent Type: `team/builder`
  - Resume: true

- **Validator**
  - Name: `validator-final`
  - Role: Runs typecheck, build, smoke tests, verifies every acceptance criterion end-to-end in a real terminal session. Produces pass/fail report.
  - Agent Type: `team/validator`
  - Resume: true

## Step by Step Tasks

Execute top-to-bottom via `TaskCreate`, `TaskUpdate`+`addBlockedBy`, and `Task`.

### 1. Scaffold TUI package
- **Task ID**: scaffold-tui
- **Depends On**: none
- **Assigned To**: builder-scaffold
- **Agent Type**: team/builder
- **Parallel**: false
- Create `systems/pinboard/tui/` with Ink + @inkjs/ui + chalk in `package.json`.
- Build `theme.ts` with every WARP.md token mapped to a chalk hex helper (warmParchment, ashGray, stoneGray, earthGray, mistBorder, linkGray).
- Build base components: `Pill`, `Card`, `Header`, `StatusBar`, `KeyHint`.
- Create `cli.tsx` + `App.tsx` rendering a static "Pinboard" header + placeholder 3-pane layout that looks Warp-like.
- Add `bin/pinboard` shim (`#!/usr/bin/env bun`).
- Write SQLite migration `001_add_source_column.sql` (idempotent ALTER; skip if column exists).
- **Deliverable:** `bun run pinboard` opens a full-screen Warp-styled shell with placeholder panes.

### 2. Core services (ImageEngine, DB, PromptWriter)
- **Task ID**: services-core
- **Depends On**: scaffold-tui
- **Assigned To**: builder-services-core
- **Agent Type**: team/builder
- **Parallel**: true (with services-external)
- `imageengine.ts`: health check, `ensureUp()` that spawns `bun run systems/image-engine/src/index.ts` if not running, `generate()`, `batch()`, `useAsReference()`, `getImage()`, `getBudget()`. Reuse patterns from `systems/scene-board/src/image-client.ts`.
- `db.ts`: port CRUD for `images` + `generations`. Run migration on startup. Expose `getThumbnail(id)` that returns path + mime.
- `promptwriter.ts`: `listImageModels()` (filtered + cross-ref against ImageEngine's `WisGateModel`), `loadModelGuide(modelName)` (parses sections), `applyTemplate(draft, modelName)` (auto-append "No text in image." for NanoBanana Pro; enforce 8192 char cap; validate aspect ratio).
- Unit tests for each service using `bun test`.

### 3. External services (Claude vision, Pinterest)
- **Task ID**: services-external
- **Depends On**: scaffold-tui
- **Assigned To**: builder-services-external
- **Agent Type**: team/builder
- **Parallel**: true (with services-core)
- `claudevision.ts`: at startup, probe `claude --help` to detect image-attach flag (`--image` / `--attach` / `@path`). `draftPrompt(imagePath, modelHint?)` spawns `claude -p "…" <image>` and returns stdout. Handle non-zero exit, missing `claude`, timeouts.
- `pinterest.ts`: `fetchPin(url)` normalises URL, fetches HTML, extracts `<meta property="og:image">` (fallback: `<meta name="twitter:image">`, then largest `<img>`). Download via `fetch` + `Bun.write` → register in `images` with `source='pinterest'` + original URL. Reject non-Pinterest hosts. Cap download at 10 MB.
- Unit tests for URL normalisation, og:image extraction, error paths.

### 4. Wire core flows
- **Task ID**: wire-flows
- **Depends On**: services-core, services-external
- **Assigned To**: builder-flows
- **Agent Type**: team/builder
- **Parallel**: false
- Implement `useReferences`, `useGenerations`, `useKeyboard`, `useImageEngine` hooks.
- Gallery screen: list references + history, @N tagging, keyboard nav (j/k/arrows).
- PromptPanel: @N autocomplete, send-to-generate via `g`, vision-draft via `v` (runs `claudevision.draftPrompt` on highlighted ref → fills editor → pipes through `promptwriter.applyTemplate`).
- Preview screen: renders latest generation inline (terminal protocol detection).
- ModelPicker modal (`m`): model list from `promptwriter.listImageModels()`, shows per-model constraints inline (max refs, aspect ratios).
- PinterestModal (`p`): URL input + progress spinner + insert.
- Use-as-reference (`r`): copies highlighted generation to references.
- Help overlay (`?`).

### 5. Polish
- **Task ID**: polish
- **Depends On**: wire-flows
- **Assigned To**: builder-polish
- **Agent Type**: team/builder
- **Parallel**: false
- In-terminal image thumbnails: Kitty graphics protocol, iTerm2 inline images protocol, Sixel fallback, ASCII-art last resort. Detect via `TERM_PROGRAM`/`TERM` env.
- StatusBar live budget polling every 10s.
- Keybinding footer always visible.
- Colour audit: every rendered color sourced from `theme.ts`, no raw chalk calls outside theme.
- Readme screen recording / asciinema.

### 6. Retire web app
- **Task ID**: cleanup
- **Depends On**: polish
- **Assigned To**: builder-cleanup
- **Agent Type**: team/builder
- **Parallel**: false
- Move `systems/pinboard/client/` and `systems/pinboard/server/` to `systems/pinboard/.legacy/` in a single commit.
- Update `systems/pinboard/package.json` scripts (`dev`, `start`) to point at the TUI.
- Update `systems/pinboard/justfile`.
- Update `systems/pinboard/README.md` to reflect terminal-first usage.
- Update `systems/pinboard/.env.example` (add `WISDOM_GATE_KEY`; remove `GOOGLE_AI_STUDIO_KEY`, `FAL_KEY` unless needed for legacy).
- Update monorepo root README.md (Pinboard row in systems table).
- Update `systems.yaml` and `library.yaml` descriptions.
- Do **NOT** delete `.legacy/` yet — leave for one release cycle per the user's approval.

### 7. Final validation
- **Task ID**: validate-all
- **Depends On**: scaffold-tui, services-core, services-external, wire-flows, polish, cleanup
- **Assigned To**: validator-final
- **Agent Type**: team/validator
- **Parallel**: false
- `bun run typecheck` in `systems/pinboard/tui/`: zero errors.
- `bun test` in `systems/pinboard/tui/`: all pass.
- Smoke script: launch `pinboard`, upload a local image, draft prompt via `v`, generate via `g`, use-as-reference via `r`, paste a public Pinterest URL via `p`, switch model via `m`. Each step verified via DB state + filesystem artefact.
- Manual visual review against WARP.md: header uses Warm Parchment, buttons are Earth Gray pills, borders are Mist-Border dimmed, no pure white anywhere, no bright accents.
- Budget/rate-limit behaviour verified against ImageEngine (force a 402 / 429 and confirm graceful TUI message).
- Report pass/fail per acceptance criterion.

## Acceptance Criteria

1. `pinboard` binary launches a full-screen TUI; no browser, no HTTP server of its own (ImageEngine may auto-spawn).
2. All four original flows work end-to-end via the TUI: upload reference, generate with `@N` refs, iterate (use-as-reference), model selection.
3. Generation goes through ImageEngine (`POST /api/generate` with `referenceImageIds`), not direct Google/fal calls.
4. Final prompts pass through PromptWriter's model-template step; NanoBanana Pro generations always end with `"No text in image."`; prompt length never exceeds the per-model cap.
5. `v` keybinding on a highlighted reference produces a drafted prompt via `claude -p`, and the draft is auto-formatted for the currently selected model.
6. Pasting a public Pinterest URL downloads the image and makes it available as the next `@N` reference within 5 seconds on a broadband connection.
7. SQLite schema preserved: no existing row lost; migration runs idempotently.
8. Visual style matches WARP.md: Warm Parchment primary text, Earth Gray pills, Mist-Border rounded frames, uppercase tracked captions, zero bold-accent colours, zero pure white.
9. `systems/pinboard/client/` and `systems/pinboard/server/` are removed from active code paths (moved to `.legacy/`).
10. Budget + rate-limit errors from ImageEngine surface as readable TUI notifications, not crashes.

## Validation Commands

```bash
# Typecheck
cd systems/pinboard/tui && bun run typecheck

# Unit tests
cd systems/pinboard/tui && bun test

# Start ImageEngine (if not auto-spawned)
cd systems/image-engine && bun run src/index.ts &

# Launch TUI
cd systems/pinboard && bun run bin/pinboard
# OR
bun run systems/pinboard/tui/src/cli.tsx

# End-to-end smoke (manual keystrokes noted in validator report)
# 1. a → pick sample.jpg → confirm @1 appears in gallery
# 2. p → paste https://www.pinterest.com/pin/<id>/ → confirm @2 appears
# 3. v on @1 → confirm draft prompt appears in editor
# 4. m → pick "NanoBanana Pro" → confirm status bar updates
# 5. g → confirm generation appears in right pane, token counter ticks
# 6. r on generation → confirm @3 appears
# 7. Inspect pinboard.db: images table has source column populated

# Monorepo parity
cd <repo-root> && just systems-health
```

## Notes

- **Dependency additions (via `bun add` in `systems/pinboard/tui/`)**: `ink`, `@inkjs/ui`, `chalk`, `zod`. SQLite via `bun:sqlite` (built-in).
- **Terminal compatibility**: fully supported: Kitty, iTerm2, WezTerm, Alacritty. Graphics protocol auto-detected; ASCII fallback ensures the app remains usable in any terminal.
- **ImageEngine auto-spawn**: if health check fails, spawn `bun run systems/image-engine/src/index.ts` as a child process and poll for readiness (max 10s). If still down, surface a clear error with the manual command to run.
- **Claude Code availability**: if `claude` binary is missing from `$PATH`, the `v` keybinding disables itself with a hint (not a crash).
- **Pinterest auth-walled boards**: out of scope for phase 1. Phase 2 follow-up could add Playwright login (mirroring `instagram-scrapper`), but only if the user requests it.
- **Legacy preservation**: `client/` and `server/` move to `.legacy/` rather than immediate deletion to allow rollback until TUI parity is confirmed in real use.
- **Not in scope**: a separate daemon, multi-user mode, remote images (non-Pinterest), generation queueing UI beyond what ImageEngine already offers.

