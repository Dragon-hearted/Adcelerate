---
name: scene-board
description: "Create professional video storyboards from briefs. Use when user wants to create a storyboard, generate scene layouts, visualize video concepts, produce NanoBanana Pro prompts for video scenes, or says 'storyboard this,' 'scene breakdown,' 'visualize this ad,' 'create scenes for,' 'video storyboard,' 'shot list,' 'NanoBanana prompts,' or 'I need a storyboard.' For ad copy only, see ad-creative. For campaign strategy, see paid-ads."
---

# SceneBoard -- Professional Storyboard Creator

SceneBoard transforms video briefs of any format into production-ready storyboards with NanoBanana Pro prompts. It uses a dynamic, approval-gated pipeline where any component provided in the brief is locked in and any component missing is generated as multiple options for the user to choose from. The result is a complete storyboard document -- script, voice script, scene breakdown, visual direction, and image generation prompts -- that meets a "client gets flattened" quality bar.

## Before Starting

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setup), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

## On Activation

1. Greet the user and briefly explain what SceneBoard does.
2. **Client Selection** -- Ask which client this storyboard is for:
   - If the user names an existing client, load their brand profile from `systems/scene-board/clients/{client-name}/brand.md` and confirm the brand context. This eliminates most brand-related questions in later stages.
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

Client brand knowledge and storyboard outputs are stored at:

```
systems/scene-board/clients/{client-name}/
  brand.md              # Compiled brand profile (quick-reference)
  knowledge/            # Detailed brand knowledge files
  storyboards/          # Generated storyboard outputs
```

When a client is selected, read `brand.md` to pre-load brand voice, visual direction, target audience, and style philosophy into the pipeline context.

---

## 8-Stage Pipeline

| Stage | Name | What Happens |
|-------|------|--------------|
| 0 | Client Selection | Identify client; load brand knowledge from `systems/scene-board/clients/` |
| 1 | Brief Intake | Parse the brief; classify each component as provided or missing |
| 2 | Context Gathering | Confirm brand, audience, platform, goals; fill gaps (skips brand questions if client loaded) |
| 3 | Dynamic Generation & Approval | Generate options for every missing component; approval gates |
| 4 | Scene Breakdown | 1 shot = 1 scene = 1 image; assign timestamps and durations |
| **4.5** | **Character Sheet (optional)** | **If ≥2 protagonists detected: generate 6 reference views per character (2 full-body + 4 face angles); cache per-client for reuse** |
| 5 | Visual Direction | Build Style Anchor document + per-scene visual direction |
| 6 | NanoBanana Prompt Generation | Write optimized prompts per scene within platform constraints (threads character views into `referenceImageIds`) |
| 7 | Final Assembly | Compile the complete storyboard document + generate professional PDF |

---

## Dynamic Workflow Principle

For EVERY storyboard component, without exception:

- **Provided in the brief** -> lock it in immediately, no regeneration needed
- **NOT provided** -> generate at least 2 distinct options -> present for approval -> lock in on approval

This applies uniformly to: script, voice script, on-screen text, scene breakdown, visual direction, and NanoBanana prompts. No component is treated differently.

## Approval Gate Protocol

After each generation step, present:

```
[A] Approve -- Lock in and proceed
[M] Modify -- Provide feedback, regenerate
[R] Reject -- Discard and try a different approach
```

Never auto-approve. Never skip gates. If the user selects Modify, re-run the same stage with their feedback -- do not advance to the next stage.

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

## Style Anchor System

The Style Anchor enforces visual consistency across every scene. Without it, NanoBanana prompts drift and the storyboard looks incoherent.

1. **Generate** a Style Anchor document covering: color palette, photo vs. illustration style, abstraction level, lighting mood, camera conventions, character rules, product rendering rules
2. **Present for approval** before generating any scene prompts
3. **Include as preamble** in EVERY NanoBanana Pro prompt for the storyboard
4. Overrides to the Style Anchor must be explicit and user-approved

---

## Character Sheet System (Stage 4.5)

When a script has ≥2 protagonists, text descriptions alone aren't enough — characters drift between scenes (wrong jaw, wrong hair, wrong jacket). Stage 4.5 fixes this by generating a 6-view reference sheet per character before scene generation starts.

See [generate-storyboard.md](generate-storyboard.md) Stage 4.5 for the full workflow. Summary:

1. **Detect** ≥2 protagonists in the approved scene breakdown.
2. **Offer** to generate sheets; collect per-character appearance + existing reference photos.
3. **Reuse** an existing sheet from `systems/scene-board/clients/{client}/characters/{slug}/` when a name matches (fuzzy).
4. **Generate** 6 views per character: `body-front` (NanoBanana Pro, anchor) → `body-back`, `face-front`, `face-back`, `face-left`, `face-right` (all Flash, chained off the anchor).
5. **Gate** approval with `[A]/[M]/[R]`; `[M]` supports regenerating a single view, editing a locked description, or swapping a view.
6. **Cache** the approved sheet under `clients/{client}/characters/{slug}/` for reuse.
7. **Thread** the angle-matched view of each character into every downstream scene's `referenceImageIds` (via `pickViewForScene()` in `batch-generator.ts`).

**Four-tier consistency model** (updated from the legacy three-tier):

| Tier | Signal | Handled by |
|---|---|---|
| 0 | Character view reference (per-scene pixel anchor) | Stage 4.5 output → `resolveReferenceImageIds()` |
| 1 | Style Anchor preamble (text prefix in every prompt) | Stage 5A |
| 2 | Locked character description (text, repeated in every prompt) | `Character.lockedDescription` |
| 3 | Scene-1 environment anchor (pixel continuity for setting) | `dependsOn` chain — **dropped when character views fill the 3-ref cap** |

**Opt-out is safe**: if fewer than 2 protagonists are detected or the user declines, the registry stays empty, no `## Character Sheet` section renders, and the existing Scene-1 anchor workflow runs unchanged.

---

## NanoBanana Pro Constraints

Quick reference for prompt generation:

| Constraint | Limit |
|---|---|
| Prompt length | 8192 characters max |
| System instruction | 512 characters max |
| Reference images | 3 per scene max |
| Creative modes | Faithful, Expressive, Vision, Image Asset |

**Scene prompt structure:**
Mode preamble -> scene context -> subject -> environment -> camera -> lighting -> composition -> style anchor reference -> brand elements

**Critical rules:**
- Text rendering is GARBLED in NanoBanana -- flag any text-heavy scene for Remotion rendering instead
- Prompts must be highly specific to the product and brand; generic visual descriptions are the number one failure mode
- Every prompt must reference the Style Anchor to maintain consistency

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

Always confirm the target platform before scene breakdown. Platform determines aspect ratio, duration limits, and pacing conventions.

---

## Quality Standards

- **"Client gets flattened"** -- every storyboard should exceed professional agency output
- **Failure #1: Prompt/visual mismatch** -- prompts must be highly specific to the actual product and brand, not generic stock-photo descriptions
- **Failure #2: Style inconsistency** -- enforced via the Style Anchor system; no scene should visually clash with another
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
- **remotion-best-practices** -- Code-based video rendering for text-heavy scenes
- **prompt-writer** -- Centralized prompt engineering for NanoBanana Pro, Kling, and all generation models
