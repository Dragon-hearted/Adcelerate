# Iterate Storyboard — SceneBoard Revision Workflow

## Purpose

This workflow handles surgical revisions to an existing storyboard. Rather than rebuilding from scratch, it identifies exactly what needs to change, updates only those components, cascades downstream effects, and locks everything else in place. Every change goes through an approval gate.

---

## Stage 0: Client Context

**Goal**: Load client brand context before working on revisions.

### Steps

1. Determine which client this storyboard belongs to:
   - If the storyboard was saved under `systems/scene-board/clients/{client}/storyboards/`, the client is known.
   - If not, ask the user if this is associated with a client.
2. If a client is identified, load `systems/scene-board/clients/{client}/brand.md` for brand context.
3. This context informs revision decisions — ensuring changes stay on-brand.

---

## Stage 1: Load Existing Storyboard

**Goal**: Establish the current state before making any changes.

### Steps

1. Ask the user to provide or reference the existing storyboard document. If a client was identified in Stage 0, check `systems/scene-board/clients/{client}/storyboards/` for existing storyboards.
2. Parse the document and identify all components:
   - Creative brief / concept summary
   - Style Anchor
   - Script (full narration text)
   - Scene breakdown (numbered scenes with timestamps)
   - Voice script per scene
   - Visual direction per scene
   - NanoBanana prompt per scene
   - Platform/format specifications (aspect ratio, duration, pacing)
3. Identify the approval status of each component. If not explicitly marked, treat all existing components as **approved/locked**.
4. Present a summary to the user:

```
--- Current Storyboard Summary ---
Total Duration: [X]s | Scenes: [N] | Platform: [platform] | Aspect Ratio: [ratio]

Scene List:
  1. [scene 1 brief description] — [start]-[end]
  2. [scene 2 brief description] — [start]-[end]
  ...

Style Anchor: [brief description of visual style]
Script: [word count] words

What would you like to change?
```

---

## Stage 2: Identify Revision Scope

**Goal**: Determine precisely what the user wants to change and at what level.

Listen for the user's request and classify it into one of the following categories. If the request is ambiguous, ask a clarifying question before proceeding.

### Scene-Level Changes

| User Request | Action |
|---|---|
| "Regenerate scenes 3-5" | Re-run visual direction + NanoBanana prompts for scenes 3, 4, 5 only |
| "Change the visual direction for scene 2" | Update visual direction for scene 2, then regenerate its NanoBanana prompt |
| "Update the NanoBanana prompt for scene 4" | Modify only the NanoBanana prompt for scene 4 (no cascade) |
| "Add a scene between 3 and 4" | Create a new scene, insert it, renumber all subsequent scenes |
| "Remove scene 5" | Delete scene 5, renumber all subsequent scenes, re-validate total duration |
| "Swap scenes 2 and 4" | Reorder scenes, adjust timestamps, verify continuity |

### Component-Level Changes

| User Request | Action |
|---|---|
| "Rewrite the script" | Re-run script generation (Stage 3 from the create workflow), then cascade to scene breakdown, voice script, visual direction, and NanoBanana prompts |
| "Change the voice script for scenes 2-4" | Update voice script for scenes 2-4 only, adjust timing/pacing if needed |
| "Update the Style Anchor" | Re-generate Style Anchor, then cascade to ALL NanoBanana prompts (every scene) |
| "Change the concept/angle" | Re-run from creative brief stage and cascade through everything |

### Platform/Format Changes

| User Request | Action |
|---|---|
| "Convert this to TikTok format" | Update aspect ratio to 9:16, adjust pacing to TikTok conventions, update duration target, cascade to scene breakdown and ALL NanoBanana prompts |
| "Make this a 15-second version" | Condense scene breakdown to fit 15s, update voice script, cascade to visual direction and prompts |
| "Change aspect ratio to 1:1" | Update aspect ratio in ALL NanoBanana prompts, adjust framing in visual direction |

---

## Stage 3: Cascade Logic

**Goal**: Determine which downstream components must be updated when an upstream component changes.

### Dependency Map

```
Creative Brief / Concept
  └── Script
       └── Scene Breakdown
            ├── Voice Script (per scene)
            ├── Visual Direction (per scene)
            │    └── NanoBanana Prompt (per scene)
            └── Timing / Pacing

Style Anchor ──────────────► ALL NanoBanana Prompts (style preamble)

Platform / Format
  ├── Aspect Ratio ────────► ALL NanoBanana Prompts
  ├── Duration Target ─────► Scene Breakdown + Timing
  └── Pacing Conventions ──► Scene Breakdown
```

### Cascade Rules

| What Changed | What Must Be Re-evaluated |
|---|---|
| Script | Scene breakdown, voice script, visual direction, NanoBanana prompts (all scenes) |
| Voice script (specific scenes) | Timing/pacing for those scenes only (usually no further cascade) |
| Scene breakdown (specific scenes) | Visual direction + NanoBanana prompts for affected scenes |
| Scene breakdown (structure change: add/remove/reorder) | Renumber all scenes, re-validate timestamps, update affected visual direction + prompts |
| Style Anchor | ALL NanoBanana prompts — no exceptions, every scene must be updated |
| Visual direction (specific scene) | NanoBanana prompt for that scene only |
| Platform change | Aspect ratio in ALL prompts, pacing in scene breakdown, duration targets |
| NanoBanana prompt (direct edit) | No cascade — this is a terminal node |

### Remotion Flagging During Iteration
When a revision adds or modifies a scene that introduces text-heavy content (title cards, CTA screens, text overlays, disclaimer screens), the scene MUST be flagged as `render: remotion` instead of `render: nanobanana-pro`. This applies to:
- New scenes added that are text-heavy
- Existing scenes modified to include significant text content
- Changes to on-screen text that make a scene text-dominant

This is a hard gate — no text-heavy scene should have a NanoBanana Pro prompt.

### Cascade Notification

Before executing any cascading changes, notify the user with this format:

```
--- Cascade Notice ---
Your change to [component] affects downstream components:
- [component 1] for [scenes affected]
- [component 2] for [scenes affected]
I will update these one stage at a time, each with its own approval gate.
---
```

Wait for acknowledgment before proceeding with cascade execution.

---

## Stage 4: Execute Changes

**Goal**: Make the targeted changes, present before/after comparisons, and get approval at every step.

### Execution Protocol

For each change (including each cascading change):

1. **Re-run the relevant generation stage** for only the targeted scope.
   - Use the same creative brief, Style Anchor, and context that produced the original storyboard.
   - If the Style Anchor changed, use the new one for all prompt regeneration.
   - If the platform changed, apply new format constraints.

2. **Present the before/after comparison** using this format:

```
--- Revision: [Brief description of what changed] ---

BEFORE:
[original content for this component]

AFTER:
[updated content for this component]

---
[A] Approve change
[M] Modify further
[R] Revert to original
```

3. **Process the user's choice**:
   - **[A] Approve**: Lock this change and move to the next cascading update (if any).
   - **[M] Modify further**: Ask what they want adjusted, regenerate, and present another before/after comparison. Repeat until approved.
   - **[R] Revert to original**: Discard the change, restore the original content. If this was a cascading change, skip further cascades that depended on it.

4. **If cascading is needed**, process each downstream stage sequentially:
   - Complete and get approval for the current stage before moving to the next.
   - Each cascading stage gets its own before/after comparison and approval gate.
   - If the user reverts a mid-cascade change, ask whether to continue cascading with the original content or stop the cascade entirely.

**Style Anchor Revert Special Case**: If the user reverts a Style Anchor change after some scene prompts have already been updated with the new style and approved, ALL those already-updated prompts must ALSO be reverted to use the original Style Anchor preamble. A partial Style Anchor update (some scenes with old style, some with new) is never acceptable — it violates the visual consistency principle. The revert must be total.

### Rules During Execution

- NEVER modify any approved scene or component that was not targeted for revision.
- When regenerating NanoBanana prompts after a Style Anchor change, update the style preamble in every single prompt. Do not skip any.
- When adding or removing scenes, renumber all subsequent scenes and adjust all timestamp references.
- Keep the same generation quality and detail level as the original storyboard.
- If a change makes the total duration exceed or fall short of the target, flag it explicitly.

---

## Stage 5: Reassemble and Validate

**Goal**: Merge all approved changes back into a complete, consistent storyboard document with an incremented version number.

### Reassembly Steps

1. **Merge approved changes** into the full storyboard document.
   - Replace only the components that were revised and approved.
   - Keep all locked/untouched components exactly as they were.
   - **Increment the version number** in the document header (e.g., v1 → v2, v2 → v3).

2. **Run consistency checks**:
   - Scene numbers are sequential with no gaps (1, 2, 3, ...).
   - Timestamps are continuous — each scene starts where the previous one ended.
   - All timestamps sum to the target total duration. If not, flag the discrepancy.
   - Style Anchor preamble is present in every NanoBanana prompt.
   - Aspect ratio is consistent across all NanoBanana prompts.
   - Voice script content matches the master script for each scene.
   - No orphaned references (e.g., "as seen in scene 3" when scene 3 was removed).
   - [ ] Each NanoBanana Pro system instruction ≤ 512 characters
   - [ ] Each NanoBanana Pro prompt ≤ 8,192 characters
   - [ ] Each scene has ≤ 3 reference images
   - [ ] Each prompt specifies a creative mode (Faithful/Expressive/Vision/Image Asset)
   - [ ] Every NanoBanana prompt ends with "No text in image."

3. **Save the updated storyboard** with the new version number:
   - If client context exists: Save to `systems/scene-board/clients/{client}/storyboards/{project-name}-v{N}.md`
   - Also generate an updated PDF version alongside the markdown: `{project-name}-v{N}.pdf`
   - Keep previous versions in place (do not overwrite).

4. **Present the updated storyboard** in the same format as the original document.

5. **Final approval gate**:

```
--- Updated Storyboard Complete ---
Changes made:
- [summary of change 1]
- [summary of change 2]
- [summary of change 3]

Consistency checks: [PASS / FAIL with details]

[A] Approve final storyboard
[M] Make additional changes (returns to Stage 2)
```

---

## Edge Cases and Special Handling

### Adding a Scene

1. Determine placement (between which existing scenes).
2. Generate all components for the new scene (voice script, visual direction, NanoBanana prompt) using surrounding scene context for continuity.
3. Renumber all subsequent scenes.
4. Redistribute timing if the new scene changes total duration.
5. Present the new scene with full before/after of the scene list.

### Removing a Scene

1. Confirm with the user which scene to remove.
2. Check if any other scenes reference the removed scene (visual continuity, callbacks).
3. Renumber all subsequent scenes.
4. Recalculate total duration.
5. Flag if removal creates a narrative gap and suggest how to bridge it.

### Splitting a Scene

1. Divide the scene's content (voice script, visual direction) into two parts.
2. Generate NanoBanana prompts for both new scenes.
3. Renumber all subsequent scenes.
4. Adjust timestamps for the split.

### Merging Scenes

1. Combine the content of the specified scenes.
2. Generate a single consolidated NanoBanana prompt.
3. Renumber all subsequent scenes.
4. Adjust timestamps for the merge.

### Style Anchor Update (Full Cascade)

This is the most impactful change. When the Style Anchor changes:

1. Present the new Style Anchor for approval first.
2. Once approved, regenerate ALL NanoBanana prompts with the new style preamble.
3. Present each updated prompt for approval (may batch similar scenes for efficiency).
4. Do not skip any scene, even if it "looks fine" — consistency requires every prompt to be regenerated.

---

## Guiding Principles

- **Surgical precision**: Change only what is requested. Lock everything else.
- **Full transparency**: Always show before/after. Never silently modify content.
- **Mandatory approval gates**: Every change, no matter how small, requires explicit user approval before being committed.
- **Cascade awareness**: Always notify the user when a change will trigger downstream updates. Let them see the full impact before proceeding.
- **Consistency above all**: The final storyboard must be internally consistent — timestamps, numbering, style, format. Validate before delivering.
