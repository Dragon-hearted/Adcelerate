# Generate Storyboard — Full Workflow

**Trigger:** User selects `[GS] Generate Storyboard` from SKILL.md
**Goal:** Take any creative brief and transform it into a complete, production-ready two-phase deliverable: **Phase 1** — one composite multi-panel storyboard sheet image per ≤15-second block (generated with GPT Image 2 via the Higgsfield CLI), and **Phase 2** — a cinematic video prompt produced after the sheet is approved.
**Pipeline:** 8 sequential stages (Stage 0-7), each gated by explicit user approval.
**Image provider:** Higgsfield CLI (`gpt_image_2`) is primary; ImageEngine HTTP (`gpt-image-2` → `gpt-image-1.5`) is the automatic fallback.

---

## Stage 0 — Client Selection (0/7)

### Purpose
Identify the client and load their brand knowledge before any creative work begins.

### Execution

1. **If a client was already selected in SKILL.md activation**, skip to confirmation.
2. **If not**, ask: "Which client is this storyboard for?"
   - Show known clients by checking `client/` for existing directories.
3. **If client exists**: Load `client/{client}/brand.md` and present a brief summary:

```
## Client Context Loaded: [Client Name]

**Style Philosophy:** [from brand.md]
**Brand Voice:** [from brand.md]
**Target Audience:** [from brand.md]
**Visual Direction:** [summary from brand.md]

This context will be used throughout the storyboard. Brand-related questions in Stage 2 will be skipped.

[A] Confirm — Proceed with this brand context
[M] Modify — Override specific brand elements for this project
[S] Skip — Don't use client context for this storyboard
```

4. **If client is new**: Offer to create their profile now (routes to manage-client.md), or proceed without client context.
5. **If client context is loaded**, mark the following Stage 2 questions as pre-answered:
   - Brand/product name, key features, value proposition
   - Brand voice
   - Brand guidelines (colors, fonts, logo usage)
   - Target audience
   - Style preferences
   - Any visual direction from the knowledge files

6. **Also load detailed knowledge** if available: read files from `client/{client}/knowledge/` for deeper context (visual direction, brand positioning) that can inform the Style Anchor in Stage 5.

---

## Core Principles

- **Never skip an approval gate.** Every stage transition requires the user to explicitly approve.
- **Never auto-approve.** Even if you are confident, present the output and wait.
- **Capture-don't-interrupt.** If the user mentions something relevant to a later stage, silently note it for use later. Do not derail the current stage.
- **Soft gate elicitation.** End approval gates with: "Anything else to adjust, or shall we move on?"
- **Modify = re-run.** If the user selects [M] Modify, incorporate their feedback and re-run the same stage. Do not advance the stage counter.
- **Reject = fresh start.** If the user selects [R] Reject, discard the current output entirely and try a fundamentally different approach for the same stage.

---

## Stage 1 — Brief Intake (1/7)

> **Note:** If client context was loaded in Stage 0, brand-related components may already be classified as "Provided" automatically.

### Purpose
Accept the user's brief in whatever form it arrives and determine what already exists versus what needs to be generated.

### Execution

1. **Accept the brief.** The brief can arrive in ANY format:
   - A raw idea or concept ("I want a video about...")
   - A detailed creative brief document
   - An Instagram or social media link to a reference video
   - A written script
   - A voice-over script
   - A combination of the above
   - An image or mood board reference

2. **Parse and classify.** Read the entire brief carefully. Identify which of the following components are ALREADY PROVIDED (fully or partially):

   | Component | Status | Notes |
   |-----------|--------|-------|
   | Script / copy | Provided / Partial / Missing | |
   | Voice script / narration | Provided / Partial / Missing | |
   | Scene breakdown | Provided / Partial / Missing | |
   | Visual direction / references | Provided / Partial / Missing | |
   | On-screen text / captions | Provided / Partial / Missing | |
   | Brand guidelines | Provided / Partial / Missing | |
   | Target platform | Provided / Partial / Missing | |
   | Duration target | Provided / Partial / Missing | |

3. **Lock in what's provided.** Any component marked "Provided" is locked — do not regenerate it unless the user later asks for modifications.

4. **Present the analysis.** Use this exact format:

```
## Brief Analysis

**What I found in your brief:**
- [Component]: [Brief summary of what was provided]
- [Component]: [Brief summary of what was provided]

**What I'll need to generate:**
- [Component]: [Why it's needed]
- [Component]: [Why it's needed]

**What I'll need to ask you about:**
- [Item]: [Why I need this information]
```

5. **Approval Gate.**

```
--- Stage: Brief Intake (1/7) ---

[Analysis output above]

---
[A] Approve — Lock in this analysis and proceed to context gathering
[M] Modify — Correct my understanding of your brief
[R] Reject — Start over with a different interpretation

Anything else to adjust, or shall we move on?
```

---

## Stage 2 — Context Gathering (2/7)

### Purpose
Fill every gap identified in Stage 1 through targeted conversation with the user.

### Execution

1. **Review the gap list from Stage 1.** Only ask about what is genuinely missing.

2. **Ask targeted questions.** Draw from this question bank, but ONLY ask questions whose answers are not already in the brief:

   **Brand & Product:**
   - What's the brand/product? (name, key features, value proposition)
   - What's the brand voice? (formal, casual, edgy, warm, authoritative)
   - Are there brand guidelines I should follow? (colors, fonts, logo usage)

   **Audience & Platform:**
   - Who is the target audience? (demographics, psychographics, pain points)
   - What platform is this for? (Instagram Reels, TikTok, YouTube, Facebook, LinkedIn, other)
   - What aspect ratio? (9:16 vertical, 16:9 horizontal, 1:1 square, 4:5)

   **Video Goal & Structure:**
   - What's the primary goal? (sell/convert, educate, engage, build awareness, launch)
   - What's the desired duration? (15s, 30s, 60s, 90s+)
   - Is a voice-over/narration needed?
   - Are on-screen text/captions needed?
   - Is there a specific CTA (call to action)?

   **Creative Direction:**
   - Any style preferences? (cinematic, minimal, bold, playful, editorial, raw/authentic)
   - Any reference videos, images, or competitors to consider?
   - Any specific constraints or must-haves? (legal disclaimers, mandatory elements)

   **Product Images (Required Question):**
   - Do you have product images or photos for the items featured in this video? (e.g., product shots, flat-lays, lifestyle photos of the actual garments/items)

   **Why this matters:** Product images are used as **GPT Image 2 reference images** (via Higgsfield `--image`, repeatable up to ~8; ImageEngine fallback caps at 3) during reference-sheet and composite-sheet generation. Without them, the AI generates its interpretation of the product, which often misses specific design details (prints, trim colors, logo placement, fabric texture). With actual product photos as references, generation accuracy improves dramatically — the AI matches the real product instead of inventing one.

   **If the user provides product images:**
   - Save/note them as reference assets for this storyboard project
   - They feed the Stage 4.5 product reference sheet and are attached to the Stage 6 composite-sheet generation as reference images
   - For clothing brands, the brand's garment photos are also passed as references when rendering the character reference sheet

   **If the user cannot provide product images:**
   - Acknowledge and proceed — this is not a blocker
   - Note in the context summary: "Product images: Not available — generation will rely on text descriptions only"
   - In the Phase 1 prompt, be extra-specific about product details (print patterns, colors, fabric, design elements) to compensate for missing visual references

   **Additional:**
   - Are there other existing brand assets to incorporate? (logos, footage, mood boards)
   - Is this part of a larger campaign or standalone?

3. **Batch questions intelligently.** Group related questions together. Do not overwhelm with all questions at once — ask the most critical ones first, then follow up.

4. **Use soft gate elicitation** after the user responds: "Anything else I should know, or shall we move forward?"

5. **Compile the context summary.** Once all gaps are filled, present:

```
## Context Summary

**Brand/Product:** [name] — [brief description]
**Brand Voice:** [tone descriptors]
**Target Audience:** [who]
**Platform:** [platform] ([aspect ratio])
**Duration:** [target duration]
**Goal:** [primary objective]
**Voice Script:** [Yes/No]
**On-Screen Text:** [Yes/No]
**Style:** [style descriptors]
**CTA:** [call to action]
**Constraints:** [any must-haves or restrictions]
**References:** [any reference material noted]
**Product Images:** [Yes — {count} images provided / No — text-only generation]
```

6. **Approval Gate.**

```
--- Stage: Context Gathering (2/7) ---

[Context summary above]

---
[A] Approve — Lock in this context and proceed to generation
[M] Modify — Correct or add to the context
[R] Reject — Rethink the direction entirely

Anything else to adjust, or shall we move on?
```

---

## Stage 3 — Dynamic Generation & Approval Loop (3/7)

### Purpose
Generate every component that was identified as missing in Stage 1. Each sub-component has its own approval gate.

### Important
- Only generate components that were marked "Missing" or "Partial" in Stage 1.
- Components marked "Provided" are already locked in and skip their sub-stage.
- Process sub-components in this order: Script, then Voice Script, then On-Screen Text.

---

### 3A — Script Generation

**When:** Script was not provided or was only partially provided.

**Skip if:** A complete script was provided in the brief and locked in at Stage 1.

#### Execution

1. **Select the marketing framework.** Analyze the brief + context to determine the best structural approach:

   | Brief Type | Framework | Supporting Skills |
   |------------|-----------|-------------------|
   | Direct-response ad | Hook → Problem → Solution → CTA | `ad-creative` + `marketing-psychology` |
   | Brand story / awareness | Emotional narrative arc | `copywriting` + `content-strategy` |
   | Product showcase | Feature-benefit progression | `copywriting` |
   | Social content (Reels/TikTok) | Pattern interrupt → Hook → Payoff | `social-content` + `marketing-psychology` |
   | Explainer / educational | Problem → Solution → Proof | `copywriting` |
   | Hybrid / complex | Blend frameworks as needed | Multiple skills |

2. **Generate 2-3 script options.** Each option should take a distinctly different approach or tone. For each option, provide:
   - **Approach label** (e.g., "Emotional storytelling", "Direct-response", "Problem-agitation")
   - **The full script text**
   - **Rationale** — 1-2 sentences on why this approach could work
   - **Estimated duration** based on word count and pacing

3. **Present options.**

```
## Script Options

### Option A: [Approach Label]
**Rationale:** [Why this approach]
**Estimated Duration:** [Xs]

---
[Full script text]
---

### Option B: [Approach Label]
**Rationale:** [Why this approach]
**Estimated Duration:** [Xs]

---
[Full script text]
---

### Option C: [Approach Label]
**Rationale:** [Why this approach]
**Estimated Duration:** [Xs]

---
[Full script text]
---
```

4. **Approval Gate.**

```
--- Stage: Script Generation (3/7 — Sub-stage A) ---

[Options above]

---
[A] Approve Option [A/B/C] — Lock in this script
[M] Modify — Tell me what to change (and which option to base it on)
[R] Reject — Discard all and try completely different approaches

Which option resonates, or what should I adjust?
```

5. **Lock in the approved script.**

---

### 3B — Voice Script Generation

**When:** The context summary indicates a voice-over is needed AND no voice script was provided.

**Skip if:** Voice-over is not needed, or a voice script was already provided.

#### Execution

1. **Base on the approved script.** The voice script must align with the locked-in script's structure, tone, and pacing.

2. **Generate 2-3 voice script variations.** Each should offer a different narration style:
   - **Conversational** — casual, direct-to-camera feel, "talking to a friend"
   - **Authoritative** — confident, expert-driven, trust-building
   - **Storytelling** — narrative-driven, emotional, draws the listener in
   - **Energetic** — fast-paced, excited, high-energy (good for social/short-form)

   For each option provide:
   - **Style label**
   - **Full voice script** with natural pauses, emphasis markers, and pacing notes
   - **Tone description** — how this should sound when read aloud

3. **Present options** in the same format as 3A.

4. **Approval Gate.**

```
--- Stage: Voice Script Generation (3/7 — Sub-stage B) ---

[Options above]

---
[A] Approve Option [A/B/C] — Lock in this voice script
[M] Modify — Tell me what to change
[R] Reject — Try different narration styles

Which voice feels right, or what should I adjust?
```

5. **Lock in the approved voice script.**

---

### 3C — On-Screen Text Generation

**When:** The context summary indicates on-screen text/captions are needed AND none were provided.

**Skip if:** On-screen text is not needed, or text overlays were already provided.

#### Execution

1. **Generate 2-3 distinct on-screen text approaches** (e.g., minimal keywords only vs. full sentence overlays vs. question-based hooks). For each approach, based on the approved script (and voice script if applicable), create concise, punchy on-screen text per logical section of the video:
   - Headlines / title cards
   - Key phrases that reinforce the message
   - Stats or proof points
   - CTA text
   - Any legally required text (disclaimers, etc.)

2. **Present each approach as a sequential list** tied to approximate timestamps so the user can compare them side by side.

3. **Approval Gate.**

```
--- Stage: On-Screen Text (3/7 — Sub-stage C) ---

[Text overlay list above]

---
[A] Approve — Lock in these text overlays
[M] Modify — Tell me what to change
[R] Reject — Try a different text approach

Anything to adjust, or shall we move on?
```

4. **Lock in the approved on-screen text.**

---

## Stage 4 — Scene Breakdown (4/7)

### Purpose
Break the approved script into **panels**. Each panel becomes one numbered cell in the composite storyboard sheet (and later one shot in the Phase 2 video prompt). Each ≤15-second block of the video maps to **one sheet**; videos longer than 15s are split across multiple sheets.

### Panel & Sheet Rules

- **Variable panel duration.** Drop the legacy "1 panel ≈ 1 second" assumption. A single panel may span more than one second (e.g. an establishing shot might be `00:00-00:03`). The only hard rules are: per-panel timecodes within a sheet **sum to that sheet's ≤15s window**, and a sensible **panel cap (≤ ~15, sized to the grid)**.
- **Grid mapping** (panels per sheet → grid): 9 → 3×3, 12 → 3×4, 15 → 3×5 (default), 20 → 4×5. Vertical 9:16 flips rows×cols (e.g. 15 → 5×3). Choose the panel count from story complexity; default 15.
- **Multi-sheet splitting (>15s).** If the target duration exceeds 15s, split into N sheets, one per ≤15s block, with **continuing timecodes** (Sheet 2 starts where Sheet 1 ended). The composer helper `splitIntoSheets(beats, durationSeconds)` in `src/storyboard-sheet-prompt.ts` produces the per-sheet specs.

### Execution

1. **Analyze the approved script** (and voice script + on-screen text if applicable).

2. **Break into panels.** Each distinct visual beat gets its own panel. A new panel starts when:
   - The subject changes
   - The location/setting changes
   - The camera angle significantly shifts
   - A new concept or beat in the script begins
   - A transition occurs

   Vary shot types across the sequence (never repeat the same shot type in consecutive panels) and follow a three-act arc (setup → inciting incident → rising tension → climax → denouement).

3. **Build the panel table.** For each panel:

```
### Panel [N]  (Sheet [S])
- **Timecode:** [start] — [end] ([duration])
- **Shot Type:** [Wide / Medium / Close-up / Low Angle / High Angle / Dynamic / OTS / Macro]
- **Script Line:** "[The portion of the script for this panel]"
- **Voice Script:** "[The voice-over line for this panel, if applicable]"
- **On-Screen Text:** "[Text overlay for this panel, if applicable]"
- **Shot Caption:** [The one-line description that will appear under this panel in the sheet]
- **Visual Note:** [What happens visually — action, movement, key elements]
```

4. **Verify duration arithmetic**: Assert that the per-panel timecodes within each sheet sum to that sheet's window (≤15s) and that all sheets together sum to the target video duration confirmed in Stage 2. Reconcile before presenting. Flag any discrepancy: "Sheet [S] panels sum to [X]s but the block is [Y]s — adjusting panel [N] to reconcile."

5. **Present the full breakdown** grouped by sheet (Sheet 1: panels 1–N, Sheet 2: …), as a numbered list.

6. **Call out pacing explicitly:** "The total comes to [N] panels across [M] sheet(s) / [duration]. Here's how the pacing breaks down: [fast-paced opening / steady middle / punchy close]. Does this pacing feel right for [platform]?"

7. **Approval Gate.**

```
--- Stage: Scene Breakdown (4/7) ---

[Full panel breakdown above, grouped by sheet]

Total: [N] panels | [M] sheet(s) | [duration] total
Pacing: [description]

---
[A] Approve — Lock in this panel breakdown
[M] Modify — Adjust panel splits, timecodes, sheet boundaries, or content
[R] Reject — Rethink the panel structure entirely

Should I adjust any panel splits or timing, or does this feel right?
```

---

## Stage 4.5 — Reference Sheet stage (optional) (4.5/7)

### Purpose
Generate **4-view reference sheets** — for **characters and/or products** — on a neutral grey background, so the composite storyboard sheet can pin each subject's identity by receiving these sheets as **reference images**. A single storyboard may use **multiple character AND product sheets together** (e.g. a model holding a soda can), all passed as references up to the provider's reference cap (~8 on Higgsfield; 3 on the ImageEngine fallback). Skip entirely when no subject warrants a sheet or the user declines.

This stage runs **between Stage 4 (Scene Breakdown) and Stage 5 (Visual Direction)** so that:
- The cast and featured products are fully known (panel breakdown is locked).
- Reference-sheet images exist before Stage 6 composes the Phase 1 composite-sheet prompt.
- Style Anchor (Stage 5A) can be written knowing which subjects are sheet-locked. (The Style Anchor fills the `[INSERT DESIRED STYLE]` slot of each sheet; for a first pass, use a provisional style and re-render after 5A if needed.)

### Subject Detection

Scan the approved script and panel breakdown.

**Character subjects** — count a subject as a character when it is a human/animal that performs dialogue or visible action and recurs across ≥2 panels (named or by a consistent referent, e.g. "the runner", "Alex"). Do NOT count voice-over-only narrators or background crowds.

**Product subjects** — count the featured brand product(s) shown as a hero or in-use element across ≥2 panels (e.g. the soda can, the sneaker, the device).

For unnamed subjects, generate a kebab-case slug from the descriptor (`the-runner`, `cola-can`) and ask the user to confirm or rename it. The slug keys the reference-sheet entry and the cache path.

### `brand_category` routing (read from `client/{client}/brand.md`)

| brand_category | Reference sheets | Cache path | Clothing intake |
|---|---|---|---|
| `clothing` | **Per-storyboard** | `client/{client}/storyboards/{project}/references/{slug}/` | Ask which garments the model wears; ask reuse-vs-new model |
| `product` | **Reusable common sheets** (shared across storyboards) | `client/{client}/references/{slug}/` | n/a |
| `service` | Optional; treat like `product` for physical props/talent | `client/{client}/references/{slug}/` | n/a |

If no client is selected (one-off), default to the `product` (reusable) path under a project-local `references/` dir.

### Execution

1. **Detect subjects.** List detected characters and products with the panel numbers they appear in, and the sheet **type** (character / product) for each.

2. **Check for reusable sheets.**
   - **product** brands: scan `client/{client}/references/*/reference.md`; fuzzy-match each product. If a match exists, offer to reuse it as-is or regenerate.
   - **clothing** brands: scan for a cached **model identity** under `client/{client}/storyboards/*/references/*/reference.md`. Reuse re-renders the cached identity wearing this storyboard's selected garments.

3. **Offer reference-sheet generation.**

```
I see these subjects across the script:
  • [Character A] (character) — panels 1,3,7
  • [Product X] (product) — panels 2,5,9

Want me to generate 4-view reference sheets (neutral grey background)
so the storyboard sheet stays visually consistent?

[Y] Yes — generate reference sheets
[N] No — skip; I'll rely on text DNA + Style Anchor only
```

On `[N]`, record the decision and advance to Stage 5. No reference sheets are produced.

4. **Intake (on `[Y]`).**

   **For each character subject**, collect:
   - **Appearance** (age, build, hair, skin, expression range, signature features).
   - **Existing reference photos** (optional) — file paths / gallery IDs, passed as additional references to sheet generation.

   **For clothing brands**, additionally:
   - **Which garments does the model wear in this storyboard?** (select from the brand's catalog; pass the brand's product photos as additional references where available.)
   - **Reuse vs. new model:**

```
This is a clothing brand. For [Character / model]:

[R] Reuse cached model identity — re-render the saved model wearing the new outfit
[N] New model this storyboard — generate a fresh model identity
```

   **For each product subject**, collect product details (form factor, colour, materials, finish, hardware, distinctive surface detail) to fill the product template slots.

   For any subject where appearance/details are missing, draft a best-guess description from the script and confirm before generating.

5. **Generate the 4-view sheet(s).** For each subject, the reference-sheet generator `generateReferenceSheets()` in `src/reference-sheet-generator.ts` calls `image-provider.generateImage()` (**Higgsfield `gpt_image_2` primary → ImageEngine `gpt-image-2`/`gpt-image-1.5` fallback**). Prompts are built per subject type by `composeCharacterSheetPrompt()` / `composeProductSheetPrompt()`; `readBrandCategory()` + `resolveSheetDir()` route the cache path. Parameters:

| Parameter | Value |
|---|---|
| Provider | Higgsfield CLI (primary) → ImageEngine (fallback) |
| Model | `gpt_image_2` (Higgsfield) / `gpt-image-2` (fallback) |
| Aspect ratio | `16:9` |
| Quality / Resolution | `high` / `2k` |
| Reference images (`--image`) | the user's supplied photos (+ brand garment photos for clothing) — repeatable, up to ~8 |
| Prompt | the 4-view template for the subject type, with `[INSERT DESIRED STYLE]` filled from the Style Anchor and the bracketed subject/garment slots filled from the locked description |

   **Character template** (four views): `[VIEW 1 — FULL BODY, FRONT]`, `[VIEW 2 — FULL BODY, REAR]`, `[VIEW 3 — FRONT CLOSE-UP]`, `[VIEW 4 — PROFILE CLOSE-UP]`, on a neutral grey background, clean studio lighting (soft key upper-left, gentle fill from the right), consistent identity across views, **no text, no watermarks, no extra figures, no background environment**.

   **Product template** (four views): `[VIEW 1 — FRONT, THREE-QUARTER]`, `[VIEW 2 — REAR, STRAIGHT-ON]`, `[VIEW 3 — FRONT CLOSE-UP]`, `[VIEW 4 — PROFILE, LEFT SIDE]`, photorealistic product-photography style, same lighting/no-text rules.

   Generation runs per subject in parallel with per-subject error handling. If both providers fail for a subject, its sheet stays undefined and the error surfaces in the gate as `_failed — retry at Stage 4.5 [M]_`.

6. **Render the draft.** Assemble a partial storyboard containing only `## Project Overview`, `## Style Anchor` (placeholder if 5A hasn't run), and `## Reference Sheets` (one 4-view sheet per subject, grouped by type). Present to the user with the approval gate.

7. **Approval Gate.**

```
--- Stage: Reference Sheets (4.5/7) ---

[Draft with one 4-view sheet per subject]

[A] Approve — Lock in the reference sheets and continue to Visual Direction
[M] Modify — Regenerate a sheet, edit a locked description/garments, swap to an existing image, or toggle reuse/new model
[R] Reject — Discard all sheets and redo from scratch

Do these sheets capture each subject accurately?
```

   **`[M] Modify` sub-operations:** regenerate a subject's sheet; edit a locked description or garment selection; swap a sheet to an existing cached/gallery image; for clothing, toggle `[R] Reuse` ↔ `[N] New` model. Re-render and re-present after each op.

8. **Persist on approval.** After `[A]`, write each subject's `sheet.png` + `reference.md` to its `brand_category`-routed cache path (frontmatter: `slug`, `name`, `type` (character|product), `lockedDescription`, `garments` (clothing), `createdAt`, `usedInProjects`, `sheet` with `imagePath`/`imageUrl`/`provider`/`model`). For reused product sheets, append the project to `usedInProjects`.

9. **Set `appearsInPanels`.** Populate each subject's panel list from the breakdown. This drives the "Appears in Panels" line and the reference-image resolution into the composite sheet.

10. **Advance to Stage 5.** All approved reference sheets are handed forward; `resolveSheetReferences()` in `src/reference-sheet-generator.ts` collects them (capped at the provider limit — 8 Higgsfield / 3 ImageEngine) as the reference-image list for Stage 6's composite-sheet generation. The end-to-end flow is wired by `orchestrateStoryboard()` in `src/orchestrate.ts`.

### Skip Conditions (no-op path)

Stage 4.5 is skipped silently when no subject warrants a sheet or the user answers `[N]`. In that case the composite sheet (Stage 6) is generated from text DNA + Style Anchor alone, and the `## Reference Sheets` section is omitted from the final storyboard.

---

## Stage 5 — Visual Direction & Style Anchor (5/7)

### Purpose
Establish the visual identity for the entire storyboard, then define per-scene visual direction.

### This stage has two sub-stages: Style Anchor first, then Per-Scene Direction.

---

### 5A — Style Anchor

The Style Anchor is the visual DNA of the storyboard. Every scene inherits from it. It MUST be locked in before any per-scene work begins.

**If Stage 4.5 ran and reference sheets are populated:** each subject's `lockedDescription` is already authoritative. The Style Anchor MUST NOT redefine physical appearance for those subjects — it may only constrain their stylistic treatment (lighting, palette, mood, camera framing). The "Character Consistency Protocol" subsection below still gets written, but for sheet subjects it should reference the sheet entry rather than restate physical details ("see Reference Sheet entry for [Name]" with a short 1-line summary for readability).

#### Execution

1. **Generate the Style Anchor document** based on the brief, brand context, approved script, and target platform:

```
## Style Anchor

### Color Palette
- **Primary:** [color] — [hex if known, or descriptive]
- **Secondary:** [color]
- **Accent:** [color]
- **Background/Neutral:** [color]
- **Mood:** [warm / cool / neutral / high-contrast / muted]

### Photographic / Visual Style
- **Medium:** [photography / illustration / 3D render / mixed media / animation]
- **Style Reference:** [cinematic / editorial / flat lay / lifestyle / documentary / studio / street]
- **Degree of Abstraction:** [photorealistic / slightly stylized / illustrated / abstract]

### Lighting
- **Overall Mood:** [bright and airy / warm and golden / cool and moody / dramatic / natural]
- **Key Light Style:** [soft diffused / hard directional / rim lighting / backlit / overhead]
- **Time of Day Feel:** [golden hour / midday / twilight / night / studio-neutral]

### Camera Conventions
- **Primary Framing:** [wide / medium / close-up / extreme close-up / mix]
- **Movement Style:** [static / slow dolly / handheld / tracking / drone / slider]
- **Perspective:** [eye-level / low-angle / high-angle / overhead / Dutch angle]

### Character / Product Representation
- **People:** [real people / hands-only / silhouettes / none / illustrated characters]
- **Product:** [hero shot / in-use / lifestyle context / abstract representation]
- **Brand Elements:** [logo placement rules / color usage / watermark / none]

### Overall Aesthetic
[2-3 sentence description of the overall visual feel — the "vibe check" summary]

### Character Consistency Protocol
- **Primary Model Description:** [Detailed physical description that will be repeated verbatim in every scene prompt featuring this character: skin tone, hair style/texture/color, build, facial features, age range]
- **Clothing Continuity:** [What the character wears across scenes — specify what stays constant (e.g., base outfit) vs. what changes (e.g., layered piece per scene)]
- **Expression Range:** [Allowed emotional range — e.g., "calm to subtly amused, never exaggerated"]
- **Distinguishing Features:** [Any consistent accessories, tattoos, jewelry, etc.]

### Environment Consistency Rules
- **Primary Location:** [Setting description that must remain consistent across scenes shot in this location]
- **Lighting Progression:** [How lighting changes across scenes, if at all — e.g., "golden hour throughout" or "morning to midday progression"]
- **Background Anchors:** [Specific background elements that must recur to maintain spatial continuity — e.g., "basketball hoop visible in wide shots", "gallery track lighting overhead"]

### Sheet Style Block
- **Sheet Style Block** (200-400 chars): A condensed text encoding of the above constraints (style genre, palette, lighting, camera conventions). It is woven into the Phase 1 composite-sheet prompt (sections B + D) and fills the `[INSERT DESIRED STYLE]` slot of every reference sheet.
```

2. **Approval Gate.**

```
--- Stage: Style Anchor (5/7 — Sub-stage A) ---

[Style Anchor above]

---
[A] Approve — Lock in this visual identity
[M] Modify — Adjust the visual direction
[R] Reject — Try a completely different visual approach

Does this visual direction match your vision?
```

3. **Lock in the Style Anchor.** All per-scene prompts will reference this.

---

### 5B — Per-Panel Visual Direction

#### Execution

4. **For each panel from the locked-in breakdown**, write detailed visual direction. These feed the per-panel descriptions (section F) of the Phase 1 composite-sheet prompt:

```
### Panel [N] (Sheet [S]) — Visual Direction
- **Subject:** [Who or what is in the frame — specific and detailed]
- **Subjects Present:** [List of subject slugs (character/product) from the Reference Sheets that appear in this panel, or "none". All approved reference sheets feed the sheet's reference-image list; this field tells the composer which subject DNA to weave into this panel's description.]
- **Environment:** [Setting, location, background elements]
- **Camera:** [Angle, framing, movement — inherits from Style Anchor unless overridden]
- **Lighting:** [Panel-specific lighting — inherits from Style Anchor unless overridden]
- **Composition:** [Key elements, focal points, rule-of-thirds placement, negative space]
- **Mood:** [Emotional tone of THIS specific panel]
- **Key Detail:** [The one thing that MUST be right for this panel to work]
- **Consistency Anchors:** [Which elements from the Character Consistency Protocol and Environment Consistency Rules apply here. Flag any intentional deviations from the Style Anchor]
```

> **Note:** There is no per-scene `dependsOn`/reference-chain anymore — the whole block renders as **one composite sheet image**, so panel-to-panel continuity is handled within a single generation. The reference sheets (character + product) are attached once to the sheet generation via `resolveSheetReferences()`; do not list them per panel.

5. **Present all panel visual directions** together as a single document for review.

6. **Approval Gate.**

```
--- Stage: Per-Panel Visual Direction (5/7 — Sub-stage B) ---

[All panel visual directions above]

---
[A] Approve — Lock in all visual directions
[M] Modify — Tell me which panels to adjust and how
[R] Reject — Rethink the visual approach for all panels

Any panels need a different visual treatment, or are we good?
```

---

## Stage 6 — Composite Sheet + Cinematic Video Prompt (6/7)

This stage has two phases. **Phase 1** builds and generates the composite storyboard sheet(s). **Phase 2 is produced only after the Phase 1 sheet is explicitly approved** — it expands the approved panels into a timed cinematic video prompt.

---

### Phase 1 — Composite Storyboard Sheet

#### Purpose
For each ≤15-second block, assemble **one continuous Phase 1 prompt** (the full block, all panels), generate **one composite sheet image** via GPT Image 2 (Higgsfield primary → ImageEngine fallback), and embed it. This replaces the legacy "one image per scene" model.

#### Composer & generation

- The Phase 1 prompt is assembled by `composeStoryboardSheetPrompt()` (per sheet) / `composeStoryboardSheets()` (all sheets) in `systems/scene-board/src/storyboard-sheet-prompt.ts`. `splitIntoSheets(beats, durationSeconds)` already produced the per-sheet specs in Stage 4.
- Generation goes through `image-provider.generateImage()`: **Higgsfield `higgsfield generate create gpt_image_2 --aspect_ratio 16:9 --quality high --resolution 2k [--image <ref>]… --wait --json`**, falling back to ImageEngine `gpt-image-2` (→ `gpt-image-1.5`) on any failure. The provider logs which path served the request.
- All approved reference sheets from Stage 4.5 are attached as reference images (`--image`, repeatable, up to ~8; the ImageEngine fallback caps at 3) via `resolveSheetReferences()`.

#### Phase 1 prompt structure (sections A–H, single continuous block)

The prompt is one flowing block of natural language (NOT bullet points), inside a fenced code block:

| Section | Content |
|---|---|
| **A) Title & Format Header** | Duration, title, panel count, **grid layout** (e.g. "clean 3×5 grid"), style genre. |
| **B) Style Declaration** | Rich style block from the locked Style Anchor (Sheet Style Block). Adapts fully to the style (3D / live-action / anime / 2D). |
| **C) Character/Product Descriptions** | Flowing-prose DNA of each subject, drawn from the locked reference-sheet descriptions. |
| **D) Visual Tone** | Colour grading, atmosphere, lighting quality, rendering approach. |
| **E) Storyboard Layout Details** | The sheet's physical look: header (brand + "15-SECOND STORYBOARD" or block label), numbered frames, **per-panel timecodes**, one-line shot captions under each frame, clean typography, studio-quality presentation. |
| **F) Scene Breakdown** | One line per panel: *"Panel [N] (timecode): [shot type] shot. [description with action, environment, emotional beat]."* Distribute subject DNA across panels (don't front-load). |
| **G) Art Direction Footer** | Expression quality, camera-angle variety, texture/environment detail, composition principles — tailored to the style. |
| **H) Rendering & Format Footer** | Render-quality cues, aspect ratio, "professional storyboard sheet", quality tier. |

**Prompt length guidance:** ~9 panels 800–1,200 words; 12 panels 1,000–1,500; 15 panels 1,200–1,800; 20 panels 1,500–2,000. Don't pad; don't compress at the expense of panel clarity.

#### Execution

1. **For each sheet (≤15s block)**, present the assembled Phase 1 prompt and the generated sheet:

```
### Sheet [S] — [block label, e.g. 00:00–00:15]

**Provider:** [higgsfield | image-engine (fallback)]
**Model:** `gpt_image_2`
**Aspect Ratio:** [16:9 / 9:16]   **Grid:** [3×5 / 5×3 / …]   **Quality:** high   **Resolution:** 2k
**Reference Sheets Attached:** [list of subject slugs, or "none — text DNA only"]

**Phase 1 Prompt** (~[word count] words):
\`\`\`
[The full continuous A–H prompt]
\`\`\`

**Generated Sheet:**
![sheet-[S]]([local path or gallery URL])

**Panel / Timecode Table:**
| Panel | Timecode | Shot Type | Caption |
|---|---|---|---|
| 1 | 00:00–00:02 | Wide | [caption] |
| … | … | … | … |
```

2. **Text in the sheet is intentional.** GPT Image 2 renders the header, panel numbers, timecodes, and captions accurately. Brand wordmarks / polished end cards still prefer **Remotion** for pixel-perfect type — note any such panel as a Remotion render in Production Notes rather than relying on the sheet.

3. **Validate before presenting:**
   - [ ] Per-panel timecodes within each sheet sum to that sheet's ≤15s window; all sheets sum to the target duration
   - [ ] Grid matches the panel count (and is flipped for 9:16 vertical)
   - [ ] Panel count ≤ the cap (≤ ~15 for the default grid; ≤20 max)
   - [ ] Phase 1 prompt is a single continuous block with sections A–H present
   - [ ] Style Anchor is woven into sections B + D
   - [ ] All approved reference sheets are attached as reference images (capped at the provider limit)
   - [ ] Aspect ratio matches the target platform

4. **Approval Gate (Phase 1).**

```
--- Stage 6 · Phase 1 — Composite Storyboard Sheet (6/7) ---

[Sheet(s), prompt(s), and panel/timecode table(s) above]

Total: [M] sheet(s) | [N] panels | [duration]

---
[A] Approve — Lock in the sheet(s); proceed to Phase 2 (cinematic video prompt)
[M] Modify — Change a panel (re-runs the sheet with the approved sheet as a reference), adjust the prompt, or re-run a full sheet
[R] Reject — Rethink the sheet approach entirely

Do these sheets land, or should I adjust anything before the video prompt?
```

   On `[M] Modify` for a **single panel**, follow the reference-based edit path: pass the just-generated sheet back to Higgsfield via `--image` with an instruction to *reproduce the sheet exactly, changing only Panel [N]*, then regenerate the full sheet (best-effort; same path on the ImageEngine fallback). See [iterate-storyboard.md](iterate-storyboard.md). **Do not advance to Phase 2 until the sheet is approved.**

---

### Phase 2 — Cinematic Video Prompt

> Only produce Phase 2 **after the Phase 1 sheet is approved.** This honours the storyboard-prompt-builder methodology (Phase 2 is delivered only on confirmation).

#### Purpose
Expand the approved panels into a single timed cinematic video prompt for an AI video tool, composed by `composeVideoPrompt()` in `systems/scene-board/src/video-prompt.ts`.

#### Structure

1. **Production header** (before the shots):
   - Reference to the approved storyboard sheet (and reference sheets) as the visual keyframe reference.
   - Instruction to follow the exact beat progression, framing, and emotional pacing from the sheet.
   - **Character/product consistency mandate** — list each subject's identifying features; demand they stay identical across every shot.
   - **Style block** — expanded from the Style Anchor into cinematic motion terms (style-adaptive: 3D / live-action / anime / 2D).
   - Focus block — emotional readability, motion quality, continuity.

2. **One timed shot per panel:**
   - **Timecode** `[Xs – Ys]` (sums to the target duration; establishing/emotional beats get more time, quick beats less — variable, matching the panel timecodes).
   - **Shot label** `SHOT N — [SCENE NAME]` (caps).
   - **Shot type + camera** (size, angle, movement in cinematic language).
   - **Scene direction** (blocking, staging, acting beats).
   - **Dialogue** `Character: "Line"` (or none).
   - **SFX** per shot.
   - **Camera movement** verb phrase (dolly-in, tracking, orbit, push-in, static…).

3. **Fixed closing line** (non-negotiable, after the final shot, after a blank line):

```
Audio: Diegetic sound only — natural ambience, environmental foley, and subject-driven sound.
```

**Length guidance:** 9 shots/15s 800–1,200 words; 15 shots/15s 1,200–2,000; 15 shots/30s 1,500–2,500; 20 shots/60s 2,000–3,500.

#### Execution

1. Confirm intent: *"Happy with the storyboard? I'll build the cinematic video prompt next."*
2. Compose and present the video prompt in a **single fenced code block** (header → shots → fixed Audio line). For multi-sheet videos, produce one continuous video prompt spanning all blocks (shots numbered across sheets) or one per block — match the user's preference; default to one continuous prompt.
3. Add a brief companion note (3–5 sentences): pacing choices, any shots likely to need a second pass, optional audio/music pairing.

4. **Approval Gate (Phase 2).**

```
--- Stage 6 · Phase 2 — Cinematic Video Prompt (6/7) ---

[Video prompt code block + companion note above]

Shots: [N] | Duration: [duration] | Closing Audio line: present

---
[A] Approve — Lock in the video prompt and proceed to Final Assembly
[M] Modify — Tell me which shots to adjust
[R] Reject — Rethink the video prompt approach

Any shots need refinement, or is this ready?
```

---

## Stage 7 — Final Storyboard Assembly (7/7)

### Purpose
Compile everything into a single, professional storyboard document (and PDF) ready for production: the composite sheet(s) + the cinematic video prompt.

### Key Principles
- The **composite storyboard sheet image is the PRIMARY view** — one embedded sheet per ≤15s block, each with the Phase 1 prompt that generated it and a panel/timecode table beneath it.
- **Reference Sheets** (when Stage 4.5 ran) appear between Style Anchor and Full Script — one 4-view sheet per subject (character/product). Omitted entirely when Stage 4.5 was skipped.
- The **Phase 2 Cinematic Video Prompt** is its own section after the sheet(s).
- **Production Notes** use the concise table format. **B-Roll shots** are optional.
- There are **no per-scene "NanoBanana Pro Prompt / Generated Image / Kling Video Prompt" blocks** — those are removed. Continuity lives inside the single composite render.

### Validation

- Assert the markdown embeds **one composite sheet image per ≤15s block**, each followed by its Phase 1 prompt and a panel/timecode table.
- Assert per-panel timecodes within each sheet sum to the block's window and all sheets sum to the target duration.
- Assert the **Phase 2 video prompt** is present, has one shot per panel, and ends with the fixed Audio line.
- If Stage 4.5 ran: assert a `## Reference Sheets` section with one 4-view sheet per subject (failed sheets render `_failed — retry at Stage 4.5 [M]_`), and that the cache exists at the `brand_category`-routed path with `reference.md` frontmatter listing the project in `usedInProjects`.

### Execution

1. **Compile the complete storyboard.** Load the template from `assets/storyboard-template.md` (kept in sync with the system-side `systems/scene-board/templates/storyboard-template.md`) and populate it with all approved content. Structure:

```markdown
# [Project Name]

[Subtitle — e.g., "15s Product Ad — Composite Storyboard Sheet + Cinematic Video Prompt"]

---

## PROJECT SPECIFICATIONS

| | |
|---|---|
| **Duration** | [total duration] |
| **Format** | [aspect ratio, e.g., 16:9 Landscape] |
| **Sheets** | [N sheets @ ≤15s each] |
| **Panels** | [total panel count] |
| **Style** | [video style] |
| **Product** | [product name] |
| **Model/Talent** | [model description] |
| **Setting** | [setting/location] |
| **Audio** | [audio summary] |
| **Image Provider** | Higgsfield (GPT Image 2) — ImageEngine fallback |

---

## STYLE ANCHOR

[Locked Style Anchor — palette, visual style, lighting, camera, character/product rules, Sheet Style Block]

---

## REFERENCE SHEETS

[Omit entirely if Stage 4.5 was skipped. For each subject:]

### [Subject Name] — [character | product] (4-view)

![[slug]-reference-sheet]([local path or gallery URL])

- **Type**: [character | product]
- **Locked Description**: [DNA]
- **Garments** (clothing only): [selected garments]
- **Appears in Panels**: [panel list]
- **Provider / Model**: [higgsfield | image-engine] / gpt_image_2

---

## FULL SCRIPT

[Locked full script]

---

## VOICE SCRIPT

[Locked voice script, or N/A]

---

## STORYBOARD SHEET(S)

[For each ≤15s block:]

### Sheet [S] — [block label, e.g. 00:00–00:15]

![storyboard-sheet-[S]]([local path or gallery URL])

**Phase 1 Prompt** (the exact prompt used to generate this sheet):
\`\`\`
[The full continuous A–H Phase 1 prompt]
\`\`\`

| Panel | Timecode | Shot Type | Caption |
|---|---|---|---|
| 1 | 00:00–00:02 | Wide | [caption] |
| … | … | … | … |

---

## PHASE 2 — CINEMATIC VIDEO PROMPT

\`\`\`
[Production header — sheet reference, consistency mandate, style block, focus block]

SHOT 1 — [SCENE NAME]  [0s – 2s]
[shot type + camera, scene direction, dialogue, SFX, camera movement]

SHOT 2 — …

…

Audio: Diegetic sound only — natural ambience, environmental foley, and subject-driven sound.
\`\`\`

*Companion note: [pacing choices, shots to watch, optional audio pairing]*

---

## PRODUCTION NOTES

| Category | Details |
|----------|---------|
| **Color Palette** | [From Style Anchor] |
| **Lighting** | [From Style Anchor] |
| **Camera** | [From Style Anchor] |
| **Text / Type** | [Sheet text is GPT-Image-rendered; brand wordmarks/end cards via Remotion] |
| **Music** | [Music style, tempo, mood] |

---

## B-ROLL SHOTS (optional)

[Only include if B-roll was identified during the pipeline]

| # | B-Roll Name | Use During | Audio / Text |
|---|------------|------------|--------------|
| B1 | **[name]** | [which panel/block] | [audio/text] |

---

[Product Name] | [Tagline] | [Website]
```

2. **Save the storyboard document.**
   - **If a client was selected in Stage 0**: Save to `client/{client}/storyboards/{project-name}/{project-name}-v1.md` (sheet images saved alongside under the same folder).
   - **If no client context**: Ask the user where they'd like it saved.

3. **Generate PDF version.** After saving the markdown, generate a professional PDF (md-to-pdf tooling) saved alongside as `{project-name}-v1.pdf`, following the structure above:
   - **Title page**: Project name, subtitle, then PROJECT SPECIFICATIONS table.
   - **Style Anchor** + **Reference Sheets** (4-view images, omit if skipped).
   - **Full Script** + **Voice Script**.
   - **Storyboard Sheet(s)**: each embedded composite sheet image, its Phase 1 prompt, and the panel/timecode table.
   - **Phase 2 Cinematic Video Prompt**: the full prompt block.
   - **Production Notes** + optional **B-Roll**.
   - **Footer**: Product name | Tagline | Website.

4. **Present the final storyboard** in full.

5. **Final Approval Gate.**

```
--- Stage: Final Storyboard Assembly (7/7) ---

Storyboard compiled: [M] sheet(s) | [N] panels | [duration] total
Saved to: [file path]
PDF version: [pdf file path]

---
[A] Approve — Storyboard complete! Ready for production.
[M] Modify — Tell me what needs adjustment (routes to iterate mode)
[R] Reject — Major rework needed

Is this storyboard ready for production, or should I adjust anything?
```

---

## Reference Video Handling

When the brief includes a link to a reference video (Instagram, TikTok, YouTube, etc.):

1. **Analyze the reference carefully.** Note:
   - Overall structure and pacing
   - Scene transitions and shot types
   - Color palette and visual style
   - Text overlay usage
   - Audio/music style
   - What makes it effective

2. **Understand intent.** Ask the user:
   - "What specifically do you want to keep from this reference?" (style, pacing, structure, tone)
   - "What should be different?" (product, messaging, audience)

3. **Use as inspiration, not template.** The reference informs the creative direction but the storyboard should be original.

---

## Contradictory Brief Handling

When the brief contains contradictions (e.g., "minimal and bold" or "30-second explainer with 20 talking points"):

1. **Do not ignore contradictions.** Flag them.
2. **Research market precedent.** Consider how successful campaigns have resolved similar tensions.
3. **Be creative.** Find a synthesis that honors both intents where possible.
4. **Present your approach** and let the user decide:
   - "I noticed your brief asks for both X and Y, which can pull in different directions. Here's how I'd reconcile them: [approach]. Does that work, or should I lean more toward one side?"

---

## Error Recovery

- **User goes silent at an approval gate:** After presenting, wait. Do not auto-advance.
- **User wants to go back to a previous stage:** Allow it. Re-run the requested stage while preserving later-stage work where possible. Warn if changes cascade: "Changing the script will require regenerating scenes 4-6. Shall I proceed?"
- **User provides new information mid-pipeline:** Capture it. If it affects the current stage, incorporate immediately. If it affects a locked stage, flag it: "This changes what we locked in at Stage [N]. Want me to go back and adjust?"
- **Brief is too vague to proceed:** Do not guess. Ask specific questions. "I need at least [X, Y, Z] to generate a good storyboard. Can you tell me about those?"

---

## Handoff to Iterate Mode

If at any point during the pipeline the user wants to:
- Change one or more panels in an approved sheet (reference-based panel edit)
- Re-run a full sheet or regenerate the Phase 2 video prompt
- Revise a previously approved component without restarting
- Make surgical changes to the storyboard

Route them to **iterate-storyboard.md** which handles single-image-sheet panel edits, full-sheet re-runs, Phase 2 regeneration, cascade logic, and surgical revisions. The generate pipeline is designed for full initial creation; iterate mode handles all post-approval modifications.

The final approval gate in Stage 7 also offers [M] Modify, which routes to iterate mode for targeted changes.
