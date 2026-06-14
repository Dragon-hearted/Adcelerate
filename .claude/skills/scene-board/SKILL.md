---
name: scene-board
description: "Create professional video storyboards from briefs. Use when user wants to create a storyboard, generate scene layouts, visualize video concepts, produce a composite storyboard sheet (GPT Image 2 via Higgsfield), or says 'storyboard this,' 'scene breakdown,' 'visualize this ad,' 'create scenes for,' 'video storyboard,' 'shot list,' 'storyboard sheet,' or 'I need a storyboard.' For ad copy only, see ad-creative. For campaign strategy, see paid-ads."
---

# SceneBoard -- Professional Storyboard Creator

SceneBoard transforms video briefs of any format into a **two-phase, production-ready deliverable**:

1. **Phase 1 — Composite Storyboard Sheet:** one multi-panel sheet image per ≤15-second block, with numbered panels, timecodes, shot captions, and a labeled dialogue/VO line beneath each panel all baked into a single render (not one image per scene). Dialogue/VO sits in the caption block beneath the frame — never on the scene, which stays text-free except the brand logo.
2. **Phase 2 — Cinematic Video Prompt:** after the sheet is approved, a timed, per-shot video prompt ready to paste into an AI video tool.

It uses a dynamic, approval-gated pipeline where any component provided in the brief is locked in and any component missing is generated as options for the user to choose from. Images are generated with **GPT Image 2 via the Higgsfield CLI** as the primary path, with the **ImageEngine HTTP service kept as an automatic fallback**. The result is a complete storyboard document — script, voice script, scene breakdown, style anchor, reference sheets, composite storyboard sheet(s), and a cinematic video prompt — that meets a "client gets flattened" quality bar.

## Before Starting

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setup), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

## On Activation

1. Greet the user and briefly explain what SceneBoard does.
2. **Client Selection** -- Ask which client this storyboard is for:
   - If the user names an existing client, load their brand profile from `client/{client-name}/brand.md` and confirm the brand context (including `brand_category`). This eliminates most brand-related questions in later stages.
   - If the user names a new client, route to **[NC] New Client** to create their brand profile first.
   - If the user wants to skip client selection (one-off / no client), proceed without loading brand context.
3. Ask which mode they need:
   - **[GS] Generate Storyboard** -- Create a new storyboard from a brief
   - **[IS] Iterate Storyboard** -- Revise or re-run parts of an existing storyboard
   - **[NC] New Client** -- Create or update a client brand profile
4. Route to the appropriate prompt file:
   - GS -> [generate-storyboard.md](generate-storyboard.md)
   - IS -> [iterate-storyboard.md](iterate-storyboard.md)
   - NC -> [manage-client.md](manage-client.md)

## Client Directory Structure

> **⚠️ LOCATION — read before creating anything.** The `client/` directory lives at the **Adcelerate repository root** — the same level as `systems/`, `apps/`, and `justfile` — **NOT** inside `systems/scene-board/`. Every `client/...` path in this skill is relative to the repo root.
>
> **Always resolve `client/{client}/...` against the repo root.** If your shell's current directory is inside a system (e.g. you `cd systems/scene-board` to run a `bun` driver), a bare `client/` will wrongly create `systems/scene-board/client/`. Guard against it: pass an **absolute path** (`<repo-root>/client/{client}/…`), or `cd` back to the repo root before writing any client file. Before creating a new client, confirm the target resolves to the repo-root `client/` (sibling clients like the existing ones should be visible there).

Client brand knowledge and storyboard outputs are stored at (paths relative to the **repo root**):

```
<repo-root>/client/{client-name}/
  brand.md              # Compiled brand profile (quick-reference, includes brand_category)
  knowledge/            # Detailed brand knowledge files
  references/           # Reusable reference sheets (product brands — shared across storyboards)
  storyboards/          # Generated storyboard outputs
    {project}/
      references/       # Per-storyboard reference sheets (clothing brands)
```

When a client is selected, read `brand.md` to pre-load brand voice, visual direction, target audience, style philosophy, and **`brand_category`** (clothing | product | service) into the pipeline context. `brand_category` drives reference-sheet reusability (see below).

---

## 8-Stage Pipeline

| Stage | Name | What Happens |
|-------|------|--------------|
| 0 | Client Selection | Identify client; load brand knowledge (incl. `brand_category`) from `client/` |
| 1 | Brief Intake | Parse the brief; classify each component as provided or missing |
| 2 | Context Gathering | Confirm brand, audience, platform, goals; fill gaps (skips brand questions if client loaded) |
| 3 | Dynamic Generation & Approval | Generate options for every missing component; approval gates |
| 4 | Scene Breakdown | Break the script into panels (variable duration); assign timecodes within each ≤15s block |
| **4.5** | **Reference Sheet stage (optional)** | **Generate 4-view reference sheets — character and/or product — on a neutral grey background, via GPT Image 2 (Higgsfield). Fed as reference images into the composite sheet. Reusability routed by `brand_category`.** |
| 5 | Visual Direction | Build Style Anchor document + per-panel visual direction |
| 6 | **Phase 1 — Composite Storyboard Sheet** + **Phase 2 — Cinematic Video Prompt** | Assemble one Phase-1 prompt per ≤15s block, generate the composite sheet via Higgsfield (reference sheets attached), embed it. After sheet approval, build the Phase-2 video prompt. |
| 7 | Final Assembly | Compile the complete storyboard document + generate professional PDF |

---

## Dynamic Workflow Principle

For EVERY storyboard component, without exception:

- **Provided in the brief** -> lock it in immediately, no regeneration needed
- **NOT provided** -> generate at least 2 distinct options -> present for approval -> lock in on approval

This applies uniformly to: script, voice script, on-screen text, scene breakdown, visual direction, the composite storyboard sheet, and the cinematic video prompt. No component is treated differently.

## Approval Gate Protocol

After each generation step, present:

```
[A] Approve -- Lock in and proceed
[M] Modify -- Provide feedback, regenerate
[R] Reject -- Discard and try a different approach
```

Never auto-approve. Never skip gates. If the user selects Modify, re-run the same stage with their feedback -- do not advance to the next stage. **Phase 2 is only produced after the Phase 1 sheet is explicitly approved.**

---

## Framework Selection Intelligence

Analyze the brief and autonomously select the right narrative framework. Map video type to structure:

| Video Type | Framework | Structure |
|---|---|---|
| Ad (15-30s) | Direct response | Hook -> problem -> solution -> CTA |
| Brand story (60s+) | Emotional narrative | Storytelling arc, character-driven |
| Product showcase | Feature-driven | Visual-first, benefit demonstration |
| Social content | Pattern interrupt | Curiosity loops, trend-aware pacing |
| Explainer | Problem-solution | Problem -> solution, visual metaphors |
| Testimonial | Trust-building | Social proof, before/after, credibility |

Blend frameworks when the brief calls for it. A product showcase ad may combine feature-driven visuals with a direct response CTA structure.

---

## Composite Storyboard Sheet Model

SceneBoard's defining output is a **single composite multi-panel sheet image per ≤15-second block** — not one image per scene. Each sheet has:

- A **header** (brand + "15-SECOND STORYBOARD" or the block's label).
- A **grid of numbered panels** (3×5 = 15 panels by default for landscape 16:9; the grid flips for vertical 9:16).
- Each panel shows a **timecode** (e.g. `00:00-00:01`), a **one-line shot description**, and — when the panel has spoken words — a separate, clearly-**labeled dialogue/VO line** (`Mira: "…"` / `VO: "…"` / `Dialogue: "…"`), all beneath the frame.
- **The dialogue/VO text lives only in that caption block beneath the frame — never rendered inside the depicted shot.** The shot artwork stays visually clean; the **only** in-frame text/graphic permitted is the **brand logo** (and supplied brand assets). This keeps scene vs. spoken line unambiguous for the Phase 2 video model.

**Key rules:**

- **≤ 15 seconds per sheet.** Videos longer than 15s split into **N sheets** (one per ≤15s block), with continuing timecodes.
- **Variable panel duration.** Drop the legacy "1 panel ≈ 1 second" assumption — a single panel may span more than one second. The only hard rules are: per-panel timecodes sum to the sheet's ≤15s window, and a sensible panel cap (≤ ~15, sized to the grid).
- **Grid mapping:** 9 → 3×3, 12 → 3×4, 15 → 3×5 (default), 20 → 4×5. Vertical 9:16 flips rows×cols (e.g. 15 → 5×3).
- The Phase 1 prompt is a **single continuous block** structured in sections A–H (see [generate-storyboard.md](generate-storyboard.md) Stage 6).

The composer `src/storyboard-sheet-prompt.ts` assembles the Phase 1 prompt and `splitIntoSheets()` handles multi-sheet splitting; `src/video-prompt.ts` produces the Phase 2 cinematic prompt.

---

## Style Anchor System

The Style Anchor enforces visual consistency across every panel and sheet. Without it, the composite sheet drifts and adjacent panels look incoherent.

1. **Generate** a Style Anchor document covering: color palette, photo vs. illustration style, abstraction level, lighting mood, camera conventions, character rules, product rendering rules.
2. **Present for approval** before generating the storyboard sheet.
3. **Fold it into** the Phase 1 composite-sheet prompt (the `[INSERT DESIRED STYLE]` slot of every reference sheet is also filled from the locked Style Anchor).
4. Overrides to the Style Anchor must be explicit and user-approved.

---

## Reference Sheet System (Stage 4.5)

Text descriptions alone aren't enough to keep characters and products consistent across panels. Stage 4.5 generates **4-view reference sheets on a neutral grey background** that are then passed as **reference images** into the composite-sheet generation.

Two sheet types are supported, and a single storyboard may use **multiple character AND product sheets together** (e.g. a model holding a soda can):

- **Character sheet** — four views: FULL BODY FRONT / FULL BODY REAR / FRONT CLOSE-UP / PROFILE CLOSE-UP.
- **Product sheet** — four views: FRONT THREE-QUARTER / REAR STRAIGHT-ON / FRONT CLOSE-UP / PROFILE LEFT, photorealistic product-photography style.

All sheets are generated via **GPT Image 2 (Higgsfield CLI)** and fed as references (up to the provider's ~8-reference cap; ImageEngine fallback caps at 3). See [generate-storyboard.md](generate-storyboard.md) Stage 4.5 for the full workflow.

**Reusability is routed by `brand_category`** (read from `client/{client}/brand.md`):

| brand_category | Reference sheets | Storage | Intake behavior |
|---|---|---|---|
| `clothing` | **Per-storyboard** (the model wears this storyboard's selected garments) | `client/{client}/storyboards/{project}/references/{slug}/` | Ask which brand garments the model wears; ask `[R] Reuse cached model identity` / `[N] New model this storyboard` |
| `product` | **Reusable common sheets** shared across storyboards | `client/{client}/references/{slug}/` | Reuse cached sheet when one exists; offer to regenerate |
| `service` | Optional; treat like `product` for any physical props/talent | `client/{client}/references/{slug}/` | As needed |

**Opt-out is safe**: if no characters or products warrant a sheet, or the user declines, no `## Reference Sheets` section renders and the composite sheet is generated from text DNA + Style Anchor alone.

---

## GPT Image 2 via Higgsfield — Constraints

Quick reference for image generation:

| Constraint | Value |
|---|---|
| Primary provider | **Higgsfield CLI** (`higgsfield generate create gpt_image_2 … --wait --json`) |
| Fallback provider | **ImageEngine HTTP** (`gpt-image-2` → `gpt-image-1.5` on retry); stays `active` |
| Prompt body | ~4,000 characters; **no separate system instruction** — fold all context into the prompt body |
| Reference images | up to **~8** via repeatable `--image` (Higgsfield); **3** on the ImageEngine fallback |
| Aspect ratio | `16:9` (landscape sheets, default), `9:16` (vertical) — also `1:1`, `4:3`, `3:4`, `3:2`, `2:3` |
| Quality / Resolution | `--quality high` / `--resolution 2k` (default) |
| Auth | `higgsfield auth login` once per machine (creds in `~/.config/higgsfield`) |

**Critical rules:**
- **Text in the sheet is intentional and accurate** — GPT Image 2 renders the header, panel numbers, timecodes, shot captions, and the labeled dialogue/VO line beneath each panel reliably (unlike the legacy NanoBanana path, where text was garbled). Brand wordmarks / end cards still prefer Remotion for pixel-perfect type.
- **Dialogue/VO goes in the caption block, never on the scene.** Write each panel's spoken line as a labeled caption line beneath the frame (`Speaker: "…"` / `VO: "…"` / `Dialogue: "…"`). The depicted shot itself carries **no** words, captions, subtitles, dialogue, or lettering — the brand logo is the only permitted in-frame text/graphic.
- Prompts must be highly specific to the product and brand; generic visual descriptions are the number one failure mode.
- The composite-sheet prompt must fold in the Style Anchor and weave character/product DNA across panels.
- The image path uses **Higgsfield first** and **silently falls back to ImageEngine** on any failure, logging which provider served the request.

> **Legacy note:** Earlier versions of SceneBoard used NanoBanana Pro with a "1 scene = 1 image" model. Those references are retained only where clearly marked as legacy (e.g. `knowledge/nanobanana-pro-prompt-guide.md`); they are no longer the active path.

---

## Platform Specifications

| Platform | Aspect Ratio | Max Duration | Pacing |
|---|---|---|---|
| Instagram Reels | 9:16 | 90s | Fast-cut, hook in 1-2s |
| TikTok | 9:16 | 10min | Fast-cut, trend-aware |
| YouTube Shorts | 9:16 | 180s (3min) | Fast-cut |
| YouTube | 16:9 | varies | Moderate to slow |
| LinkedIn | 16:9 or 1:1 | 10min | Professional, measured |
| Facebook Feed | 1:1 or 16:9 | 240min | Moderate |
| Twitter/X | 16:9 | 140s | Concise, punchy |

Always confirm the target platform before scene breakdown. Platform determines the sheet's aspect ratio (and therefore grid orientation), duration limits, and pacing conventions. See [references/platform-specs.md](references/platform-specs.md) for full guidance and [references/shot-types.md](references/shot-types.md) for shot/grid/aspect mapping.

---

## Quality Standards

- **"Client gets flattened"** -- every storyboard should exceed professional agency output
- **Failure #1: Prompt/visual mismatch** -- prompts must be highly specific to the actual product and brand, not generic stock-photo descriptions
- **Failure #2: Style inconsistency** -- enforced via the Style Anchor + reference sheets; no panel should visually clash with another
- **Ask, don't assume** -- shot duration, voice script presence, platform, aspect ratio are all questions, not defaults
- **Garbage in, gold out** -- even a vague one-line brief should produce an excellent storyboard through the context gathering stage

---

## Related Skills

- **ad-creative** -- Ad scripts, headlines, creative variations
- **copywriting** -- Marketing copy, CTAs, value propositions
- **social-content** -- Social media content creation
- **marketing-psychology** -- Behavioral science, persuasion frameworks
- **paid-ads** -- Campaign strategy, targeting, budgets
- **sales-enablement** -- Pitch decks, demo scripts
- **content-strategy** -- Editorial planning, content calendars
- **remotion-best-practices** -- Code-based video rendering for text-heavy brand end cards
- **prompt-writer** -- Centralized prompt engineering for GPT Image 2 (Higgsfield), video models, and all generation models
