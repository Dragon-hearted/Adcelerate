# Generate Storyboard — Full Workflow

**Trigger:** User selects `[GS] Generate Storyboard` from SKILL.md
**Goal:** Take any creative brief and transform it into a complete, production-ready storyboard with NanoBanana Pro prompts for each scene.
**Pipeline:** 8 sequential stages (Stage 0-7), each gated by explicit user approval.

---

## Stage 0 — Client Selection (0/7)

### Purpose
Identify the client and load their brand knowledge before any creative work begins.

### Execution

1. **If a client was already selected in SKILL.md activation**, skip to confirmation.
2. **If not**, ask: "Which client is this storyboard for?"
   - Show known clients by checking `systems/scene-board/clients/` for existing directories.
3. **If client exists**: Load `systems/scene-board/clients/{client}/brand.md` and present a brief summary:

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

6. **Also load detailed knowledge** if available: read files from `systems/scene-board/clients/{client}/knowledge/` for deeper context (visual direction, brand positioning) that can inform the Style Anchor in Stage 5.

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

   **Why this matters:** Product images are used as NanoBanana Pro reference images during generation. Without them, the AI generates its interpretation of the product, which often misses specific design details (prints, trim colors, logo placement, fabric texture). With actual product photos as references, generation accuracy improves dramatically — the AI matches the real product instead of inventing one.

   **If the user provides product images:**
   - Save/note them as reference assets for this storyboard project
   - These will be automatically included as reference images in Stage 6 for every scene where the product appears
   - Product-hero scenes (close-ups, reveals) should use Faithful creative mode with the product image as primary reference

   **If the user cannot provide product images:**
   - Acknowledge and proceed — this is not a blocker
   - Note in the context summary: "Product images: Not available — generation will rely on text descriptions only"
   - In Stage 6, prompts must be extra-specific about product details (print patterns, colors, fabric, design elements) to compensate for missing visual references

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
Break the approved script into individual shots. Each shot change = one scene = one image to generate.

### Execution

1. **Analyze the approved script** (and voice script + on-screen text if applicable).

2. **Break into scenes.** Each distinct visual moment gets its own scene. A new scene starts when:
   - The subject changes
   - The location/setting changes
   - The camera angle significantly shifts
   - A new concept or beat in the script begins
   - A transition occurs

3. **Build the scene table.** For each scene:

```
### Scene [N]
- **Timestamp:** [start] — [end] ([duration])
- **Script Line:** "[The portion of the script for this scene]"
- **Voice Script:** "[The voice-over line for this scene, if applicable]"
- **On-Screen Text:** "[Text overlay for this scene, if applicable]"
- **Visual Note:** [Brief description of what happens visually — action, movement, key elements]
```

4. **Verify duration arithmetic**: Assert that the sum of all individual scene durations equals the target video duration confirmed in Stage 2. If there is a mismatch, reconcile before presenting to the user. Flag any discrepancy: "Total scene duration is [X]s but target duration is [Y]s — adjusting scene [N] to reconcile."

5. **Present the full breakdown** as a numbered list of all scenes.

6. **Call out pacing explicitly:** "The total comes to [N] scenes across [duration]. Here's how the pacing breaks down: [fast-paced opening / steady middle / punchy close / etc.]. Does this pacing feel right for [platform]?"

7. **Approval Gate.**

```
--- Stage: Scene Breakdown (4/7) ---

[Full scene breakdown above]

Total: [N] scenes | [duration] total
Pacing: [description]

---
[A] Approve — Lock in this scene breakdown
[M] Modify — Adjust scene splits, durations, or content
[R] Reject — Rethink the scene structure entirely

Should I adjust any scene splits or timing, or does this feel right?
```

---

## Stage 5 — Visual Direction & Style Anchor (5/7)

### Purpose
Establish the visual identity for the entire storyboard, then define per-scene visual direction.

### This stage has two sub-stages: Style Anchor first, then Per-Scene Direction.

---

### 5A — Style Anchor

The Style Anchor is the visual DNA of the storyboard. Every scene inherits from it. It MUST be locked in before any per-scene work begins.

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

### NanoBanana Preamble
- **NanoBanana Preamble** (200-400 chars): A condensed text encoding of the above constraints, to be included verbatim at the start of every NanoBanana Pro prompt for this project.
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

### 5B — Per-Scene Visual Direction

#### Execution

4. **For each scene from the locked-in breakdown**, write detailed visual direction:

```
### Scene [N] — Visual Direction
- **Subject:** [Who or what is in the frame — specific and detailed]
- **Environment:** [Setting, location, background elements]
- **Camera:** [Angle, framing, movement — inherits from Style Anchor unless overridden]
- **Lighting:** [Scene-specific lighting — inherits from Style Anchor unless overridden]
- **Composition:** [Key elements, focal points, rule-of-thirds placement, negative space]
- **Mood:** [Emotional tone of THIS specific scene]
- **Key Detail:** [The one thing that MUST be right for this scene to work]
- **Consistency Anchors:** [Which elements from the Character Consistency Protocol and Environment Consistency Rules apply here. Flag any intentional deviations from the Style Anchor]
- **Reference Chain:** [If this scene should use a previous scene's generated image as a reference for consistency, note it: e.g., "Reference Scene 1 output for character face/body continuity." Scene 1 typically has no reference chain — it establishes the visual baseline]
```

5. **Present all scene visual directions** together as a single document for review.

6. **Approval Gate.**

```
--- Stage: Per-Scene Visual Direction (5/7 — Sub-stage B) ---

[All scene visual directions above]

---
[A] Approve — Lock in all visual directions
[M] Modify — Tell me which scenes to adjust and how
[R] Reject — Rethink the visual approach for all scenes

Any scenes need a different visual treatment, or are we good?
```

---

## Stage 6 — NanoBanana Pro Prompt Generation (6/7)

### Purpose
Compose production-ready image generation prompts for each scene, formatted for NanoBanana Pro.

### NanoBanana Pro Prompt Structure

Each prompt consists of:
- **System Instruction** (max 512 characters): A creative mode preamble that sets the generation context
- **Prompt** (max 8192 characters): The full scene description
- **Creative Mode**: One of four modes
- **Reference Images**: Up to 3 references with guidance
- **Aspect Ratio**: Matching the target platform

### Creative Mode Selection Guide

| Mode | Use When |
|------|----------|
| **Faithful** | Product shots, brand assets, anything requiring accuracy to a reference |
| **Expressive** | Creative campaigns, lifestyle imagery, emotional scenes |
| **Vision** | Abstract concepts, mood imagery, artistic/conceptual scenes |
| **Image Asset** | Isolated graphics, icons, elements on transparent/solid backgrounds |

### Execution

1. **For each scene**, compose the image prompt:

```
### Scene [N] — NanoBanana Pro Prompt

**Creative Mode:** [Faithful / Expressive / Vision / Image Asset]
**Aspect Ratio:** [9:16 / 16:9 / 1:1 / 4:5]
**Render Method:** [nanobanana-pro / remotion]

**System Instruction:**
[Max 512 characters. Set the creative context for this scene type. Example: "You are generating a cinematic product lifestyle photograph for a premium skincare brand. Focus on warm, golden-hour lighting with shallow depth of field."]

**Prompt:**
[Style Anchor preamble — 1-2 sentences summarizing the locked-in visual identity]
[Scene context — what moment in the story this captures]
[Subject — detailed description of who/what is in the frame]
[Environment — setting, background, spatial context]
[Camera — angle, framing, lens feel, movement suggestion]
[Lighting — scene-specific lighting description]
[Composition — focal points, element placement, depth]
[Brand elements — any logo, color, or identity elements in frame]
[Mood — emotional quality of the image]
No text in image.

**Reference Guidance:**
- Reference 1: [What to look for / what aspect to match]
- Reference 2: [What to look for / what aspect to match]
- Reference 3: [What to look for / what aspect to match]
(Or: No references needed for this scene)
```

1b. **Consistency Check** — Before finalizing each scene's prompt, verify:
   - [ ] Character physical description matches the Character Consistency Protocol from the Style Anchor EXACTLY (same skin tone, hair, build descriptors)
   - [ ] Clothing continuity maintained — base outfit elements present unless the script explicitly changes them
   - [ ] Environment details match Environment Consistency Rules (same location identifiers, consistent background anchors)
   - [ ] Style Anchor preamble included verbatim at the start of the prompt
   - [ ] Reference images assigned per the Reference Chain from Stage 5B:
     - **Scene 1** (establishing shot): Product images only (no previous scene output to reference)
     - **Scenes 2-N** (same character): Include Scene 1's generated image ID as a `referenceImageId` via the batch generator's `dependsOn` mechanism, PLUS any product images
     - **Same-location scenes**: Include the establishing shot's image ID as reference for environment continuity
   - [ ] Any intentional deviations from the Style Anchor are explicitly noted in the prompt

   **Reference Feedback Loop Implementation:**
   When submitting to ImageEngine batch endpoint, scenes referencing earlier outputs must use the `dependsOn` field so they generate sequentially. The dependency scene's output ID becomes available as a `referenceImageId` for the dependent scene. This gives NanoBanana Pro a visual anchor for face/body/environment consistency that text alone cannot achieve.

   See `systems/prompt-writer/knowledge/models/image/nanobanana-pro.md` (Reference Image Best Practices section) for reference image strategies. PromptWriter is the authoritative source for all prompt engineering knowledge.

2. **Text-heavy scenes.** For scenes that are primarily text (title cards, end cards, CTA screens, lower thirds, disclaimer screens), do NOT generate a NanoBanana prompt. Instead:

```
### Scene [N] — Remotion Render

**Render Method:** remotion
**Rationale:** This scene is text-heavy and requires precise typographic control.

**Text Content:**
[The exact text to render]

**Style Notes:**
- Font style: [matching brand/style anchor]
- Color: [from palette]
- Animation: [fade in / type on / slide / etc.]
- Background: [solid color / gradient / from previous scene blur]
```

3. **Critical rule:** Every NanoBanana Pro prompt MUST end with `No text in image.` — NanoBanana cannot reliably render text, so all text is handled by Remotion in post-production.

4. **Present all prompts** together.

5. **Validate constraints** before presenting to user:
   - [ ] Each system instruction ≤ 512 characters
   - [ ] Each prompt ≤ 8,192 characters
   - [ ] Each scene has ≤ 3 reference images
   - [ ] Each prompt specifies a creative mode (Faithful/Expressive/Vision/Image Asset)
   - [ ] Style Anchor preamble is included in every NanoBanana prompt
   - [ ] Every prompt ends with "No text in image."
   - [ ] Text-heavy scenes are marked `render: remotion`, not `render: nanobanana-pro`
   - [ ] Aspect ratio in each prompt matches the target platform
   - [ ] Character physical descriptions are identical across all scene prompts (verified against Character Consistency Protocol)
   - [ ] Reference chains configured: scenes sharing a character or location reference the appropriate earlier scene's output via `referenceImageIds`/`dependsOn`

   If any constraint is violated, fix it before presenting.

6. **Approval Gate.**

```
--- Stage: NanoBanana Pro Prompt Generation (6/7) ---

[All prompts above]

Total: [N] NanoBanana Pro prompts | [N] Remotion renders

---
[A] Approve — Lock in all prompts
[M] Modify — Tell me which scene prompts to adjust
[R] Reject — Rethink the prompt approach entirely

Any prompts need refinement, or are these ready for generation?
```

---

## Stage 7 — Final Storyboard Assembly (7/7)

### Purpose
Compile everything into a single, professional table-format storyboard document ready for production.

### Key Principles
- The **scene table is the PRIMARY view** — it must contain all essential information at a glance
- **NanoBanana Pro prompts are separated BELOW the table** (not inline with scenes) for cleaner reading
- The **Visuals column** contains "[Visual placeholder]" — space for generated/inserted images
- **Production Notes** use the concise table format
- **B-Roll shots** are optional and only included when identified during the pipeline

### Execution

1. **Compile the complete storyboard** using the professional table format. Load the template from `assets/storyboard-template.md` and populate it with all approved content from prior stages:

```markdown
# [Project Name]

[Subtitle — e.g., "UGC Video Ad - Storyboard & Nano Banana Pro Prompts"]

---

## PROJECT SPECIFICATIONS

| | |
|---|---|
| **Duration** | [total duration, e.g., ~60 sec] |
| **Format** | [aspect ratio, e.g., 9:16 Vertical] |
| **Style** | [video style, e.g., Aesthetic UGC] |
| **Product** | [product name] |
| **Model/Talent** | [model description from context] |
| **Setting** | [setting/location from visual direction] |
| **Audio** | [audio description — music, VO, SFX summary] |

---

## STORYBOARD

*On-Screen Text (Hook): [hook text from approved on-screen text]*

| Seq | Scene | Visual Action & Composition | Audience Sees | Audio / Text | Visuals |
|-----|-------|----------------------------|---------------|--------------|---------|
| 01 | [Scene Name] ([start]-[end]) | [Visual direction from Stage 5B: subject, environment, composition, mood, key detail. Include movement and action.] Camera: [camera angle, framing, movement from Stage 5B] | [What the audience perceives/feels — the emotional or cognitive takeaway of this scene] | [Voice script line if applicable] [On-screen text if applicable] [SFX/music cues] [ALT HOOKS if Scene 01] | [Visual placeholder] |
| ... | ... | ... | ... | ... | ... |

[Repeat for all scenes from the locked-in scene breakdown]

---

## NanoBanana Pro Prompts

[For each scene, include the full NanoBanana Pro prompt from Stage 6:]

### Scene 01 — [Scene Name]

**Render Method**: [nanobanana-pro / remotion]
**Creative Mode**: [Faithful / Expressive / Vision / Image Asset]

**System Instruction** ([char count] chars):
\`\`\`
[System instruction from Stage 6]
\`\`\`

**Prompt** ([char count] chars):
\`\`\`
[Full prompt from Stage 6]
\`\`\`

> Remember: All NanoBanana Pro prompts must end with "No text in image." to prevent garbled text artifacts.

**Reference Images**:
1. [Reference 1 from Stage 6]
2. [Reference 2 from Stage 6]
3. [Reference 3 from Stage 6]

---

[Repeat for all scenes]

## PRODUCTION NOTES

| Category | Details |
|----------|---------|
| **Color Palette** | [From Style Anchor — primary, secondary, accent colors and mood] |
| **Lighting** | [From Style Anchor — overall mood, key light style, time of day feel] |
| **Camera** | [From Style Anchor — primary framing, movement style, perspective] |
| **Text Style** | [Font/typography direction, color, animation approach for on-screen text] |
| **Music** | [Music style, tempo, mood, any specific track references] |

---

## B-ROLL SHOTS (can be used if needed)

[Only include this section if B-roll shots were identified during the pipeline]

| Seq | B-Roll Name | Use During | Audio / Text | Visuals |
|-----|------------|------------|--------------|---------|
| B1 | **[B-roll name]** | [Which scene this supplements] "[contextual quote or description]" Duration: [duration] | [Audio/text during B-roll] | [Visual placeholder] |
| ... | ... | ... | ... | ... |

---

[Product Name] | [Tagline] | [Website]
```

2. **Save the storyboard document.**
   - **If a client was selected in Stage 0**: Save to `systems/scene-board/clients/{client}/storyboards/{project-name}-v1.md`
   - **If no client context**: Ask the user where they'd like it saved.

3. **Generate PDF version.** After saving the markdown storyboard, generate a professional PDF:
   - Use markdown-pdf tooling (or equivalent) to convert the storyboard to a PDF.
   - Save the PDF alongside the markdown file as `{project-name}-v1.pdf`.
   - The PDF should follow the professional table layout matching the markdown structure:
     - **Title page**: Product name prominently displayed, subtitle, then PROJECT SPECIFICATIONS table (Duration, Format, Style, Product, Model/Talent, Setting, Audio)
     - **Storyboard section**: On-screen text hook displayed above the main scene table. The scene table uses columns: Seq, Scene, Visual Action & Composition, Audience Sees, Audio/Text, Visuals (placeholder space for images)
     - **NanoBanana Pro Prompts**: Separated below the scene table in their own section, one sub-section per scene with Render Method, Creative Mode, System Instruction, Prompt, and Reference Images
     - **Production Notes**: Table format with rows for Color Palette, Lighting, Camera, Text Style, Music
     - **B-Roll Shots**: Optional section — only include when B-roll was identified during the pipeline. Uses its own table with columns: Seq, B-Roll Name, Use During, Audio/Text, Visuals
     - **Footer**: Product name | Tagline | Website

4. **Present the final storyboard** in full.

5. **Final Approval Gate.**

```
--- Stage: Final Storyboard Assembly (7/7) ---

Storyboard compiled: [N] scenes | [duration] total
Saved to: [file path]
PDF version: [pdf file path]

---
[A] Approve — Storyboard complete! Ready for production.
[M] Modify — Tell me what needs adjustment
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
- Re-run only specific scenes (e.g., "regenerate scenes 3-5")
- Revise a previously approved component without restarting
- Make surgical changes to the storyboard

Route them to **iterate-storyboard.md** which handles partial re-runs, cascade logic, and surgical revisions. The generate pipeline is designed for full initial creation; iterate mode handles all post-approval modifications.

The final approval gate in Stage 7 also offers [M] Modify, which routes to iterate mode for targeted changes.
