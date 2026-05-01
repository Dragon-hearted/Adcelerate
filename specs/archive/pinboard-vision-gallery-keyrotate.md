# Plan: Pinboard System Update — Vision, Prompt Drafting, Gallery Semantics, Upload UX, Preview, Key Rotation

## Task Description

Nine concrete changes to the pinboard TUI (and a small image-engine fix) that together rework how prompts are drafted from references, what the gallery represents, how files are added, how images preview in the terminal, and how the system reacts to a rotated API key.

User-stated changes (verbatim intent, restated):

1. **Claude Code vision must actually work** — currently `claudevision.ts` shells out to the local `claude` CLI; on this machine the probe or invocation is failing or producing empty output. Make it robust at any cost — including alternate flag fallbacks, alternate paths, and a hard offline fallback.
2. **Replace "enrich my draft"** with **"draft a complete prompt from refs + user intent"** — the new flow takes the uploaded reference(s) plus the user's short instruction ("change the background", "make it look like X") and produces a fully-formed model-ready prompt.
3. **Per-reference toggle "input vs prompt-only"** — already implemented as `intent` (`generation` / `prompt-only`) but needs to be the explicit primary control in the new flow and surfaced clearly in Gallery + StatusBar.
4. **Gallery represents uploaded references only** — stop mirroring every generation into the `images` table. Generated images live in `generations` only; gallery shows what the user uploaded (or explicitly promoted via `u`).
5. **Delete = remove from gallery, keep source file** — `db.deleteImage()` currently `unlinkSync(path)` the underlying file. Remove the DB row only; keep the upload on disk.
6. **`u` hotkey = promote the LATEST generated image to ref** — currently it operates on the highlighted gallery item and skips `generation-copy`. Rebind to "take the most recent generation, add it to gallery as a reference."
7. **Drag-and-drop uploads** — `AddFileModal` only accepts typed paths. Wire it to accept terminal paste of file paths (macOS Terminal/iTerm2 paste a path when you drop a file on the window), including multi-path paste, with clipboard support too.
8. **Direct terminal image preview, not ASCII half-block** — current fallback for non-Kitty/iTerm2 terminals is `terminal-image` half-block. Add chafa shell-out (kitty/iterm/sixel/symbols) with graceful fallback so users on more terminals see real pixels.
9. **API key rotation must take effect without restart** — `image-engine/src/wisgate.ts` falls back to the subprocess's startup `process.env.WISDOM_GATE_KEY` snapshot. Remove the stale fallback, drop the mtime cache, and add a "reload key" affordance in pinboard that kills the image-engine child so it respawns with fresh env.

## Objective

After this plan ships:
- A user uploads one or more references, types a short intent ("make the bag red, keep model pose"), presses the new `w` (or rebound key) — Claude vision sees the marked-as-input refs, the prompt-writer combines that vision output with the user's intent and the model's prompt-structure guide, and the result is a complete generation-ready prompt.
- Per-ref intent toggle is visible in Gallery (small badge `IN` / `DRAFT`) and the prompt panel surfaces "N inputs / M draft-only".
- Gallery never auto-fills from generations.
- Deleting a gallery item never deletes the file under `uploads/`.
- `u` always promotes the newest generation to gallery (regardless of selection).
- Adding a file accepts pasted absolute paths (one or many, newline/space-separated), drag-onto-terminal paths, and clipboard image bytes where supported.
- Preview shows real-pixel images on every terminal that supports any of: Kitty, iTerm2, Sixel, or has `chafa` installed.
- Editing `.env` and pressing the new "reload key" command (or the budget refresh) picks up the new key on the next generate without restarting pinboard.

## Problem Statement

The previous overhaul shipped the structural pieces (intent toggle, generation-copy mirror, vision probe) but the semantics drifted from the engineer's mental model:

- Vision is conceptually "Claude looks at the reference and tells the prompt-writer what's in it." Today it's "Claude rewrites the user's existing prompt, optionally with an image attached." Different control flow, different output, and on this machine the CLI invocation isn't producing usable output.
- Gallery has slowly become a dump of every generation, which makes it useless for picking input refs and grows unbounded.
- `u` is overloaded onto the gallery cursor, which conflicts with the intent toggle (which also targets the cursor).
- API key rotation requires a full process restart because the subprocess has captured a stale `process.env` value.

These aren't independent bugs — they're symptoms of the same drift: the data model and hotkey mapping aren't aligned with the user's actual workflow.

## Solution Approach

Three coordinated edits to the data model and one orthogonal infra fix:

**(A) Data model**: Stop mirroring generations into `images`. The `images` table becomes "user references only." Generations remain in `generations`. Preview pane reads generations directly. Gallery reads images. The `u` hotkey is the explicit bridge from generations → images.

**(B) Prompt flow**: Replace `enrichWithGuide(draftPrompt, model, {imagePath})` with a new `draftFromRefs(intent, model, {inputRefs, draftRefs})` entry point. Vision is invoked once with all refs (input + draft-only), receives the user's intent string, and returns a complete prompt. The model guide's `promptStructure` is still passed so the result conforms.

**(C) Vision robustness**: Four fixes stacked: (1) probe more aggressively — try `claude --version`, `which claude`, `command -v claude`, and look in `~/.claude/local/`, `/usr/local/bin`, Homebrew prefix; (2) invocation tries `--print`, `-p`, then `@<path>` arg form, then stdin pipe with image base64 in a heredoc; (3) **opt-in Anthropic SDK fallback** — if all CLI paths fail and `PINBOARD_ALLOW_API=1` is set in the environment, use `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY` to call `claude-opus-4-7` directly. Default-off to honor the existing "no paid API" decision; opt-in flag named so it's obvious in logs why a paid call happened; (4) if SDK fallback is disabled or also fails, fall back to a deterministic prompt-builder that interpolates the user intent into the model guide template (no vision, but still a usable prompt). Cache invalidated on capital `R` ("reload tools") hotkey.

**(D) Key rotation**: In `image-engine/src/wisgate.ts`, replace the mtime-cached + process.env fallback with always-fresh dotenv read + explicit error if missing. In pinboard, add a "kill image-engine + respawn" command bound to a key (e.g., capital `R` in any pane) that triggers `ensureUp` to spawn fresh.

## Relevant Files

### Pinboard TUI (primary)

- `systems/pinboard/tui/src/services/claudevision.ts` — vision probe + invocation. Rework `probeAtStartup`, add fallback invocation chain, expose `invalidateProbeCache()`.
- `systems/pinboard/tui/src/services/promptwriter.ts` — replace `enrichWithGuide` semantics; add `draftFromRefs(intent, model, refs)` that calls `claudevision.draftPrompt(intent, refsForVision, modelGuide)`.
- `systems/pinboard/tui/src/services/db.ts` — remove the auto-mirror block in `recordGeneration` (lines ~143-155 per exploration). Stop writing `source: "generation-copy"` rows. Update `deleteImage` to skip `unlinkSync` (keep on disk). Add migration `002_drop_generation_copies.sql` to clean stale rows.
- `systems/pinboard/tui/src/hooks/useReferences.ts` — `addFromGeneration` should now be the single path that copies a generation file into `uploads/` and inserts an `images` row. Adjust delete to no-op the file unlink.
- `systems/pinboard/tui/src/hooks/useGenerations.ts` — expose `latestId()` so the new `u` binding can target the most recent generation regardless of UI selection.
- `systems/pinboard/tui/src/App.tsx` — rewire `useHighlightedAsRef` → `useLatestAsRef`. Replace `enhanceDraft` → `draftPromptFromIntent`. Add `R` keybind for "reload tools" (probe + restart image-engine).
- `systems/pinboard/tui/src/screens/AddFileModal.tsx` — accept multi-line paste, treat each line as a path, accept whitespace-separated paths on a single line, optional drop of leading `file://` URI prefix.
- `systems/pinboard/tui/src/screens/PromptPanel.tsx` — add a dedicated **Intent** input above the existing prompt textarea (one line, persistent after draft). Show "INPUTS: N · DRAFT-ONLY: M" tally row. Intent is the input to `draftFromRefs`; the textarea below is filled by the drafted prompt and is what actually feeds generation. Pressing `w` reads from Intent, writes the draft into the textarea below, leaves Intent untouched so the user can iterate.
- `systems/pinboard/tui/src/screens/Gallery.tsx` — render intent badge (`IN`/`DRAFT`) per row.
- `systems/pinboard/tui/src/screens/Preview.tsx` — render the latest generation explicitly (not via the gallery row).
- `systems/pinboard/tui/src/utils/imageProtocol.ts` — add `chafa` shell-out branch (detect via `which chafa` once, cache in module). Order: Kitty → iTerm2 → chafa(`--format=sixel` if `$TERM_PROGRAM` supports, else `--symbols=block+border+space`) → terminal-image half-block. Document the precedence.
- `systems/pinboard/tui/src/services/imageengine.ts` — add `restart()` that kills the existing detached child by PID file (or by port-bind probe) and re-runs `ensureUp()`.

### Image Engine (one targeted fix)

- `systems/image-engine/src/wisgate.ts` — remove `dotenvCache` mtime gating, always read `.env` fresh; remove `process.env.WISDOM_GATE_KEY` fallback in `getApiKey()` so the subprocess can't serve a stale key. If `.env` is unreadable, throw with a clear "Reload key (R) in pinboard or restart image-engine" message.

### New Files

- `systems/pinboard/tui/migrations/002_drop_generation_copies.sql` — `DELETE FROM images WHERE source = 'generation-copy';`
- `systems/pinboard/tui/src/services/clipboard.ts` — small wrapper around macOS `pbpaste` (and Linux `wl-paste`/`xclip`) for pulling pasted file paths or raw image bytes; used by `AddFileModal`.
- `systems/pinboard/tui/src/services/preview.ts` — extracted protocol-detection layer that the new `chafa` branch lives in (could also stay in `imageProtocol.ts`; split for testability).

## Implementation Phases

### Phase 1: Foundation (data model + key rotation)

- Migration 002 ships first; existing `generation-copy` rows are removed.
- `db.recordGeneration` no longer writes to `images`.
- `db.deleteImage` no longer `unlinkSync`s.
- `wisgate.ts` is fixed (no stale fallback, no mtime cache).
- `imageengine.ts` exposes `restart()`.

This phase is independently shippable and unblocks every subsequent change.

### Phase 2: Vision + prompt drafting rewrite

- `claudevision.ts` gets the multi-stage probe + invocation chain + `invalidateProbeCache`.
- `promptwriter.ts` gains `draftFromRefs(intent, model, refs)` and the legacy `enrichWithGuide` is kept as a thin shim (delegating to the new function with empty refs) for any tests still on it, then removed.
- `App.tsx` is rewired: `enhanceDraft` → `draftPromptFromIntent`; `useHighlightedAsRef` → `useLatestAsRef`; capital `R` invokes `imageengine.restart()` + `claudevision.invalidateProbeCache()`.
- `useGenerations.latestId()` and `useReferences` adjustments land here.

### Phase 3: Upload UX, preview, surface polish

- `AddFileModal` accepts multi-path paste + clipboard image.
- `imageProtocol.ts` gains `chafa` branch with graceful fallback.
- `PromptPanel` shows the `N inputs / M draft-only` tally and exposes the intent input.
- `Gallery` renders intent badges.
- README + `knowledge/domain.md` updated to reflect new semantics, new hotkeys, and the key-rotation flow.

## Team Orchestration

- I act as the team lead. I never edit code directly during execution; team members own the diffs.
- Each phase has a builder. Validation is a single dedicated agent at the end of each phase plus a final cross-phase check.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Phase 1 — schema migration, db semantics, key rotation, image-engine restart
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-vision
  - Role: Phase 2 — claudevision probe/invocation overhaul, promptwriter rewrite, App.tsx rewiring, hotkey rebinding
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-ux
  - Role: Phase 3 — AddFileModal paste/drag, chafa preview integration, PromptPanel + Gallery polish, knowledge/README updates
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-phase
  - Role: After each phase, validate behavior against acceptance criteria; read-only
  - Agent Type: validator
  - Resume: false (fresh context per phase for independence)

- Validator
  - Name: validator-final
  - Role: End-to-end soft-acceptance review across all three phases
  - Agent Type: adcelerate-validator
  - Resume: false

## Step by Step Tasks

### 1. Create migration 002 + run it
- **Task ID**: migration-drop-generation-copies
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Add `systems/pinboard/tui/migrations/002_drop_generation_copies.sql` containing `DELETE FROM images WHERE source = 'generation-copy';`
- Wire migration into `db.ts` migration runner (it currently runs `001_add_source_column.sql`).
- Manually run pinboard once and confirm gallery is reference-only.

### 2. Stop mirroring generations into images
- **Task ID**: stop-mirror-generations
- **Depends On**: migration-drop-generation-copies
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- In `db.ts` `recordGeneration`, remove the block that inserts a row into `images` with `source: "generation-copy"`.
- Update related types in `services/types.ts` so `source` no longer includes `generation-copy` (or keep but mark deprecated for the existing migration).
- Update unit test `db.test.ts` to assert the mirror does not happen.

### 3. Soft-delete: remove unlink in deleteImage
- **Task ID**: soft-delete-references
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true
- In `db.ts` `deleteImage`, drop the `unlinkSync(path)` call. Keep the file on disk under `uploads/`.
- Document the decision in a one-line comment (the WHY: deletion is gallery-only by design).
- Update `db.test.ts` to assert the file persists after delete.

### 4. Image-engine key rotation fix
- **Task ID**: wisgate-fresh-key
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true
- In `systems/image-engine/src/wisgate.ts`:
  - Remove `dotenvCache` and the mtime gating in `readKeyFromDotenv`.
  - In `getApiKey()`, drop the `process.env.WISDOM_GATE_KEY` fallback. If `readKeyFromDotenv()` returns null, throw `"WISDOM_GATE_KEY missing — edit .env and press R in pinboard"`.
- Add a unit test that mutates a temp `.env` between two `getApiKey()` calls and asserts the second call returns the new value.

### 5. Image-engine restart() in pinboard
- **Task ID**: imageengine-restart
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true
- In `systems/pinboard/tui/src/services/imageengine.ts` add `restart()`:
  - Probe `localhost:3002` for the bun process; on macOS use `lsof -i:3002 -t` to find PID, `kill <pid>`.
  - After confirming port is free (poll up to 3s), call existing `ensureUp()`.
- Bind capital `R` in `App.tsx` to call `imageengine.restart()` + `claudevision.invalidateProbeCache()`. Surface a status flash "tools reloaded".

### 6. Phase 1 validation
- **Task ID**: validate-phase-1
- **Depends On**: migration-drop-generation-copies, stop-mirror-generations, soft-delete-references, wisgate-fresh-key, imageengine-restart
- **Assigned To**: validator-phase
- **Agent Type**: validator
- **Parallel**: false
- Run pinboard tui tests: `cd systems/pinboard/tui && bun test`
- Run image-engine tests: `cd systems/image-engine && bun test`
- Manual: upload a ref, generate once, confirm gallery row count unchanged. Delete the ref, confirm `uploads/<file>` still exists.
- Manual: edit `.env` `WISDOM_GATE_KEY`, press `R`, generate, confirm new key in use (logs).

### 7. Vision probe + invocation overhaul + SDK fallback
- **Task ID**: vision-robust-invocation
- **Depends On**: validate-phase-1
- **Assigned To**: builder-vision
- **Agent Type**: builder
- **Parallel**: false
- In `claudevision.ts`:
  - Replace `probeAtStartup` with a layered probe: `which claude`, then `command -v`, then check `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`.
  - Cache result in `probeCache`; expose `invalidateProbeCache()`.
  - Invocation chain in `enhancePrompt`/`draftPrompt`: try `claude --print "<prompt>" <imagePath>`, fall back to `claude -p "<prompt>" <imagePath>`, fall back to `claude -p "<prompt>" @<imagePath>`, fall back to piping prompt via stdin with attached base64.
  - On every failure path, log the actual stderr to `logs/claudevision.log` so we can debug live.
- Add **opt-in SDK fallback** in a separate file `systems/pinboard/tui/src/services/claudesdk.ts`:
  - Only activated when `process.env.PINBOARD_ALLOW_API === "1"` AND CLI invocation chain has fully failed.
  - Uses `@anthropic-ai/sdk` (add via `bun add @anthropic-ai/sdk` in `tui/`); reads `process.env.ANTHROPIC_API_KEY`; calls `claude-opus-4-7` with the image as base64-encoded `image` content block.
  - Logs explicitly: `"vision: SDK fallback active (PINBOARD_ALLOW_API=1) — paid API call"` so the user always knows when they're billed.
  - If `PINBOARD_ALLOW_API` is unset/0, this path is never taken; deterministic fallback fires instead.
- Update `claudevision.test.ts` to mock each CLI invocation path; add `claudesdk.test.ts` with mocked SDK that asserts the env-flag gate.

### 8. Promptwriter draftFromRefs
- **Task ID**: promptwriter-draft-from-refs
- **Depends On**: vision-robust-invocation
- **Assigned To**: builder-vision
- **Agent Type**: builder
- **Parallel**: false
- In `promptwriter.ts` add:
  ```ts
  draftFromRefs(intent: string, model: string, refs: { inputs: string[]; draftOnly: string[] }): Promise<string>
  ```
- Pass all refs to `claudevision.draftPrompt(intent, [...inputs, ...draftOnly], modelGuide)` with a system-style preamble that says "the following images marked INPUT will be used as the actual generation refs; the others are context only — describe what is in them and craft a complete prompt that achieves the user's stated intent following the model's promptStructure."
- Cascade order inside `draftPrompt`: CLI invocation chain → (if `PINBOARD_ALLOW_API=1`) SDK fallback → deterministic template.
- Deterministic fallback (no vision available, no SDK): interpolate `intent` into the model guide template, prepend a stub describing N input refs by filename.

### 9. Rewire App.tsx hotkeys + flow
- **Task ID**: app-rewire-flow
- **Depends On**: promptwriter-draft-from-refs
- **Assigned To**: builder-vision
- **Agent Type**: builder
- **Parallel**: false
- Replace `enhanceDraft()` with `draftPromptFromIntent()`: reads the intent input + the intent-tagged refs, calls `promptwriter.draftFromRefs`, writes result into the prompt buffer.
- Replace `useHighlightedAsRef()` with `useLatestAsRef()`: looks up `gens.latestId()`, calls `refs.addFromGeneration(latestId)`. Bind to `u`.
- Bind capital `R` to `imageengine.restart() + claudevision.invalidateProbeCache()` (from task 5).
- Update `useKeyboard` and `HelpOverlay` to reflect the new bindings.

### 10. Phase 2 validation
- **Task ID**: validate-phase-2
- **Depends On**: app-rewire-flow
- **Assigned To**: validator-phase
- **Agent Type**: validator
- **Parallel**: false
- Run all tui tests.
- Manual: upload a reference, type intent "make the bag red", press `w` — confirm vision is hit and a complete prompt appears (or the deterministic fallback fires with a clear log line).
- Manual: with a generation present, press `u` — confirm the latest generation lands in gallery as a new reference (not the highlighted item).
- Manual: confirm capital `R` invalidates probe and restarts image-engine.

### 11. Drag-and-drop in AddFileModal
- **Task ID**: addfile-multi-paste
- **Depends On**: validate-phase-2
- **Assigned To**: builder-ux
- **Agent Type**: builder
- **Parallel**: true
- Replace single-line `TextInput` with a multi-line input or hook stdin paste detection (Ink's `useInput` raw bytes).
- Each line / whitespace-separated chunk treated as a path.
- Strip leading `file://` URI prefix; resolve `~`.
- If clipboard has image bytes (pbpaste -Prefer image/png returns data on macOS), write to a temp file under `uploads/` and add it.
- Add `services/clipboard.ts` wrapping `pbpaste` / `wl-paste` / `xclip` lookups.

### 12. Direct-pixel preview via chafa
- **Task ID**: chafa-preview
- **Depends On**: validate-phase-2
- **Assigned To**: builder-ux
- **Agent Type**: builder
- **Parallel**: true
- In `imageProtocol.ts`:
  - Detect `chafa` once at module load via `which chafa`; cache result.
  - New ordering: Kitty native → iTerm2 native → chafa-sixel (if terminal supports sixel: WezTerm/foot/mlterm/xterm-with-sixel) → chafa-symbols (best universal) → terminal-image half-block.
  - Shell out to `chafa` with `--size=COLSxROWS --format=sixel|symbols`, capture stdout, return as the rendered payload.
- Document the precedence in a one-line comment.
- Update `ImageThumb` if needed (likely no change — it just renders the payload string).

### 13. PromptPanel + Gallery polish
- **Task ID**: ui-polish
- **Depends On**: validate-phase-2
- **Assigned To**: builder-ux
- **Agent Type**: builder
- **Parallel**: true
- `PromptPanel`: add a dedicated **Intent** input box above the existing prompt textarea (one line, persists after drafting so the user can iterate on the same intent and re-draft). Show `INPUTS: 2 · DRAFT-ONLY: 1` tally row inside the panel. Pressing `w` reads from Intent, writes the drafted prompt into the textarea below, leaves Intent unchanged. Tab cycles focus between Intent input and the prompt textarea.
- `Gallery`: render an `IN`/`DRAFT` badge next to each row using the existing intent map.
- `HelpOverlay`: list the new bindings (`u`, `t`, `w`, `R`).

### 14. Docs + knowledge update
- **Task ID**: docs-update
- **Depends On**: ui-polish, addfile-multi-paste, chafa-preview
- **Assigned To**: builder-ux
- **Agent Type**: builder
- **Parallel**: false
- Update `systems/pinboard/README.md` with the new flow and hotkeys.
- Add `knowledge/key-rotation.md` documenting the `R` key + the wisgate.ts behavior.
- Add a short note under `knowledge/domain.md` clarifying gallery = uploads only.

### 15. Final cross-phase validation
- **Task ID**: validate-all
- **Depends On**: docs-update, addfile-multi-paste, chafa-preview, ui-polish
- **Assigned To**: validator-final
- **Agent Type**: adcelerate-validator
- **Parallel**: false
- Run full test sweep: `cd systems/pinboard/tui && bun test && cd ../../image-engine && bun test`.
- Soft-acceptance walk: simulate the full new flow end-to-end: upload two refs (one tagged INPUT, one tagged DRAFT), type intent, press `w`, generate, press `u`, delete one ref, confirm file persists, rotate key, press `R`, generate again.
- Confirm gallery never contains a `generation-copy` row.
- Produce a structured validation report and post back to the team lead.

## Acceptance Criteria

1. Vision: pressing the new "draft from refs" hotkey produces a model-ready prompt; if Claude CLI is unavailable, the deterministic fallback fires with a visible log entry — never silent failure, never empty prompt.
2. Prompt flow: the `intent → vision → complete prompt → generate` path is the default; the old "enrich my draft" path is removed or hidden.
3. Toggle `t` flips intent between `generation` and `prompt-only`; gallery renders a visible `IN`/`DRAFT` badge per row; PromptPanel shows the tally.
4. Gallery never gains a row from a generation unless the user pressed `u`.
5. Pressing `u` adds the **most recent** generation to gallery — independent of which gallery row is highlighted.
6. Deleting a gallery row removes the DB row but leaves the file under `uploads/` intact (verified via `ls uploads/` after delete).
7. AddFileModal accepts: typed path, pasted single path, pasted multi-line list of paths, paths with `file://` prefix, and a clipboard image (where pbpaste/wl-paste returns image bytes).
8. Preview displays real pixels (Kitty / iTerm2 / Sixel / chafa-symbols) on every supported terminal, with `terminal-image` half-block only as last resort. The precedence is documented.
9. After editing `.env` and pressing capital `R`, the next generate uses the new key without restarting pinboard. With no further edits, subsequent generates also use the new key.
10. All existing tests pass; new tests cover: db.deleteImage no-unlink, wisgate fresh-key, claudevision invocation chain, draftFromRefs fallback path.

## Validation Commands

- `cd /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/tui && bun test` — full pinboard test sweep
- `cd /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine && bun test` — image-engine tests (covers wisgate fix)
- `cd /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard && bun run tui/src/cli.tsx` — manual smoke; walk acceptance criteria 1, 5, 6, 9 by hand
- `which chafa || brew install chafa` — required for the preview branch on this machine
- `sqlite3 /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/pinboard.db "SELECT count(*) FROM images WHERE source='generation-copy';"` — must return 0 after Phase 1
- `ls /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard/uploads/` before and after deleting a gallery row — file must persist

## Notes

- **`chafa` is a system binary, not a node dep.** Add a one-line note in `systems/pinboard/README.md` ("optional: `brew install chafa` for best preview"). The fallback chain still works without it.
- **No new node dependencies are strictly required.** Clipboard support uses the OS binaries (`pbpaste`, `wl-paste`, `xclip`) which are present on every dev machine here. If we need a typed wrapper later, `clipboardy` works but I'd rather avoid the dependency.
- **Plan deliberately keeps the legacy `enrichWithGuide` shim around for one release** to keep tests green, then the cleanup commit removes it. This matches the user's preference for one bundled PR per refactor area, not micro-commits.
- **Why no `--no-mirror` flag for the gallery instead of removing the mirror entirely**: the user is explicit that gallery represents uploads. A flag is yagni; just remove the mirror.
- **Why fix `wisgate.ts` instead of always passing the key from pinboard per-request**: the per-request rewrite is a bigger refactor and the current architecture is "image-engine owns the key." Fix the cache and the fallback; defer the architectural change.
- **Vision "any hack" caveat**: the layered probe + invocation chain is the first line. The SDK fallback is wired in but gated behind `PINBOARD_ALLOW_API=1` so the default-off behavior preserves the codebase's "no paid API" decision; the user opts in by exporting the flag in their shell when they want guaranteed vision and are OK paying. Logs make it loud and explicit when SDK is firing.
- **Required new dep for SDK fallback**: `bun add @anthropic-ai/sdk` inside `systems/pinboard/tui/`. No other new node deps are introduced.
