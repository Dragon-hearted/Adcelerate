# Cross-Model Prompt Patterns

Patterns and anti-patterns that apply across multiple generation models.

---

## Universal Patterns

### 1. Specificity Gradient

**Pattern:** More specific descriptions produce better results across all models.

| Level | Example | Result Quality |
|-------|---------|---------------|
| Vague | "A man in a shirt" | Generic stock photo |
| Basic | "A young man in a red t-shirt on a basketball court" | Recognizable but bland |
| Good | "A young Indian man with fair skin and messy curtain bangs wearing a vibrant red oversized crew-neck t-shirt with a watercolor rabbit illustration on an outdoor basketball court at golden hour" | Distinctive and intentional |

**Rule:** 3-5 specific physical details per visual element (subject, environment, lighting, product).

---

### 2. The Style Anchor Pattern

**Pattern:** A fixed block of text (200-400 chars) pasted verbatim into every prompt in a series to maintain visual consistency.

**Applies to:** All image models when generating multiple related images (storyboard scenes, ad variations, campaign assets).

**Structure:**
```
[Setting] [Lighting mood] [Photographic style] [Subject consistency traits]
[Color palette] [Energy/mood baseline]
```

**Rule:** Never paraphrase, shorten, or "reference" the Style Anchor. Paste the exact text every time.

---

### 3. Layered Description (Image)

**Pattern:** Build image prompts in deliberate layers, each adding a dimension of visual information.

```
Layer 1: Role/Context      -> "Cinematic lifestyle photographer"
Layer 2: Style Anchor       -> [verbatim preamble]
Layer 3: Subject            -> Who/what, physical details, clothing, posture
Layer 4: Environment        -> Setting, foreground/midground/background
Layer 5: Camera             -> Angle, framing, DOF, lens feel
Layer 6: Lighting           -> Direction, quality, subject interaction
Layer 7: Composition        -> Spatial rules, focal points
Layer 8: Brand Elements     -> Product details, logo, brand colors
Layer 9: Mood               -> Emotional quality, energy
Layer 10: Terminal           -> "No text in image."
```

---

### 4. Motion-First Description (Video, Image-to-Video)

**Pattern:** When animating a still image, describe motion and dynamics only — the visual scene is already in the image.

```
Layer 1: Subject Motion     -> Physical action with physics (weight, fabric, hair)
Layer 2: Secondary Motion   -> Environment animation (wind, reflections, background)
Layer 3: Camera Motion      -> Specific keyword (static, tracking, handheld drift)
Layer 4: Atmosphere         -> Ambient dynamics (light shifting, dust, lens flare)
Layer 5: Negative Prompt    -> Artifacts to exclude (morphing, sliding feet)
```

**Rule:** Never re-describe the visual scene in image-to-video mode.

---

### 5. Audio Direction Layer (Video with Native Audio)

**Pattern:** For video models with native audio (Veo, Kling 2.6, Sora 2, Seedance 2.0), include explicit audio direction.

```
Audio: [Dialogue in quotes] [Sound effects] [Ambient sounds] [Music direction]
```

**Example:**
```
Audio: A confident voice says "Your data, organized in seconds." Subtle
keyboard clicks. Quiet modern office ambient. Light electronic background
music.
```

**Rule:** Without audio direction, native-audio models generate generic or missing audio.

---

### 6. Script-as-Prompt (Voice)

**Pattern:** Voice prompts are the script itself — clean, naturally punctuated, conversational text.

**Do:**
- Use contractions ("it's", "you'll", "don't")
- Use em-dashes for dramatic pauses
- Use ellipses for trailing off
- Spell out numbers ("fourteen" not "14")

**Don't:**
- Include stage directions ("[pause]", "(excitedly)")
- Write formal prose
- Use ALL CAPS for entire sentences

---

## Universal Anti-Patterns

### 1. The Generic Description Trap

**Anti-pattern:** Using vague, stock-photo-like descriptions.

| Bad | Why | Fix |
|-----|-----|-----|
| "A young man" | No distinguishing features | "A young Indian man with fair skin, messy curtain bangs, early 20s" |
| "Nice lighting" | No direction, quality, or interaction | "Golden hour sunlight from the side, casting long warm shadows" |
| "Cool background" | No spatial details | "Outdoor basketball court with concrete bleachers, court lines visible" |

---

### 2. Style Drift

**Anti-pattern:** Inconsistent visual style across related prompts.

**Cause:** Not using a Style Anchor, or paraphrasing it instead of copy-pasting verbatim.

**Fix:** Create a Style Anchor. Paste it exactly. Every time.

---

### 3. Meta-Instructions

**Anti-pattern:** Including instructions the model can't act on.

| Bad | Why |
|-----|-----|
| "Make sure the lighting is good" | "Good" is subjective; the model needs specifics |
| "It's important that the product is visible" | This is a note to yourself, not a visual description |
| "Try to capture the feeling of..." | Describe the visual result, not the process |

**Fix:** Replace meta-instructions with concrete visual descriptions.

---

### 4. Prompt Bloat

**Anti-pattern:** Saying the same thing multiple ways or including redundant information.

**Cause:** The Style Anchor says "golden hour" and then the lighting section also says "golden hour lighting with warm tones."

**Fix:** State each visual fact once. If the preamble covers it, don't repeat it.

---

### 5. Text in Text-Incapable Models

**Anti-pattern:** Requesting readable text from models that garble text rendering.

**Affected models:** NanoBanana Pro, Flux, DALL-E 3, Midjourney, SDXL, all video models.

**Fix:** End prompts with "No text in image." Handle text in post-production (Remotion overlays).

**Exception:** Ideogram handles text well (~90% accuracy). For images requiring text, use Ideogram.

---

### 6. Visual Description in Image-to-Video

**Anti-pattern:** Re-describing the visual scene when the source image already contains it.

**Affected models:** Kling (image-to-video), any model in image-to-video mode.

**Fix:** Focus the video prompt entirely on motion, camera, and atmosphere. The image IS the visual description.

---

### 7. Flat Composition

**Anti-pattern:** Prompts that produce poster-like images without spatial depth.

**Cause:** No depth cues — no foreground/background separation, no receding lines, no atmospheric perspective.

**Fix:** Include at least 2 depth cues:
- Foreground element (partially visible object between camera and subject)
- Receding lines (geometric perspective)
- Scale reference (distant figures)
- Atmospheric softening (background more muted than foreground)

---

### 8. Flat Lighting

**Anti-pattern:** "Good lighting" or "natural light" without direction, quality, or subject interaction.

**Fix:** Specify three lighting dimensions:
1. **Direction** — Where light comes from
2. **Quality** — Hard or soft
3. **Interaction** — How it hits specific surfaces ("The cream fabric glows warm...")
