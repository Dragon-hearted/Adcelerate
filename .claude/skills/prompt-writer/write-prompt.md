# Write Prompt Workflow

## Purpose

Compose an optimized, model-specific generation prompt by loading the target model's knowledge file, applying visual direction principles, and validating against model constraints.

## Workflow

### Step 1: Gather Context

Collect the following from the user (ask for anything missing):

1. **Generation type** — Image, video, or voice?
2. **Target model** — Which model? (If unsure, route to [select-model.md](select-model.md) first)
3. **What to generate** — Subject, scene, product, concept
4. **Purpose** — Ad, storyboard scene, product shot, social content, etc.
5. **Style/brand context** — Any existing Style Anchor, brand guidelines, or visual direction?
6. **References** — Product shots, previous scene outputs, style references available?
7. **Technical requirements** — Aspect ratio, duration (video), format, platform target?

### Step 2: Load Model Knowledge

Read the target model's knowledge file:
```
systems/prompt-writer/knowledge/models/{type}/{model}.md
```

Extract:
- **Prompt structure** — Required and optional elements, template
- **Constraints** — Character limits, duration limits, reference limits, text rendering capability
- **Best practices** — Model-specific do's and don'ts
- **Creative mode** — If applicable (e.g., NanoBanana Pro Faithful/Expressive/Vision/Image Asset)

### Step 3: Load Visual Direction (Image/Video)

For image and video prompts, read the relevant visual direction files:
```
systems/prompt-writer/knowledge/visual-direction/shot-types.md
systems/prompt-writer/knowledge/visual-direction/composition.md
systems/prompt-writer/knowledge/visual-direction/lighting.md
```

Select appropriate vocabulary for:
- **Camera** — Shot size, angle, framing, lens feel
- **Composition** — Spatial rules, depth cues, element placement
- **Lighting** — Mood, direction, quality, subject interaction

### Step 4: Compose Prompt

Build the prompt following the model's documented structure:

**For image models (NanoBanana Pro, Flux, Ideogram, etc.):**
1. System instruction (if model supports it) — Role, constraints, key directive
2. Style Anchor preamble (if provided) — Paste verbatim
3. Subject description — Specific physical details, 3-5 attributes minimum
4. Environment — Setting with foreground/midground/background layers
5. Camera — Angle, framing, depth of field
6. Lighting — Direction, quality, subject interaction
7. Composition — Spatial rules, focal points
8. Brand elements — Product details, logo placement
9. Mood — Emotional quality
10. Terminal constraint — "No text in image." (for text-incapable models)

**For video models (Kling, Veo, Sora 2, etc.):**
- If image-to-video: Focus on motion, camera movement, atmosphere (NOT visual description)
- If text-to-video: Include full visual description + motion + audio direction

**For voice models (ElevenLabs, OpenAI TTS, Cartesia):**
- Clean, naturally punctuated script text
- Voice selection recommendation
- Settings (stability, speed, emotion)

### Step 5: Validate Constraints

Check the composed prompt against the model's constraints table:

- [ ] Prompt length within character/token limits
- [ ] System instruction within its own limit (if applicable)
- [ ] Number of references within model's reference limit
- [ ] Duration within model's max duration (video)
- [ ] Aspect ratio supported by model
- [ ] No text requested from text-incapable models
- [ ] Negative prompt included (if model supports and benefits from it)

If any constraint is violated, revise the prompt before presenting.

### Step 6: Present with Annotations

Present the final prompt to the user with:

1. **The prompt itself** — Formatted and ready to use
2. **Model settings** — Mode, variant, parameters to set
3. **Annotations** — Brief notes explaining key prompt decisions
4. **Constraint check** — Confirmation that all limits are respected
5. **Reference guidance** — What reference images to provide and what to match

### Multi-Model Pipeline Support

If the user is building a multi-model pipeline (e.g., NanoBanana Pro image -> Kling video):

1. Write the image prompt first following the image model's structure
2. Then write the video prompt, noting that it should NOT re-describe the visual scene
3. Note any pipeline-specific considerations from `systems/prompt-writer/knowledge/domain.md` Section 7

## Quality Checklist

Before presenting any prompt, verify:

- [ ] **Specific over generic** — No vague descriptions; every element has 3+ specific details
- [ ] **Model-appropriate structure** — Follows the target model's documented prompt template
- [ ] **Visual direction applied** — Camera, composition, and lighting are deliberately chosen
- [ ] **Constraints respected** — All limits checked and confirmed
- [ ] **Style Anchor included** — If provided, pasted verbatim (not paraphrased)
- [ ] **Depth cues present** — At least 2 depth cues for image prompts (receding lines, foreground elements, etc.)
- [ ] **Lighting interaction** — Describes how light hits specific surfaces, not just what time of day
- [ ] **Terminal constraint** — "No text in image" for text-incapable image models
