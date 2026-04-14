# PromptWriter — Domain Knowledge

This document captures the foundational domain knowledge for the PromptWriter system. It covers prompt engineering principles, visual direction fundamentals, model-specific patterns, and the extensibility mechanisms that allow new models to be added over time. Individual model files in `knowledge/models/` contain per-model specifics; this document covers the cross-cutting concepts that apply everywhere.

---

## 1. Prompt Engineering Fundamentals

### Specificity Over Generality

The single most important principle in AI generation prompting: **specific descriptions produce better results than generic ones**. Every vague word is a decision the model makes without your input.

| Generic (bad) | Specific (good) |
|---------------|-----------------|
| "A man in a shirt" | "A young Indian man with fair skin in his early 20s wearing a vibrant red oversized crew-neck t-shirt with a large watercolor-style painted rabbit illustration on the front" |
| "Good lighting" | "Golden hour sunlight from the side and slightly behind him, casting long warm shadows on the concrete. Soft rim light on his shoulders and hair edges" |
| "Nice background" | "Outdoor basketball court with concrete bleachers, court lines visible, distant figures in soft focus, warm amber sky" |

The specificity rule applies to every prompt element: subjects, environments, lighting, composition, mood, and brand elements. If you can name 3-5 specific physical details for each element, the model has enough information to produce a coherent, intentional image.

### Constraint Awareness

Every model has hard limits that prompts must respect. Violating these constraints wastes generation budget and produces poor results.

**Common constraint types across models:**
- **Character limits** — System instructions, prompt body, and combined limits vary per model. NanoBanana Pro allows 512 chars for system instruction and 8192 for prompt body. Other models have different limits.
- **Text rendering capability** — Most image models garble text. NanoBanana Pro garbles all text; Ideogram renders text well (~90% accuracy). Prompts should end with "No text in image" for models that can't render text, and on-screen text should be handled in post-production (Remotion).
- **Reference image limits** — NanoBanana Pro supports up to 3 references per scene (SceneBoard) or 14 per request (ImageEngine). Flux supports up to 8 reference images.
- **Resolution and aspect ratio** — Models have preferred or required aspect ratios. Specify the target ratio in the prompt when the model supports it.
- **Duration limits** — Video models have maximum clip durations (Kling: 3 min, Veo: 60 sec, Runway Gen-4: 10 sec, Seedance: 20 sec).
- **Audio capability** — Some video models generate native audio (Veo, Kling 2.6, Sora 2, Seedance 2.0), others produce silent output (Runway Gen-4). This determines whether a separate voice generation step is needed.

### Model-Specific Syntax

Different models interpret prompt structure differently. What works for one model may not work for another.

**Key syntax differences to be aware of:**
- **System instruction vs single prompt** — NanoBanana Pro uses a separate system instruction field (512 chars) plus a prompt body. Most other models use a single prompt string.
- **Negative prompts** — Some models support explicit negative prompts (what NOT to generate). Kling uses these for video (e.g., "morphing, sliding feet, cartoonish"). Not all models support negative prompts.
- **Parameter keywords** — Some models respond to inline keywords (e.g., "Aspect ratio: 9:16") while others require API parameters.
- **Style keywords** — Model-specific style tokens or presets (Ideogram's 4.3 billion style presets, Midjourney's `--style` flag).
- **Creative mode directives** — NanoBanana Pro supports four modes (Faithful, Expressive, Vision, Image Asset) declared in the system instruction. Other models may have analogous concepts.

### Prompt Structure as Information Architecture

A well-structured prompt is not a paragraph of text — it is an **information architecture** that layers visual decisions in a deliberate order. The general structure for image prompts:

1. **Role/context** — Set the creative persona (e.g., "Cinematic lifestyle photographer")
2. **Style anchor** — Visual identity preamble for consistency across scenes
3. **Subject** — Detailed description of who/what is in the frame
4. **Environment** — Setting, location, depth layers (foreground, midground, background)
5. **Camera** — Angle, framing, lens feel, depth of field
6. **Lighting** — Source direction, quality, interaction with subject, color temperature
7. **Composition** — Element placement, spatial rules, focal points
8. **Brand elements** — Product details, logo placement, brand colors
9. **Mood** — Emotional quality, energy, feeling
10. **Terminal constraints** — "No text in image", aspect ratio, any final hard rules

Video prompts follow a different structure optimized for motion:
1. **Subject motion** — What the main subject physically does
2. **Secondary motion** — Environment animation, background dynamics
3. **Camera motion** — How the camera moves (static, pan, track, dolly, push in, handheld drift)
4. **Atmosphere** — Ambient dynamics (light shifting, dust motes, lens flare)
5. **Negative prompt** — What to avoid (morphing, jitter, distortion)

---

## 2. The Model Registry Concept

### Why a Registry

The model landscape changes rapidly. New models launch (Seedance 2.0), existing models get updates (Kling 2.6), and capabilities shift. A structured registry ensures:

- **Discoverability** — Any system or agent can find what models are available and what they're good at.
- **Consistency** — Every model is documented in the same format, making comparison and selection straightforward.
- **Extensibility** — Adding a new model follows a repeatable process: copy `_schema.md`, fill in sections, register in `_registry.md`.
- **Validation** — The CLI can verify that the registry matches the filesystem and all model files follow the schema.

### The _schema.md Template

Every model file follows a standardized template defined in `knowledge/models/_schema.md`. The template includes:

**Frontmatter (YAML):**
```yaml
model: [model-name]
type: image | video | voice
provider: [company]
status: production | experimental | deprecated
lastUpdated: [date]
```

**Required sections:**
1. **Overview** — What the model is, what it's best for, key differentiators.
2. **Access** — API endpoints, SDKs, pricing tiers.
3. **Constraints** — Table of hard limits (character counts, resolution, duration, reference limits, etc.).
4. **Prompt Structure** — How to structure a prompt for this specific model. Field-by-field breakdown.
5. **Best Practices** — The 5-10 most important things to know for writing good prompts with this model.
6. **Worked Examples** — At least 2 annotated, real-world prompt examples showing the structure in action.
7. **Failure Modes** — Common mistakes and how to fix them.
8. **Model-Specific Features** — Unique capabilities (creative modes, reference types, camera controls, etc.).
9. **Integration Notes** — How this model fits into the Adcelerate pipeline (which systems call it, what APIs wrap it).

### The _registry.md Index

A master markdown table listing every registered model:

| Model | Type | Provider | Status | File |
|-------|------|----------|--------|------|
| NanoBanana Pro | image | Google | production | image/nanobanana-pro.md |
| Kling | video | Kuaishou | production | video/kling.md |
| ... | ... | ... | ... | ... |

The CLI's `validate` command checks that every row in this table points to an existing file and that every model file in the directory tree has a corresponding registry entry.

### Model Update Workflow

When a new model needs to be added:

1. **Copy** `_schema.md` to the appropriate directory (e.g., `knowledge/models/video/new-model.md`)
2. **Fill** all sections — use the CLI's `add` command to scaffold, then populate with model-specific knowledge
3. **Register** — Add an entry to `_registry.md`
4. **Validate** — Run `just validate` to confirm schema conformance and registry consistency
5. **Update references** — If the model-selection-matrix or prompt-patterns references need updating, do so

When an existing model gets a significant update (e.g., Kling 2.5 -> 2.6):
1. Update the model file with new capabilities, constraints, and examples
2. Update `lastUpdated` in frontmatter
3. Update the registry if status changed
4. Update comparison tables in skill references if rankings shifted

---

## 3. Visual Direction Principles

Visual direction knowledge is **model-agnostic** — it applies to any image or video generation model. These are the building blocks that get translated into model-specific prompt syntax.

### Camera as a Prompt-Building Block

Camera choices communicate meaning. Each angle and framing type carries inherent emotional and narrative weight:

- **Wide/Establishing shots** establish context and scale. They show the world the character inhabits. Use for opening frames, scene-setters.
- **Medium shots** balance subject and environment. They're the workhorse of narrative photography — full outfit visible, enough environment to ground the scene.
- **Close-ups** create intimacy and emphasis. They force the viewer to focus on what you choose — a face, a product detail, a brand label.
- **POV shots** put the viewer inside the scene. Binocular POV creates a voyeuristic discovery moment; first-person POV creates immersion.
- **Overhead/elevated shots** provide spatial awareness and a sense of observation from above.
- **Low angle shots** make the subject appear powerful and dominant.

### Lighting as a Prompt-Building Block

Lighting sets mood more powerfully than any other element. Describe how light **behaves**, not just what it **is**:

- **Direction** — Where the light comes from relative to the subject (side, behind, above, diffuse)
- **Quality** — Hard light creates sharp shadows; soft light wraps around the subject
- **Color temperature** — Warm (golden hour, amber) vs cool (blue hour, overcast) vs neutral
- **Interaction** — How light hits specific surfaces ("The cream fabric glows warm in the golden hour light", "The blue stripes catch directional light creating a subtle shimmer")

Time-of-day is a lighting shorthand but should be supplemented with specific interaction descriptions.

### Composition as a Prompt-Building Block

Composition determines where the viewer's eye goes and how the image feels:

- **Rule of thirds** — Dynamic, narrative compositions for walking shots and conversations
- **Center-frame** — Symmetrical, intentional, fashion-forward compositions
- **Negative space** — Empty area that creates breathing room and draws attention to the subject
- **Leading lines** — Environmental geometry (bleacher rows, hallways, court lines) that draws the eye to the subject
- **Depth of field** — Shallow DOF isolates the subject (product-hero moments); deep DOF shows the full environment (establishing shots)
- **Foreground elements** — Objects between camera and subject that create depth layers

### Spatial Depth Cues

Flat, poster-like compositions are a common failure mode. Prevent them with:
- **Receding lines** — Geometric perspective (bleacher rows stretching diagonally)
- **Scale references** — Blurred figures in the background establish distance
- **Atmospheric perspective** — Background elements softer, more muted than foreground
- **Foreground elements** — Something partially visible between camera and subject

---

## 4. The Style Anchor Pattern

### What It Is

A Style Anchor is a block of text (typically 200-400 characters) that captures a project's visual identity and is pasted **verbatim** into every prompt to enforce visual consistency across scenes.

### Why It Matters

Without a Style Anchor, each scene is generated independently and the model makes its own visual decisions — leading to inconsistent lighting, mood, color palettes, and photographic style across a storyboard. The Style Anchor is the single most important consistency mechanism for multi-scene projects.

### Structure

A Style Anchor typically captures:
- **Setting** — The physical environment ("Golden hour outdoor basketball court")
- **Lighting mood** — The quality and feeling of light ("Warm natural light, soft shadows")
- **Photographic style** — The visual genre ("Photorealistic documentary-lifestyle photography")
- **Subject description** — Consistent character traits ("Young Indian men with fair skin, messy textured hair and baggy bottoms")
- **Color palette** — Dominant tones and accent strategy ("Muted warm tones with garment colors as focal accents")
- **Energy** — The emotional baseline ("Relaxed, effortless energy")

### Rules

1. The Style Anchor is **copy-pasted verbatim** into every scene prompt as the first lines of the prompt body. No paraphrasing, no shortening, no "similar to previous."
2. It is created once per project (typically during visual direction development in SceneBoard) and remains constant.
3. Scene-specific details layer on TOP of the Style Anchor, never replace it.
4. The Style Anchor is separate from the system instruction — it goes in the prompt body.

### Origin

The Style Anchor pattern originated in SceneBoard's storyboard workflow. SceneBoard creates a visual direction document for each project, and the Style Anchor preamble is extracted from that document. PromptWriter generalizes this pattern so any system can use it.

---

## 5. Creative Modes

### Concept

Creative modes control how much latitude the model has in interpreting a prompt. The concept originates from NanoBanana Pro but is generalizable to any model that offers control over creativity vs fidelity.

### The Four Modes (NanoBanana Pro)

| Mode | Fidelity | Creativity | Use When |
|------|----------|------------|----------|
| **Faithful** | Highest | Lowest | Product-hero shots, brand reveals, logo-critical moments. Accuracy to reference images matters most. |
| **Expressive** | Medium | Medium | Narrative scenes, lifestyle imagery, emotional moments. The default for most scenes. Mood and energy matter more than pixel-perfect accuracy. |
| **Vision** | Low | Highest | Abstract concepts, mood boards, artistic/conceptual imagery. Maximum creative freedom. |
| **Image Asset** | N/A | Low | Isolated graphics, product cutouts, icons on clean backgrounds. Single-item generation. |

### Mode Selection Decision Tree

```
Is this a brand/product reveal or logo-critical moment?
  -> YES -> Faithful

Is this an isolated item on a clean background?
  -> YES -> Image Asset

Is this an abstract/conceptual/mood scene?
  -> YES -> Vision

Everything else (narrative, lifestyle, cinematic):
  -> Expressive
```

### Generalizing to Other Models

While other models don't have named "modes," the same creative tension exists:
- **Flux** uses multi-image references to increase fidelity (analogous to Faithful) or fewer references for more creative freedom (analogous to Expressive).
- **Runway Gen-4** uses motion brush and camera controls for precise direction (Faithful-like) or text-only for more interpretation (Expressive-like).
- **Ideogram** uses style presets and reference images to control the fidelity-creativity tradeoff.

When writing model-specific files, map this model's fidelity controls to the Faithful-Expressive spectrum so users can apply the same mental model.

---

## 6. Reference Image Strategies

### Types of References

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Product shots** | Ensure garment/product accuracy — colors, patterns, textures, construction | Every scene featuring a specific product |
| **Scene-to-scene references** | Maintain character/environment consistency across scenes | Dependent scenes needing visual continuity |
| **Style references** | Establish overall look and feel | First scene, or when introducing a new visual direction |

### Product Shot References

The most common reference type. Provide the actual product image so the model can match colors, patterns, textures, and construction details accurately.

Always pair each reference with a one-line description of what to match:
```
Reference 1: Red rabbit Vindof tee product shot — match the garment color and
rabbit illustration exactly
```

State (1) what the reference IS and (2) what aspect to MATCH.

### Scene-to-Scene Consistency

Critical for multi-scene storyboards. Use the output image from an earlier scene as a reference for a later scene to maintain character appearance, environment details, and lighting consistency.

**When to use:** Same character across scenes, environment must match exactly, scene is a continuation of a previous scene.

**When NOT to use:** Completely different settings/characters, abstract/mood scenes, the first scene in a sequence.

### Reference Feedback Loops

In multi-scene workflows (like SceneBoard's batch generator):
1. Scene A generates independently (no dependencies)
2. Scene B declares a dependency on Scene A and includes Scene A's output as a reference
3. The batch generator sequences this automatically — Scene A completes first, then its output URL feeds into Scene B

This creates a chain of visual consistency without requiring all scenes to use the same static reference.

### Reference Limits by Model

| Model | Max References | Notes |
|-------|---------------|-------|
| NanoBanana Pro (SceneBoard) | 3 per scene | Most important references only; describe the rest textually |
| NanoBanana Pro (ImageEngine) | 14 total | 6 objects + 5 humans |
| Flux | 8 images | Multi-image reference for identity consistency |
| Ideogram | 3 images | Style reference system |
| Seedance 2.0 | 12 files | Multimodal input (images, audio, text) |

---

## 7. Multi-Model Pipelines

### Image-to-Video Pipeline

The most common multi-model pipeline: generate a still image, then animate it into video.

**Example: NanoBanana Pro -> Kling**
1. NanoBanana Pro generates the anchor frame (the key visual for a scene)
2. The image is passed as input to Kling in image-to-video mode
3. The Kling prompt focuses on **motion**, not visual description — the image already contains the visual
4. Style consistency is guaranteed by the source image; no Style Anchor repetition needed in the video prompt

**Key principle:** In image-to-video pipelines, the video prompt should NOT re-describe the visual scene. It should describe:
- Subject motion (what moves, how it moves, physics of movement)
- Secondary motion (environment animation, background dynamics)
- Camera motion (static, pan, track, dolly, handheld drift, push in)
- Atmosphere (light shifting, dust motes, lens flare movement)

### Silent Video + Voice Pipeline

When a video model produces silent output (Runway Gen-4, Remotion):
1. Generate or render the video
2. Generate voiceover with a voice tool (ElevenLabs, OpenAI TTS, Cartesia Sonic)
3. Combine with ffmpeg: `ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac output.mp4`
4. Generate variations (different scripts, voices, or languages)

Models with native audio (Veo, Kling 2.6, Sora 2, Seedance 2.0) skip step 2 — audio is generated alongside video.

### Cost Strategy Across Pipelines

1. **Iterate with cheaper models** — Use Flash for image exploration, Dev for rapid prototyping
2. **Lock in with production models** — Once the prompt is dialed in, generate finals on Pro/production tier
3. **Monitor budget** — ImageEngine enforces budget ceilings. A 402 response means the ceiling was exceeded.
4. **Prioritize hero scenes** — If hitting budget limits, use production-tier models for hero scenes and cheaper models for supporting scenes.

---

## 8. Failure Mode Patterns

These failure patterns recur across models. Individual model files document model-specific failure modes; these are the universal ones.

### Generic Descriptions

**Symptom:** Stock-photo-looking output with no personality or brand alignment.
**Cause:** Prompt is too vague — "a man in a shirt on a court" gives the model no specificity.
**Fix:** Add 3-5 specific physical details per subject. Name exact garment features. Describe environment with real texture words.

### Style Drift Across Scenes

**Symptom:** Scene 1 looks like a warm documentary photo, Scene 3 looks like a fashion editorial, Scene 5 looks like a phone snapshot.
**Cause:** Missing or inconsistent Style Anchor preamble across scenes.
**Fix:** Copy-paste the Style Anchor verbatim into every scene prompt. No paraphrasing, no shortening.

### Constraint Violations

**Symptom:** API error, generation failure, or severely degraded output.
**Cause:** Exceeding character limits, wrong aspect ratio, too many references, requesting unsupported features.
**Fix:** Check the model's constraints table before composing the prompt. The PromptWriter skill validates constraints automatically.

### Text in Images

**Symptom:** Garbled, illegible, or misspelled text rendered in the generated image.
**Cause:** Requesting text in a model that can't render it (most models except Ideogram).
**Fix:** End prompts with "No text in image" for text-incapable models. Handle on-screen text in post-production (Remotion overlays).

### Flat Compositions

**Symptom:** Image looks like a flat poster with no spatial depth.
**Cause:** Prompt lacks spatial depth cues — no foreground/background separation, no receding lines, no atmospheric perspective.
**Fix:** Include at least 2 depth cues: foreground elements, receding lines, scale references, or atmospheric softening in the background.

### Flat Lighting

**Symptom:** Image looks like it was shot with a direct flash — no depth, no mood.
**Cause:** Prompt says "good lighting" or "natural light" without specifying direction, quality, or subject interaction.
**Fix:** Specify light source direction, quality (hard vs soft), interaction with subject surfaces, and color temperature.

### Prompt Bloat

**Symptom:** Prompt hits character limits or produces confused/contradictory images.
**Cause:** Redundant descriptions, meta-instructions the model can't act on ("make sure to", "it's important that"), saying the same thing multiple ways.
**Fix:** One clear statement per visual element. Cut redundancy (if the preamble says "golden hour," don't repeat it). Remove meta-instructions. Aim for concise, information-dense prompts.

### Wrong Product / Inaccurate Details

**Symptom:** Generated product has wrong color, pattern, or construction details.
**Cause:** Missing product reference image, or prompt describes the product too loosely.
**Fix:** Include a product shot as a reference. Use Faithful mode for product-critical scenes. Describe the product in exhaustive detail.

### Motion Artifacts (Video)

**Symptom:** Morphing limbs, sliding feet, jittery motion, face distortion.
**Cause:** Video model limitations, overly complex motion descriptions, or missing negative prompts.
**Fix:** Use negative prompts to exclude common artifacts. Keep motion descriptions physically plausible. Shorter clips are more stable than longer ones.

---

## 9. Model Update Workflow

### Adding a New Model

This is the structured process for extending PromptWriter when a new generation model becomes available:

**Step 1: Scaffold**
```bash
just add-model <model-name> <image|video|voice>
```
This copies `_schema.md` to the appropriate directory and creates a stub file with the correct frontmatter.

**Step 2: Research and Populate**
Fill all sections of the model file:
- Read the model's official documentation
- Test prompt patterns if API access is available
- Document constraints (limits, supported features, pricing)
- Write at least 2 worked examples with annotations
- Catalog failure modes specific to this model
- Note integration points with Adcelerate systems

**Step 3: Register**
Add the model to `_registry.md` with type, provider, status, and file path.

**Step 4: Validate**
```bash
just validate
```
This checks:
- The file follows `_schema.md` structure (all required sections present)
- The registry entry points to an existing file
- No orphaned files exist without registry entries

**Step 5: Update References**
If the new model changes the model selection landscape:
- Update `model-selection-matrix.md` in the skill references
- Update `prompt-patterns.md` if the model introduces new patterns
- Update `_registry.md` status if other models are superseded

### Updating an Existing Model

When a model gets a significant update (new version, changed capabilities):

1. **Update the model file** — New capabilities, changed constraints, new examples
2. **Update frontmatter** — Bump `lastUpdated`, change `status` if needed
3. **Update registry** — If the model name or status changed
4. **Update comparisons** — If rankings or capabilities shifted in comparison tables
5. **Validate** — Run `just validate` to confirm everything is consistent
