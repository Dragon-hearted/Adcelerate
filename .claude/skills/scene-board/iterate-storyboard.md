# Iterate Storyboard — SceneBoard Revision Workflow

## Purpose

This workflow handles surgical revisions to an existing storyboard built on the **composite-sheet model** (one sheet image per ≤15s block + a Phase 2 cinematic video prompt). Because a sheet is a **single image** holding all its panels, changing "a panel" means **regenerating the whole sheet** while instructing the image model to reproduce everything else exactly. Every change goes through an approval gate.

**Image path:** Higgsfield CLI (`gpt_image_2`) is primary; ImageEngine HTTP (`gpt-image-2` → `gpt-image-1.5`) is the automatic fallback. The reference-based edit path is identical on the fallback (ImageEngine accepts the existing sheet as a reference image, capped at 3 refs).

---

## Stage 0: Client Context

**Goal**: Load client brand context before working on revisions.

### Steps

1. Determine which client this storyboard belongs to:
   - If the storyboard was saved under `client/{client}/storyboards/`, the client is known.
   - If not, ask the user if this is associated with a client.
2. If a client is identified, load `client/{client}/brand.md` for brand context (including `brand_category`).
3. This context informs revision decisions — ensuring changes stay on-brand.

---

## Stage 1: Load Existing Storyboard

**Goal**: Establish the current state before making any changes.

### Steps

1. Ask the user to provide or reference the existing storyboard document. If a client was identified in Stage 0, check `client/{client}/storyboards/` for existing storyboards.
2. Parse the document and identify all components:
   - Creative brief / concept summary
   - Style Anchor
   - Reference Sheets (character/product, 4-view) — slugs, types, image paths
   - Full script + voice script
   - Panel breakdown (numbered panels with timecodes, grouped by sheet)
   - **Storyboard sheet(s)** — the composite image per ≤15s block, the Phase 1 prompt that generated each, and its panel/timecode table
   - **Phase 2 cinematic video prompt**
   - Platform/format specifications (aspect ratio, duration, pacing)
3. Identify the approval status of each component. If not explicitly marked, treat all existing components as **approved/locked**.
4. Present a summary to the user:

```
--- Current Storyboard Summary ---
Total Duration: [X]s | Sheets: [M] | Panels: [N] | Platform: [platform] | Aspect: [ratio]

Sheets:
  Sheet 1 (00:00–00:15): panels 1–[k]
  Sheet 2 (00:15–00:30): panels [k+1]–[n]
  ...

Reference Sheets: [character/product slugs, or "none"]
Style Anchor: [brief description]
Phase 2 Video Prompt: [present / absent]

What would you like to change?
```

---

## Stage 2: Identify Revision Scope

**Goal**: Determine precisely what the user wants to change. Classify the request; if ambiguous, ask a clarifying question first.

### Panel-Level Changes (reference-based sheet edit)

| User Request | Action |
|---|---|
| "Change Panel 4" / "Redo the smile in panel 7" | **Reference-based panel edit** — regenerate the full sheet, passing the approved sheet back as a reference with "reproduce exactly, change only Panel N" (see Stage 4) |
| "Change panels 4 and 9" | Same path, naming all targeted panels in one instruction; regenerate the sheet once |
| "Swap the caption on panel 3" | If it's only the caption text, edit the panel/timecode table; if the panel art must change too, run the reference-based edit |

### Sheet-Level Changes

| User Request | Action |
|---|---|
| "Re-run sheet 2 from scratch" | Regenerate the full sheet from its Phase 1 prompt (no reference image), then re-approve |
| "Add a panel to sheet 1" / "Remove panel 5" | Update the panel breakdown for that sheet (re-validate ≤15s sum + grid), re-assemble the Phase 1 prompt, regenerate the sheet |
| "Re-split into more/fewer sheets" | Re-run `splitIntoSheets()` with the new boundaries, regenerate affected sheets |

### Component-Level Changes

| User Request | Action |
|---|---|
| "Rewrite the script" | Re-run script generation (Stage 3 of the create workflow), then cascade to panel breakdown → all sheets → Phase 2 prompt |
| "Update the Style Anchor" | Re-generate Style Anchor, then cascade to ALL sheets (each Phase 1 prompt's style block) and the Phase 2 style block |
| "Update a reference sheet (new model/garment/product)" | Regenerate that reference sheet (Stage 4.5 path), then regenerate any storyboard sheet that uses it |
| "Regenerate the video prompt" | Re-run Phase 2 (`composeVideoPrompt`) from the approved sheet(s)/panels — no image regeneration |
| "Change the concept/angle" | Re-run from creative brief stage and cascade through everything |

### Platform/Format Changes

| User Request | Action |
|---|---|
| "Convert to 9:16 vertical" | Flip the grid (e.g. 3×5 → 5×3), update aspect ratio, re-assemble Phase 1 prompts, regenerate ALL sheets, update Phase 2 |
| "Make this a 15-second version" | Collapse to a single ≤15s sheet, redistribute panel timecodes, regenerate the sheet + Phase 2 |
| "Change aspect ratio" | Update aspect in all Phase 1 prompts, regenerate all sheets |

---

## Stage 3: Cascade Logic

**Goal**: Determine which downstream components must update when an upstream component changes.

### Dependency Map

```
Creative Brief / Concept
  └── Script
       └── Panel Breakdown (per ≤15s sheet)
            ├── Phase 1 Composite Sheet (per sheet)
            │    └── Phase 2 Cinematic Video Prompt
            └── Timing / Pacing

Style Anchor ──────────────► ALL sheets (Phase 1 style block) + Phase 2 style block
Reference Sheet (subject) ─► every sheet that uses that subject
Platform / Format
  ├── Aspect Ratio ────────► grid orientation + ALL sheets
  ├── Duration Target ─────► sheet count / splitIntoSheets + panel timecodes
  └── Pacing Conventions ──► panel breakdown
```

### Cascade Rules

| What Changed | What Must Be Re-evaluated |
|---|---|
| Script | Panel breakdown, all sheets, Phase 2 prompt |
| Panel content/timecode (single panel) | The sheet containing it (reference-based edit) → re-derive Phase 2 shot |
| Panel add/remove/reorder | Re-validate that sheet's ≤15s sum + grid, regenerate the sheet, update Phase 2 |
| Style Anchor | ALL sheets + Phase 2 style block — no exceptions |
| Reference sheet (subject) | Every sheet using that subject, then Phase 2 if the subject's look changed |
| Platform / aspect change | Grid orientation, ALL sheets, Phase 2 |
| Phase 2 video prompt (direct edit) | No cascade — terminal node |

### Cascade Notification

Before executing any cascading changes, notify the user:

```
--- Cascade Notice ---
Your change to [component] affects downstream components:
- [component 1] for [sheets/panels affected]
- [component 2] for [sheets/panels affected]
I will update these one step at a time, each with its own approval gate.
---
```

Wait for acknowledgment before proceeding.

---

## Stage 4: Execute Changes

**Goal**: Make the targeted changes, present before/after, and get approval at every step.

### Reference-Based Panel Edit (the core single-image mechanism)

To change one or more panels in an approved sheet **without losing the rest of the sheet**:

1. Take the **currently approved sheet image** as the source.
2. Build an edit instruction that names exactly what changes and demands everything else stay identical, e.g.:

```
Reproduce this storyboard sheet EXACTLY — same header, same grid, same panel
numbering, timecodes, captions, style, characters, and products — changing ONLY
Panel [N]: [precise description of the new panel content]. All other panels must
remain pixel-identical to the reference. Keep the [3×5] grid and 16:9 layout.
```

3. Generate via `image-provider.generateImage()` with the approved sheet passed as a **reference image**:
   - **Higgsfield (primary):** `higgsfield generate create gpt_image_2 --prompt "<edit instruction>" --aspect_ratio 16:9 --quality high --resolution 2k --image <approved-sheet.png> [--image <reference-sheet.png>]… --wait --json`
   - **ImageEngine (fallback):** same intent — the approved sheet is supplied as a reference image (capped at 3 refs total; prioritize the approved sheet + the most-used subject sheets).
4. The result is a **freshly regenerated full sheet**. Update the embedded image, keep (or adjust) the panel/timecode table, and re-derive the affected Phase 2 shot(s).

> **Best-effort caveat:** GPT Image 2 cannot guarantee the untouched panels stay pixel-perfect — image models redraw the whole frame. Reproduction is close but not exact. If drift on untouched panels is unacceptable, offer a full-sheet re-run from the Phase 1 prompt instead, or accept the closest match. State this caveat to the user when they request a panel edit. The same caveat applies on the ImageEngine fallback.

### Full-Sheet Re-Run

To re-run an entire sheet (e.g. after a Style Anchor or panel-breakdown change): re-assemble the sheet's Phase 1 prompt (`composeStoryboardSheetPrompt`) with the updated inputs and generate **without** the prior sheet as a reference (reference sheets for subjects are still attached). This produces a clean regeneration.

### Phase 2 Regeneration

To regenerate the cinematic video prompt: re-run `composeVideoPrompt()` from the approved panels/sheets. No image generation is involved. Always preserve the fixed closing line:
`Audio: Diegetic sound only — natural ambience, environmental foley, and subject-driven sound.`

### Execution Protocol

For each change (including each cascading change):

1. **Re-run the relevant step** for only the targeted scope, using the same Style Anchor / reference sheets / context that produced the original (unless those changed).
2. **Present the before/after comparison:**

```
--- Revision: [what changed] ---

BEFORE:
[original sheet image / prompt / table / video prompt]

AFTER:
[updated sheet image / prompt / table / video prompt]

Note: [reference-based edit — untouched panels are best-effort, not pixel-exact]

---
[A] Approve change
[M] Modify further
[R] Revert to original
```

3. **Process the user's choice:**
   - **[A] Approve**: Lock this change; move to the next cascading update (if any).
   - **[M] Modify further**: Adjust and re-present. Repeat until approved.
   - **[R] Revert**: Restore the original. If cascading, skip further dependent cascades.

4. **If cascading**, process each downstream step sequentially with its own gate.

**Style Anchor Revert Special Case**: If the user reverts a Style Anchor change after some sheets were already regenerated with the new style and approved, ALL those sheets (and the Phase 2 style block) must ALSO revert to the original style. A partial Style Anchor update (some sheets new, some old) is never acceptable — the revert must be total.

### Rules During Execution

- NEVER modify any approved sheet, panel, or component that wasn't targeted.
- When a Style Anchor change cascades, regenerate every sheet's Phase 1 prompt style block — skip none.
- When adding/removing panels, re-validate the sheet's ≤15s timecode sum and grid; renumber panels and update the panel/timecode table.
- Keep the same generation quality and detail level as the original.
- If a change makes total duration exceed/fall short of target, flag it.

---

## Stage 5: Reassemble and Validate

**Goal**: Merge all approved changes into a complete, consistent storyboard with an incremented version number.

### Reassembly Steps

1. **Merge approved changes** — replace only revised/approved components; keep untouched ones exactly. **Increment the version number** (v1 → v2, …).

2. **Run consistency checks:**
   - Panel numbers are sequential with no gaps.
   - Per-panel timecodes within each sheet sum to that sheet's ≤15s window; all sheets sum to the target duration.
   - Each ≤15s block has exactly one embedded sheet image + its Phase 1 prompt + panel/timecode table.
   - Grid matches each sheet's panel count (and orientation matches the aspect ratio).
   - Style Anchor style block is consistent across all Phase 1 prompts.
   - Reference sheets used by a sheet still exist and match the subjects in its panels.
   - Phase 2 video prompt has one shot per panel, timecodes sum to duration, and ends with the fixed Audio line.
   - No orphaned references (e.g. "as in panel 3" when panel 3 was removed).

3. **Save the updated storyboard** with the new version number:
   - If client context exists: `client/{client}/storyboards/{project-name}/{project-name}-v{N}.md` (+ regenerated sheet images alongside).
   - Generate an updated PDF: `{project-name}-v{N}.pdf`.
   - Keep previous versions in place (do not overwrite).

4. **Present the updated storyboard** in the same format as the original.

5. **Final approval gate:**

```
--- Updated Storyboard Complete ---
Changes made:
- [summary of change 1]
- [summary of change 2]

Consistency checks: [PASS / FAIL with details]

[A] Approve final storyboard
[M] Make additional changes (returns to Stage 2)
```

---

## Edge Cases and Special Handling

### Adding a Panel

1. Determine placement and which sheet it belongs to.
2. Re-validate the sheet's ≤15s timecode sum; redistribute timecodes; renumber panels.
3. Re-assemble that sheet's Phase 1 prompt and regenerate the sheet (full re-run, not a reference-based edit, since the grid changes).
4. Update the panel/timecode table and derive the new Phase 2 shot.

### Removing a Panel

1. Confirm which panel. Check for orphaned references.
2. Renumber, recalculate the sheet's timecodes and grid.
3. Regenerate the sheet (full re-run) and update Phase 2.

### Splitting / Merging Sheets

1. Adjust ≤15s block boundaries (re-run `splitIntoSheets`).
2. Re-assemble Phase 1 prompts for affected sheets, regenerate them.
3. Re-number panels across sheets, update timecodes and Phase 2.

### Style Anchor Update (Full Cascade)

The most impactful change. Approve the new Style Anchor first, then regenerate ALL sheets with the new style block (full re-runs), then update the Phase 2 style block. Do not skip any sheet.

---

## Guiding Principles

- **Surgical precision**: Change only what is requested. Lock everything else.
- **Single-image reality**: A panel edit regenerates the whole sheet via a reference-based edit — close, not pixel-perfect. Always state the caveat.
- **Full transparency**: Always show before/after. Never silently modify content.
- **Mandatory approval gates**: Every change, no matter how small, requires explicit user approval.
- **Cascade awareness**: Notify the user before any downstream updates.
- **Consistency above all**: Timecodes, numbering, grid, style, and the Phase 2 prompt must stay internally consistent. Validate before delivering.
