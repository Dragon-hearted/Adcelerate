# Plan: Pinboard UI Overhaul + Vision/Refs/Budget/PromptWriter Fixes

> Note: `/plan_w_team` normally targets `specs/`. Plan mode restricts edits to this single file, so the canonical plan lives here. After approval, copy/move to `specs/pinboard-ui-overhaul.md` before `/build`.

## Task Description

The pinboard TUI (`systems/pinboard/tui`) needs a layout reshuffle plus several functional fixes the user surfaced in one prompt:

1. **Layout**: gallery left, preview right, prompt input below both (full width), command hints below the prompt.
2. **Gallery pointer**: cursor movement currently only works when the gallery pane is focused (`j/k`). User wants a movable pointer that always advertises itself and updates the selected thumb correctly.
3. **Vision draft broken**: `v` flow uses `claude -p ... --image …` (`tui/src/services/claudevision.ts:158`). It fails silently when the local `claude` CLI lacks an image-attach flag — error is shown only as `lastError` text in the prompt panel; user reads this as "vision can't be done."
4. **Reference intent missing**: backend already accepts `{generation, promptOnly}` (`tui/src/hooks/useGenerations.ts:108`), but the UI never lets the user mark a ref as prompt-only. User wants: pick a ref → choose "use for drafting prompt only" vs "use as ref for generation."
5. **Preview history inaccessible**: `genIndex` auto-snaps to 0 on every new generation (`App.tsx:200`); history nav (`j/k` in preview pane) is hard to reach because `Tab` cycles through the prompt pane and the user doesn't know `j/k` only work when preview is focused.
6. **Preview text/image overlap**: long prompts are truncated to 200 chars (`Preview.tsx:70`) but `ImageThumb` rendering can spill past its 24×10 cell box in some terminals, visually overlapping the metadata block below.
7. **Budget not real-time**: polled every 10 s (`useImageEngine.ts:17`); not refreshed immediately after a generation completes; statusbar shows spent/ceiling but not "used vs remaining" labels.
8. **`x` clear is too aggressive**: clears images + generations + orphans (`App.tsx:156`). User wants `x` to only wipe the gallery uploads and the prompt draft — keep generation history.
9. **PromptWriter enrichment not exposed**: `promptwriter.applyTemplate` does deterministic formatting only; user wants a key that takes a vague draft (+ optional vision) and returns a high-quality prompt structured per the model guide.
10. **Single-line text input**: `@inkjs/ui`'s `TextInput` is single-line (`PromptPanel.tsx:81`). User wants a multiline editor with arrow-key navigation, similar to Claude Code's input area.

## Objective

Ship a pinboard release where every item above behaves correctly, the layout matches the requested geometry, and existing tests still pass. No regressions on Pinterest/AddFile flows, model picker, or aspect ratio picker.

## Problem Statement

The current layout was designed when prompt + preview both fit in narrow side panes. As features grew (multiline prompts, history, references with intent), the side-pane geometry stopped scaling: gallery is squeezed, prompt is single-line, preview text overflows, and key affordances (history nav, ref intent, prompt enrichment) are buried or missing. Vision and budget have specific functional gaps masquerading as UX problems.

## Solution Approach

Refactor the App shell into a top-row / mid-row / bottom-row vertical stack, replace the prompt input with a custom multiline editor, surface ref intent + history nav + budget state directly in the visible panes, and wire two new programmatic flows through `claudevision`/`promptwriter` (vision-aware enrichment, vision diagnostics).

Keep all DB schemas, services, and ImageEngine wire formats unchanged — only `useGenerations.generate` already supports `promptOnlyRefIds`, so we just need to expose intent in `useReferences` + the gallery and pass it through.

## Relevant Files

Use these files to complete the task:

- `systems/pinboard/tui/src/App.tsx` — top-level layout rewrite, command-hints row, narrowed `clearAll`, new `enhancePrompt` callback wired to a key.
- `systems/pinboard/tui/src/screens/Gallery.tsx` — visible pointer indicator, intent badge per ref, arrow-key support pre-wired to `useKeyboard`.
- `systems/pinboard/tui/src/screens/Preview.tsx` — fix overlap (Box flexShrink + explicit gap), persistent history index, position pill, viewer-mode hint.
- `systems/pinboard/tui/src/screens/PromptPanel.tsx` — swap `TextInput` for new `MultilineEditor`; add command-hints renderer beneath the editor.
- `systems/pinboard/tui/src/screens/HelpOverlay.tsx` — refresh keybindings list.
- `systems/pinboard/tui/src/components/StatusBar.tsx` — render `used / remaining` budget breakdown alongside spent/ceiling; subscribe to a `forceRefresh()` triggered after each generation.
- `systems/pinboard/tui/src/hooks/useKeyboard.ts` — add prompt-pane keymap dispatch when not in capture mode; allow arrow keys; add `addModifierKeymap` so `w` (enhance), `t` (toggle ref intent) and `Shift+J/K` (history) flow correctly.
- `systems/pinboard/tui/src/hooks/useReferences.ts` — track per-ref `intent: "generation" | "prompt-only"`; persist in-memory map (no DB migration required for v1).
- `systems/pinboard/tui/src/hooks/useGenerations.ts` — already supports split refs; just plumb intent map from caller.
- `systems/pinboard/tui/src/hooks/useImageEngine.ts` — expose `refreshBudget()` so callers can force a poll after `generate()` resolves.
- `systems/pinboard/tui/src/services/claudevision.ts` — add `probeAtStartup()` result surfaced via a new hook; add `enhancePrompt({draft, modelName, imagePath?})` that injects the PromptWriter guide as the system instruction.
- `systems/pinboard/tui/src/services/promptwriter.ts` — add `enrichWithGuide(draft, modelName, opts)` helper that loads guide sections and calls `claudevision` to produce a structured prompt; fall back to `applyTemplate` if `claude` CLI absent.

### New Files

- `systems/pinboard/tui/src/components/MultilineEditor.tsx` — custom Ink multiline text editor. Tracks `lines: string[]`, `cursor: {row, col}`. Handles printable input, Backspace, Delete, Enter (newline), arrow keys, Home/End, Ctrl+A/E, Ctrl+K, Ctrl+U. `Shift+Enter` inserts newline; `Enter` submits; `Esc` exits to gallery. Renders bordered Box; uses `useInput` only when `focused`.
- `systems/pinboard/tui/src/components/CommandHints.tsx` — full-width row that renders the active pane's keymap as `[key] label` chips, color-coded.
- `systems/pinboard/tui/src/components/PointerCursor.tsx` (optional) — small wrapper used by `Gallery` to render a colored chevron `▶` next to the active row, with a subtle blink dim/bright cycle (interval) so the pointer is visibly "alive."

## Implementation Phases

### Phase 1: Foundation

- New `MultilineEditor` component (used by `PromptPanel`) with full keyboard contract.
- `useKeyboard` updates: route arrow keys + Shift-prefixed keys; allow prompt-pane keymap to coexist with the editor's own input capture (delegate non-printable chords like `Ctrl+w`, `Esc`, `Tab` to the keymap; printable text stays in the editor).
- `useReferences` extension: in-memory `intentMap: Map<id, "generation" | "prompt-only">`, default "generation"; selectors `getGenerationRefIds(tokens)` / `getPromptOnlyRefIds(tokens)` derived at generate-time.

### Phase 2: Core Implementation

- `App.tsx` layout rewrite (top row: Gallery left + Preview right; mid row: PromptPanel full width; below: CommandHints; bottom: StatusBar). Drop the old 3-column horizontal layout entirely.
- `Gallery.tsx` adds visible pointer cursor + per-ref intent badge (`gen` / `draft`).
- `Preview.tsx` re-flows: image at top with explicit `flexShrink: 0`, then a `Box flexDirection="column"` for metadata with `marginTop=1` separators; history `position` pill always visible.
- `App.tsx` removes auto-snap on `newestGenId`; instead, when a generation arrives while user is mid-history, keep `genIndex` pinned to its current generation id and offer a "new ↑" indicator.
- New `claudevision.enhancePrompt({draft, modelName, imagePath?})`: shells to `claude -p` with `${guide.sections.promptStructure}\n\nUser draft:\n${draft}` as the instruction and the optional image as attach.
- New `promptwriter.enrichWithGuide` wrapper that calls `claudevision.enhancePrompt`, falls back to `applyTemplate` if `ClaudeUnavailableError`.
- Narrow `clearAll`: `clearGalleryAndPrompt` deletes upload-source images only (`db.deleteImagesBySource('upload')` — add helper) + clears `draft` state. Generation history preserved.
- `useImageEngine.refreshBudget` exposed; `useGenerations.generate` calls it after success.
- `StatusBar` budget display: `spent ($X / $Y) · used N% · remaining $Z`.

### Phase 3: Integration & Polish

- HelpOverlay updated with the new keymap.
- CommandHints renders a fixed canonical map per focus state (gallery / prompt / preview).
- Add `claudevision.probeAtStartup` consumed by a `useVisionStatus` hook; surface `Vision: ready | unavailable` chip in StatusBar so user knows immediately whether `v`/`w` will succeed.
- Run `bun test` + `bun run typecheck` from `systems/pinboard/tui`. Manual smoke test: launch `bun run dev`, verify each fix listed in §Acceptance Criteria.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to do the building, validating, testing, and deploying.
- The user said "do not use subagents/local agents" — interpret as: avoid the generic `Explore`/`Plan` agents during execution; rely on `.claude/agents/team/*.md` (`builder`, `validator`) deployed via `Task`. Each builder is single-purpose and short-lived. No nested agent spawning inside builders.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-shell
  - Role: Refactor `App.tsx` shell into the new vertical layout (Gallery+Preview top row, PromptPanel mid row, CommandHints, StatusBar). Narrow `clearAll`. Wire new keymaps and refs intent map.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-editor
  - Role: Implement `MultilineEditor.tsx` and integrate into `PromptPanel.tsx`. Update `useKeyboard.ts` so prompt-pane chords coexist with the editor.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-services
  - Role: Implement `claudevision.enhancePrompt`, `promptwriter.enrichWithGuide`, `useImageEngine.refreshBudget`, `db.deleteImagesBySource`, and `claudevision.probeAtStartup` + `useVisionStatus`. No UI changes.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-panes
  - Role: Update `Gallery.tsx` (pointer + intent badges), `Preview.tsx` (overlap fix + persistent history index + new-arrival indicator), `StatusBar.tsx` (used/remaining), `HelpOverlay.tsx`, and add `CommandHints.tsx`.
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-final
  - Role: Run `bun test` + `bun run typecheck`, manually verify acceptance criteria via code review (no UI screenshot capability), report pass/fail per criterion.
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Implement Multiline Editor + Keymap Routing

- **Task ID**: editor-multiline
- **Depends On**: none
- **Assigned To**: builder-editor
- **Agent Type**: builder
- **Parallel**: true
- Create `tui/src/components/MultilineEditor.tsx`. Manage `lines: string[]` + `cursor: {row, col}` via `useState`. Use `useInput` from `ink` only when `focused`.
- Support: printable chars insert at cursor; `Backspace`/`Delete` remove; `Enter` submits via `onSubmit(value)`; `Shift+Enter` inserts a newline (use `key.shift && key.return`); arrow keys move cursor with row clamping; `Home`/`End` jump to line edges; `Ctrl+A` start of line, `Ctrl+E` end of line, `Ctrl+K` kill to end, `Ctrl+U` kill to start.
- Render bordered Box, line-by-line, render a block cursor at `cursor` using inverse text color.
- Update `tui/src/screens/PromptPanel.tsx` to use `MultilineEditor` instead of `@inkjs/ui` `TextInput`. Preserve `defaultValue`, `onChange`, `onSubmit` semantics.
- Update `tui/src/hooks/useKeyboard.ts`:
  - When `captureMode` is true, allow `Esc` (exit) + `Tab` (commit + cycle) only — but **also** allow chords with `key.ctrl` to bubble up to the pane keymap (so `Ctrl+w`/etc. work while editing). Printable + arrow keys belong to the editor.
  - Add a `promptKeymap` consumer in `App.tsx` (currently empty) — exposing `w` (enhance), `t` (toggle ref intent for last @ref) for use **outside** capture mode (i.e., when prompt pane focused but editor not actively typing — TBD; alternative: keep all such chords on `gallery` focus).
- Decision to record in PR: prompt-pane chords will live on **gallery focus** to avoid chord/text conflicts. Editor inside prompt panel is full-screen for typing only.

### 2. Implement Service Layer Additions

- **Task ID**: services-additions
- **Depends On**: none
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: true
- `services/claudevision.ts`: add exported `enhancePrompt({draft, modelName, imagePath?, timeoutMs?, binary?})`. Compose instruction = `(loadModelGuide(modelName).sections.promptStructure ?? "") + "\n\n" + DRAFT_PROMPT_INSTRUCTION + "\n\nUser draft:\n" + draft`. Reuse internal spawn + image-flag detection from `draftPrompt`. Return `string`.
- `services/claudevision.ts`: add `probeAtStartup()` returning the cached `ProbeResult`; cache result for the process lifetime in a module-scope variable.
- `services/promptwriter.ts`: add `enrichWithGuide(draft, modelName, opts)` that calls `claudevision.enhancePrompt`, on `ClaudeUnavailableError` falls back to `applyTemplate(draft, modelName)`. Re-export so `App.tsx` can call one symbol.
- `services/db.ts`: add `deleteImagesBySource(source: ImageSource): { rows: number; files: number }` mirroring `deleteAllImages` but filtered. Also add `purgeUploadOrphans` reuse — keep existing.
- `hooks/useImageEngine.ts`: extend `UseImageEngineApi` with `refreshBudget(): Promise<void>`; expose the existing `refreshBudget` closure outward via the returned object.
- `hooks/useVisionStatus.ts` (new): tiny hook calling `claudevision.probeAtStartup()` once on mount; returns `"ready" | "unavailable" | "checking"` + the failure reason.
- Add unit tests (services layer):
  - `services/claudevision.test.ts`: new test for `enhancePrompt` invoking the same spawn mock plumbing as `draftPrompt` tests; assert composed instruction includes the model guide's `promptStructure` section + the user draft.
  - `services/claudevision.test.ts`: new test for `probeAtStartup()` caching across calls (only one `claude --version` spawn).
  - `services/promptwriter.test.ts`: new test for `enrichWithGuide` happy path (claude available) + fallback to `applyTemplate` when `claudevision` throws `ClaudeUnavailableError`.
  - `services/db.test.ts`: new test for `deleteImagesBySource('upload')` leaves `generation-copy` and `pinterest` rows untouched and unlinks only upload files.
- Add hook tests (new `hooks/*.test.ts` files using `@testing-library/react` + Bun's test runner, isolated from Ink rendering):
  - `hooks/useReferences.test.ts`: intent map defaults to `"generation"`, `setIntent(id, "prompt-only")` mutates correctly, removed refs drop out of the map.
  - `hooks/useImageEngine.test.ts`: `refreshBudget()` exposed and triggers an immediate poll regardless of the 10 s interval.
  - `hooks/useGenerations.test.ts`: extend existing tests — when `generationRefIds` and `promptOnlyRefIds` are both supplied, both are loaded into `referenceImages` and the resulting record's `referenceImageIds` JSON has the `{generation, promptOnly}` shape.
  - `App.test.ts` (or new `hooks/usePinnedGenIndex.test.ts` if extracted): genIndex is preserved when a new generation arrives while the user is at index > 0; only auto-follows when the user is at index 0.

### 3. Refactor App Shell + Layout

- **Task ID**: shell-refactor
- **Depends On**: editor-multiline, services-additions
- **Assigned To**: builder-shell
- **Agent Type**: builder
- **Parallel**: false
- Replace the `Box flexDirection="row"` 3-column block in `App.tsx` (lines 246–282) with:
  ```tsx
  <Box flexDirection="column" gap={1}>
    <Box flexDirection="row" gap={1}>
      <Gallery cardProps={{ width: "40%", flexShrink: 0 }} ... />
      <Preview cardProps={{ flexGrow: 1 }} ... />
    </Box>
    <PromptPanel cardProps={{ width: "100%" }} ... />
    <CommandHints focus={focus} />
  </Box>
  ```
- Remove the auto-snap effect on `newestGenId` (`App.tsx:200`). Replace with: track `pinnedGenId` — when a new generation arrives and the user is at index 0, follow it; otherwise stay put and flash `flash("New generation ready — press End to jump", "info")`.
- Wire prompt-pane chords on **gallery focus**: `w` calls `promptwriter.enrichWithGuide(draft, model.model, { imagePath: target?.path })` then `setDraft(result)`; `t` toggles `refs.intentMap[selectedRef.id]`.
- Replace `clearAll` with `clearGalleryAndPrompt`:
  ```ts
  const r = db.deleteImagesBySource("upload");
  setDraft("");
  refs.refresh();
  flash(`Cleared ${r.rows} uploads, prompt reset`, "info");
  ```
- After `gens.generate(...)` resolves in `generateNow`, call `engine.refreshBudget()`.
- Pass `refs.intentMap`-derived ids into `gens.generate({ generationRefIds, promptOnlyRefIds })`.
- Update gallery key handlers to support arrow keys (`upArrow`/`downArrow`) in addition to `j/k`. (Note: `useKeyboard` already short-circuits arrows — extend it to dispatch when `paneKeymap` provides arrow handlers.)

### 4. Refactor Display Panes

- **Task ID**: panes-refresh
- **Depends On**: shell-refactor
- **Assigned To**: builder-panes
- **Agent Type**: builder
- **Parallel**: false
- `Gallery.tsx`: render pointer cursor (`▶` colored `colors.warmParchment`) on the selected row; render intent badge after the source label (`gen` warm parchment, `draft` ash gray). Take `intentMap` as a prop. Increase the selected thumb to `30 × 12` cells now that the pane is wider.
- `Preview.tsx`: re-stack metadata with explicit `flexShrink: 0` on the image Box and `flexShrink: 1` on the prompt Box; replace 200-char truncation with a 4-line wrap (`maxLines={4}`); always render the position pill; if `position.index > 0` and a fresher gen is available, render a small `↑ new` indicator.
- `StatusBar.tsx`: render budget as `${spent} / ${ceil} (used ${pct}%) · remaining ${remaining}`; reuse existing color tones.
- `CommandHints.tsx` (new): static maps per focus:
  - gallery: `j/k move · u use ref · v vision · w enrich · t toggle intent · g generate · d delete`
  - prompt: `Tab/Esc exit · Enter submit · Shift+Enter newline`
  - preview: `j/k history · End jump newest`
- `HelpOverlay.tsx`: add `w` (enrich), `t` (toggle intent), `End` (newest gen), `Shift+Enter` (newline) to the GROUPS array. Update outdated descriptions.
- Add Ink snapshot tests using `ink-testing-library` (new dev dep — install via `cd systems/pinboard/tui && bun add -d ink-testing-library`):
  - `screens/Gallery.test.tsx`: render with three refs (one selected); snapshot must contain the `▶` chevron on the selected row only and the `gen`/`draft` intent badge for each row.
  - `screens/Preview.test.tsx`: render with a generation whose prompt is 800 chars; assert image and metadata are in separate Boxes (no overlap), prompt text wraps to ≤4 lines, no 200-char truncation suffix.
  - `screens/CommandHints.test.tsx`: render in `gallery`, `prompt`, `preview` focus states; each snapshot lists the correct chord set.
  - `components/MultilineEditor.test.tsx`: drive via stdin — type "ab\nc", arrow-up, Home, type "X" → buffer becomes `"Xab\nc"`. Verify Backspace, Shift+Enter, Ctrl+A/E/K/U, Esc → `onCancel`.
  - `components/StatusBar.test.tsx`: snapshot the `used %` and `remaining $` rendering for three budget states (under 80%, 80–99%, ≥100%).

### 5. Final Validation (STRICT — block on any warning)

- **Task ID**: validate-all
- **Depends On**: editor-multiline, services-additions, shell-refactor, panes-refresh
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- **Strictness contract**: any of the following = FAIL. Validator does not paper over warnings.
  - Any failing test (unit, hook, or Ink snapshot).
  - Any `bun test` output containing `skip(`, `.skip`, or `todo(` for tests added/modified in this change.
  - Any TypeScript diagnostic from `bun run typecheck` (errors **and** warnings — including `noUnusedLocals`, `noImplicitAny`, deprecation hints).
  - Any unresolved snapshot (i.e., `toMatchSnapshot` writing a new snapshot file in a CI run — every snapshot must exist before validation).
  - Any acceptance-criterion checkbox unchecked at end of report.
- Run `cd systems/pinboard/tui && bun test 2>&1 | tee /tmp/pinboard-test.log` — verify exit 0, then `grep -E '(skip|todo|warning)' /tmp/pinboard-test.log` returns no matches.
- Run `cd systems/pinboard/tui && bun run typecheck 2>&1 | tee /tmp/pinboard-tc.log` — verify exit 0 AND `wc -l /tmp/pinboard-tc.log` shows zero lines after the `tsc --noEmit` invocation banner.
- Confirm new dev dep `ink-testing-library` is in `tui/package.json` and `bun.lock` is committed.
- Read `App.tsx`, confirm:
  - 3-column horizontal layout removed; vertical stack present.
  - `clearAll` replaced with narrowed clear.
  - `engine.refreshBudget` invoked post-generation.
  - Auto-snap to newest gen removed (`pinnedGenId` logic in place).
- Read `Gallery.tsx`, confirm pointer cursor + intent badge render paths exist.
- Read `Preview.tsx`, confirm explicit `flexShrink` on image Box and metadata wrap (no 200-char truncation).
- Read `MultilineEditor.tsx`, confirm Shift+Enter, arrows, Backspace, Ctrl+A/E/K/U behavior covered AND tested.
- Read `claudevision.ts`, confirm `enhancePrompt` and `probeAtStartup` exported AND covered by tests.
- Read `promptwriter.ts`, confirm `enrichWithGuide` exported with fallback path AND tested.
- Read `db.ts`, confirm `deleteImagesBySource` exists AND tested for non-upload-source preservation.
- Read `StatusBar.tsx`, confirm used/remaining budget breakdown across all three threshold states.
- Read each acceptance criterion, run the matching verification grep / file read; mark each ✅ or ❌ with the specific evidence (file:line).
- Report format: per-criterion check + final verdict (`PASS` only if every line passes the strict rules above; otherwise `FAIL` with the specific blockers listed).
- **Manual smoke**: NOT required for validator close-out. The user runs `bun run dev` separately.

## Acceptance Criteria

- [ ] Layout: top row = Gallery (left) + Preview (right); below = PromptPanel (full width); below = CommandHints row; bottom = StatusBar. Verified by reading `App.tsx` render tree.
- [ ] Gallery pointer is visibly drawn (`▶` chevron, color-shift) on the selected row, and `j/k` and `up/down arrow` both move it. Selected thumb updates immediately.
- [ ] Vision: pressing `v` either drafts a prompt OR shows a clear error (`StatusBar` chip says "Vision: unavailable" with reason) — never fails silently.
- [ ] References: pressing `t` while a ref is highlighted toggles its intent between `gen` and `draft`; the badge in the gallery row reflects the current intent; only `gen`-tagged refs are sent in the generation request body's `referenceImages` (verified via `useGenerations` test).
- [ ] Preview history: navigating with `j/k` while preview is focused walks through generations; pressing `End` jumps to the newest; new generations no longer hijack the user's history index.
- [ ] Preview text/image overlap fixed: image and metadata each in their own Box, with explicit `flexShrink`; no character collisions in default 80×24 terminal.
- [ ] Budget refreshes immediately after each successful generation (no 10 s wait); StatusBar shows both `used %` and `remaining $`.
- [ ] `x` (clear) only deletes upload-sourced images and resets the prompt draft. Generation history preserved (verified via `db.deleteImagesBySource('upload')` test).
- [ ] PromptWriter enrichment: pressing `w` while a prompt draft exists calls `promptwriter.enrichWithGuide`; result replaces the draft. Falls back to `applyTemplate` when `claude` CLI is unavailable. New unit test covers the fallback path.
- [ ] Multiline editor: PromptPanel renders the new editor; supports arrow keys, Backspace, `Shift+Enter` (newline), `Enter` (submit), `Esc` (exit), `Ctrl+A/E/K/U`. Single-line `@inkjs/ui` TextInput removed from PromptPanel.
- [ ] All tests pass — existing + new unit tests + new hook tests + new Ink snapshot tests (`bun test` from `systems/pinboard/tui`).
- [ ] No skipped or todo tests in the changed files (`grep -E '\.skip|\.todo|skip\(|todo\(' systems/pinboard/tui/src` returns nothing for new code).
- [ ] Typecheck clean — zero errors AND zero warnings (`bun run typecheck`).
- [ ] `ink-testing-library` added as a dev dependency in `tui/package.json`; `bun.lock` updated.
- [ ] Validator's strict report shows every acceptance line ✅ with evidence (file:line); no soft passes.

## Validation Commands

Execute these commands to validate the task is complete:

- `cd systems/pinboard/tui && bun test 2>&1 | tee /tmp/pinboard-test.log` — runs unit + hook + Ink snapshot suites; must exit 0.
- `grep -E 'skip\(|todo\(|\.skip|\.todo|warning' /tmp/pinboard-test.log` — must return zero matches (strict mode).
- `cd systems/pinboard/tui && bun run typecheck 2>&1 | tee /tmp/pinboard-tc.log` — must exit 0 with no diagnostic output beyond the tsc banner.
- `grep -n "deleteImagesBySource" systems/pinboard/tui/src/services/db.ts` — confirms helper added.
- `grep -n "enhancePrompt\|enrichWithGuide" systems/pinboard/tui/src/services/` — confirms new exports.
- `grep -n "MultilineEditor" systems/pinboard/tui/src/screens/PromptPanel.tsx` — confirms new editor wired in.
- `grep -n "ink-testing-library" systems/pinboard/tui/package.json` — confirms dev dep added.
- `ls systems/pinboard/tui/src/screens/__snapshots__ systems/pinboard/tui/src/components/__snapshots__ 2>/dev/null` — confirms snapshot files committed (so CI doesn't auto-create new ones).

## Notes

- **One new dev dependency.** `ink-testing-library` for snapshot tests. Production runtime adds nothing — `MultilineEditor` is built on `ink`'s `useInput`; no `ink-text-input` package needed.
- **No DB migration.** Reference intent is in-memory only for v1; if the user wants persistence, file a follow-up.
- **PromptPanel chords vs editor input.** Decision recorded: chords like `w` and `t` live on **gallery focus** to avoid conflicting with text input. The PromptPanel only handles `Tab/Esc/Enter/Shift+Enter` while focused.
- **`x` semantics narrowing is breaking.** The clear-confirm modal copy must be updated to match the new scope ("Clear gallery uploads + prompt? Generation history kept.").
- **`claudevision.probeAtStartup` is best-effort.** It runs once; if the user installs `claude` after launching pinboard, they need to restart. Acceptable for v1.
- **Rollback plan.** Each builder produces a self-contained set of file changes; if a phase regresses, revert that phase's commits via `git revert`. No data migrations to undo.
