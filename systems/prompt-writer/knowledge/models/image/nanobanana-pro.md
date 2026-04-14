---
model: "nanobanana-pro"
type: "image"
provider: "Google (Gemini)"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# NanoBanana Pro — Prompt Engineering Guide

## Overview

Google DeepMind's flagship image generation model (`gemini-3-pro-image-preview`), the primary production model in Adcelerate for final storyboard output, client-facing deliverables, and hero ad creatives. Accessed through the WisGate API, it produces the highest-quality, most coherent compositions with strong reference image fidelity.

**Best for:** Final storyboard images, product-hero shots, brand-critical ad creatives, multi-scene consistency
**Key differentiator:** Four creative modes (Faithful/Expressive/Vision/Image Asset), system instruction + prompt body architecture with 14-image reference support, and deep integration with Adcelerate's ImageEngine and SceneBoard pipelines

---

## Access

| Field | Value |
|-------|-------|
| **API** | WisGate (JuheAPI) — `POST /v1beta/models/gemini-3-pro-image-preview:generateContent` |
| **Authentication** | `x-goog-api-key` header with `WISDOM_GATE_KEY` env var |
| **Pricing** | ~$0.24/4K image (Pro), ~$0.04/image (Flash for iteration) |
| **Model ID** | `gemini-3-pro-image-preview` |

**Base URL:** `https://api.wisgate.ai`

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| `gemini-3-pro-image-preview` | Slower | Highest | ~$0.24/4K | Final output, client deliverables |
| `gemini-3.1-flash-image-preview` | Fast | High | Lower | Iteration, concept exploration |
| `gemini-2.5-flash-image` | Fastest | Good | ~$0.04 | Budget-conscious rapid prototyping |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | 8,192 chars | Prompt body; practical sweet spot is 800-1,500 chars |
| Max system instruction | 512 chars | Sets creative role, scene context, primary constraint |
| Max duration | N/A | Image model |
| Supported aspect ratios | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | Flash also supports 1:4, 1:8, 4:1, 8:1 |
| Max resolution | 4K | Also supports 1K, 2K |
| Max reference images | 14 (6 objects + 5 humans) | SceneBoard limits to 3 per scene |
| Output format | PNG | Base64-encoded in API response |
| Text rendering | Partial | Garbles all text — end every prompt with "No text in image." |
| Native audio | N/A | Image model |
| Negative prompt support | No | Use terminal constraints instead (e.g., "No text in image.") |

---

## Prompt Structure

NanoBanana Pro uses a two-part prompt architecture: a **System Instruction** (the photographer's brief) and a **Prompt Body** (the scene description), plus optional **Reference Images**.

### Required Elements

1. **System Instruction** (max 512 chars) — Sets the creative role, scene type, lighting/mood shorthand, and the single most important constraint. Think of it as the photographer's brief before they pick up the camera.
2. **Style Anchor Preamble** (200-400 chars) — The first lines of the prompt body. Pasted verbatim from the Style Anchor document into every scene prompt. Non-negotiable for visual consistency across storyboards.
3. **Subject Description** — Who/what is in the frame with specific physical details: skin tone, hair, expression, clothing, posture.
4. **Terminal Line** — Every prompt MUST end with `No text in image.` because NanoBanana Pro garbles all text rendering.

### Optional Elements

1. **Environment/Setting** — Location specifics with depth cues (foreground, midground, background layers)
2. **Brand Elements** — Product details, logo placement, brand colors, fabric/light interactions
3. **Mood** — Emotional quality, energy, feeling (concise — 1-2 sentences)
4. **Reference Guidance** — One-line descriptions pairing each reference image to what it should match

### Prompt Template

```
[System Instruction — max 512 chars]
Creative role. Scene type context. Lighting/mood shorthand.
Single most important constraint.

[Style Anchor Preamble — 200-400 chars, verbatim from Style Anchor doc]
Setting. Lighting. Photography style. Subject archetype.
Color palette. Energy/mood baseline.

[Subject Description]
Physical appearance, clothing specifics (color, pattern, graphic, trim, fit),
posture, expression, action.

[Environment / Setting]
Foreground elements. Midground details. Background (soft focus).
Spatial depth cues: receding lines, scale reference, atmospheric perspective.

[Brand Elements]
Product-as-hero details. Fabric/light interaction.
Key detail that MUST be visible.

[Mood]
Emotional quality in 1-2 sentences.

No text in image.
```

### Budget Strategy

- **Draft/iteration:** Use `gemini-3.1-flash-image-preview` or `gemini-2.5-flash-image` to explore visual directions, test compositions, refine prompts
- **Production/final:** Switch to `gemini-3-pro-image-preview` once the prompt is dialed in
- **Cost optimization:** ImageEngine warns at 80% token ceiling. Prioritize hero scenes for Pro, use Flash for supporting scenes. A 402 response means the ceiling was exceeded.

---

## Best Practices

### Do

- Include the Style Anchor preamble verbatim as the first lines of every scene prompt — exact text, no paraphrasing, no shortening
- Describe subjects with 3-5 specific physical details: skin tone, hair style + texture, facial expression, clothing specifics, posture
- Describe products exhaustively: color, pattern type, graphic subject, trim colors, collar style, fit, fabric/light interaction
- Use spatial depth cues to prevent flat compositions: receding lines, scale references, atmospheric perspective, foreground elements
- Specify lighting direction, quality, and interaction with subject ("golden hour sunlight from the side and slightly behind, casting long warm shadows")
- Pair each reference image with a one-line description of what to match
- Keep prompt body to 800-1,500 characters for best results

### Don't

- Include detailed scene descriptions in the system instruction — that's the prompt body's job
- Say "good lighting" or "natural light" without specifying direction, quality, and subject interaction — this produces flat results
- Repeat information already in the preamble (if preamble says "golden hour," don't say it again in lighting)
- Use meta-instructions ("make sure to," "it's important that") — just describe what you want
- Include on-screen text — NanoBanana garbles all text rendering; text overlays are handled by Remotion in post-production
- Exceed 3 reference images per scene in SceneBoard (even though the API supports 14)

---

## Worked Examples

### Example 1: Binocular POV Discovery — Red Rabbit Tee

**Context:** A binocular POV discovery moment in a lifestyle storyboard — the observer spots someone interesting on a basketball court.
**Mode/settings:** Expressive — lifestyle narrative where mood matters more than pixel-perfect product accuracy.

**System Instruction:**
```
Lifestyle photographer shooting through binoculars. Circular vignette frame
with soft dark edges. Golden hour, warm tones. Focus on the red t-shirt as
the color anchor. Authentic, candid energy.
```

**Prompt:**
```
Golden hour outdoor basketball court. Warm natural light, soft shadows.
Photorealistic documentary-lifestyle photography. Young Indian men with fair
skin, messy textured hair and baggy bottoms, casual and authentic. Muted warm
tones with garment colors as focal accents. Relaxed, effortless energy.

View through binoculars — circular frame with soft dark vignette edges around
the perimeter, as if looking through binocular lenses.

Inside the circular view: a young Indian man with fair skin on a basketball
court, mid-laugh, catching a lazy basketball pass. He wears a vibrant red
oversized crew-neck t-shirt with a large watercolor-style painted rabbit
illustration on the front. Baggy black shorts. Tousled bedhead hair. A friend
is partially visible at the edge of the frame.

Medium shot within the circular binocular frame. The guy in the red tee is
centered. The red fabric is the brightest, most saturated element in the
entire image — it pops against the warm muted court tones. The watercolor
rabbit print is clearly identifiable. Court lines and a hoop post partially
visible in the background.

Golden hour direct warm light hitting the red tee, making it glow. Soft
shadows on the concrete court. Slight handheld drift quality. Genuine fun,
easy laughter. Candid and unposed. No text in image.
```

**Annotations:**
- System instruction (189 chars) sets binocular framing, golden hour mood, and names the color anchor
- Preamble is identical to every other scene in the storyboard — visual consistency baseline
- Subject described with skin tone, expression (mid-laugh), action (catching a pass), clothing (red tee with specific graphic), hair style
- Composition establishes color hierarchy: red pops against muted background
- Terminal line prevents text rendering artifacts

**Reference Guidance:**
```
Reference 1: Red rabbit Vindof tee product shot — match the garment color and
rabbit illustration exactly
```

**Result quality notes:** Expressive mode + product reference image = authentic mood with accurate garment rendering. The binocular vignette language repeats identically across all binocular scenes for consistency.

---

### Example 2: Gallery Establishing Shot — Base Reveal

**Context:** Opening establishing shot for a fashion storyboard — introduce the character, space, and visual language.
**Mode/settings:** Expressive — gallery setting with moody lighting needs cinematic interpretation. No product reference accuracy needed for white-on-white base outfit.

**System Instruction:**
```
Generate a cinematic editorial fashion photograph in an art gallery.
Fair-skinned Indian male model, Gen Z aesthetic. Moody directional gallery
track lighting with warm shadows. Quiet maximalism — intentional, unhurried,
sculptural.
```

**Prompt:**
```
Cinematic editorial fashion photograph. Art gallery setting with clean walls
and gallery track lighting. Fair-skinned Indian male model with messy dark
hair, calm expression. White vest and white oversized wide-leg pants as base.
Moody directional lighting, soft shadows, warm concrete tones. Centered
medium-full framing, eye-level. Quiet maximalism aesthetic — intentional,
layered, unhurried.

A young fair-skinned Indian man with messy textured dark hair stands centered
in a contemporary art gallery. He wears a fitted white ribbed vest tucked
loosely into white oversized wide-leg trousers. Barefoot or minimal white
slides. Hands resting in trouser pockets. Calm, self-possessed expression —
not smiling, not brooding. Present.

The gallery has clean off-white walls with a sculptural art installation
visible behind him to the left. Polished warm concrete floor with subtle
reflections. Gallery track lighting from above-left casts a warm directional
pool of light on the model, soft shadows falling to his right. Background
falls slightly darker.

Medium-full shot, eye-level, centered composition. The model fills the center
third of the frame. Generous negative space on both sides. The all-white
outfit reads as sculptural against the gallery architecture.

Mood: quiet, assured, intentional. The white-on-white feels deliberate, not
blank.

No text in image.
```

**Annotations:**
- System instruction names genre (cinematic editorial fashion), setting (art gallery), subject archetype, and aesthetic philosophy ("quiet maximalism")
- Longer preamble (392 chars) because this storyboard's visual language is more specific
- Expression description is nuanced: "not smiling, not brooding. Present." — gives the model a narrow emotional target
- Environment and lighting combined because gallery architecture and lighting are inseparable
- "Deliberate, not blank" prevents the model from interpreting all-white as sterile

**Reference Images:** None needed — establishing shot.

---

### Example 3: Brand Reveal Close-Up — Faithful Mode

**Context:** The highest-stakes scene — Vindof neck label must be visible and sharp. First time the audience sees the brand.
**Mode/settings:** Faithful — the only scene using Faithful mode because the graffiti graphic and neck label must match the product shot reference precisely.

**System Instruction:**
```
Cinematic close-up portrait photographer shooting through binoculars. Golden
hour. Tighter framing than previous shots. The Vindof neck label must be
visible and sharp. Brand reveal moment.
```

**Prompt:**
```
Golden hour outdoor basketball court. Warm natural light, soft shadows.
Photorealistic documentary-lifestyle photography. Young Indian man with fair
skin, messy textured hair and baggy bottoms, casual and authentic. Muted warm
tones with garment colors as focal accents. Relaxed, effortless energy.

View through binoculars — circular frame with soft dark vignette edges.
Tighter framing than previous binocular shots — chest-to-face close-up.

Inside the circular view: a young Indian man with fair skin has turned to
face the camera, looking directly at the viewer through the binoculars.
Slight knowing smile. Messy textured hair. He wears a light grey short-sleeve
camp collar button-up shirt with a large graffiti-style illustration on the
front featuring stylized characters and bold dark red lettering. Baggy dark
cargo pants.

The framing is intimate — the shirt graphic fills much of the frame. At the
collar, a small black rectangular Vindof neck label is visible and sharp,
catching a glint of golden hour light.

Shallow depth of field — his face and shirt are in crisp focus, the court
behind completely dissolved into warm bokeh. Dead-center composition within
the binocular circle. The shirt graphic and neck label are the hero details.

Eye contact with the viewer through the binocular lens. Warm golden light on
his face, directional side lighting creating gentle shadows. The "noticed"
moment. Quiet recognition. Eye contact that says "you see it." No text in
image.
```

**Annotations:**
- System instruction names the constraint that matters most: "Vindof neck label must be visible and sharp"
- Faithful mode chosen specifically for brand accuracy at the most critical moment
- Eye contact ("looking directly at the viewer") makes this the most intimate binocular moment
- Neck label gets its own sentence with explicit visibility instructions and light interaction
- Extreme DOF (completely dissolved bokeh) isolates the subject
- Mood description is the most emotionally specific: "Eye contact that says 'you see it'" gives the model a character motivation

**Reference Guidance:**
```
Reference 1: "The Lazy Bunch" Vindof camp collar shirt product shot — match
the graffiti character graphic and Vindof neck label exactly
```

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Stock-photo-looking image with no personality | Prompt is too vague ("a man in a shirt on a court") | Add 3-5 specific physical details per subject, name exact garment features, describe environment with texture words |
| Style inconsistency across scenes | Missing or inconsistent Style Anchor preamble | Copy-paste the preamble verbatim into every scene. No paraphrasing, no shortening, no "similar to previous" |
| Wrong product color/pattern/construction | Missing product shot reference or loose product description | Always include product shot as Reference 1, use Faithful mode for product-critical scenes, describe garment exhaustively |
| Flat, flash-like lighting with no depth | Prompt says "good lighting" without direction/quality/interaction | Specify: light source direction, quality (soft/directional), interaction with subject, and color temperature |
| Confused/contradictory image at character limit | Prompt bloat — too many elements, repeated information | Cut redundancy, remove meta-instructions, one statement per visual element, aim for 800-1,500 chars |
| Inconsistent binocular vignette across POV scenes | Vignette description varies between binocular scenes | Use identical language every time: "View through binoculars — circular frame with soft dark vignette edges." |
| Text artifacts in generated image | Attempting to include text in the image | Always end with "No text in image." — on-screen text is handled by Remotion |
| Safety filter blocks (finishReason: SAFETY) | Content triggered Gemini safety filters | Rephrase prompt to avoid flagged content areas |

---

## Model-Specific Features

### Creative Modes

NanoBanana Pro offers four creative modes, declared in the system instruction and scene metadata:

**Faithful** — Prioritizes fidelity to reference images. Minimizes creative interpretation. Use for product-hero shots, brand-critical moments, and scenes where accuracy to a reference image matters most.

**Expressive** — Takes creative liberties while respecting prompt direction. Best for narrative scenes, lifestyle imagery, emotional moments. The default choice for most storyboard scenes.

**Vision** — Maximum creative freedom. Best for abstract concepts, mood boards, artistic/conceptual imagery, transition frames.

**Image Asset** — Single-item generation with clean or transparent backgrounds. Best for isolated graphics, product cutouts, icons, elements to composite later.

**Mode Selection Decision Tree:**
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

### Multi-Turn Editing

Maintain conversation context across iterations via the `contents` array with `role: "user"` and `role: "model"` turns. Enables iterative refinement of generated images without starting from scratch.

### Force Image Output

Set `responseModalities: ["IMAGE"]` (without TEXT) to guarantee image generation and prevent text-only responses.

### System Instruction Architecture

Unlike most image models that use a single prompt, NanoBanana Pro separates the **system instruction** (creative director brief, max 512 chars) from the **prompt body** (scene description, max 8,192 chars). This allows setting a persistent creative context while varying scene details.

---

## Subject Description Best Practices

### People

Describe subjects with enough specificity for consistency across scenes:

- **Skin tone** — Be specific (e.g., "fair-skinned Indian man")
- **Hair** — Style + texture + color (e.g., "messy curtain bangs", "tousled bedhead hair")
- **Facial expression** — Name the emotion AND what it looks like physically (e.g., "subtle satisfied smile — not a grin, more of an 'I know what I just saw' expression")
- **Body language/posture** — Physical action (e.g., "hands in pockets, calm stance")
- **Clothing specifics** — Every piece: fit, color, notable details
- **Age range** — Approximate (e.g., "early 20s")

**Bad:** `A young man wearing a cool shirt standing on a basketball court.`

**Good:** `A young Indian man with fair skin in his early 20s walks toward concrete bleachers at an outdoor basketball court. He has messy curtain bangs and wears an off-white oversized t-shirt with a small dark text logo on the chest and abstract floral prints along the bottom hem in warm reds, oranges, and yellows with faded silhouette figures. Baggy khaki jorts. He carries binoculars casually in one hand.`

### Products (Clothing/Accessories)

Products are the hero — they need the most precise descriptions:

- **Name the product** — Brand and product name when relevant
- **Design details** — Pattern, graphic, print, texture, construction
- **Color accuracy** — Primary + accent + trim colors
- **Fabric/light interaction** — How material catches light (e.g., "The blue stripes catch directional light, creating a shimmer")
- **How worn** — Fit, styling (e.g., "worn completely open and unbuttoned over the white ribbed vest")
- **Key details** — The one element that MUST be visible

---

## Environment Best Practices

### Spatial Depth Cues

Use these to prevent flat, poster-like compositions:
- **Receding lines** — "bleacher seat rows stretch out diagonally, creating strong receding lines"
- **Scale reference** — "A few blurred figures in the far background on the court"
- **Atmospheric perspective** — Background elements softer, more muted
- **Foreground elements** — "A small green plant and open notebook partially visible in soft focus"

### Continuity Across Scenes

- Name the same location consistently across scenes
- Maintain time of day across the sequence
- Carry props between scenes
- Match architectural details ("Same gallery setting — clean off-white walls, sculptural installation, polished warm concrete floor")

---

## Reference Image Strategy

### Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| Product shots | Ensure garment/product accuracy | Every scene featuring a specific product |
| Previous scene outputs | Maintain character/environment consistency | Dependent scenes needing visual continuity |
| Style references | Establish overall look and feel | First scene, or new visual direction |

### Limits

| Context | Max References |
|---------|---------------|
| SceneBoard per scene | 3 reference images |
| ImageEngine per request | 14 total (6 objects + 5 humans) |

### Guidance Format

Always pair each reference with a one-line description of what to match:
```
Reference 1: White "Mindful" Vindof tee product shot — match the garment details exactly
Reference 2: Scene 1 output — match the character's face and hair for continuity
Reference 3: Elevated stadium seating reference — match the camera perspective
```

---

## Keyword & Descriptor Libraries

### Photographic Styles

| Keyword | Effect |
|---------|--------|
| Photorealistic | Grounded, real, no stylization |
| Documentary-lifestyle | Candid, authentic, "friend filmed this" energy |
| Editorial fashion | Intentional, curated, magazine-quality |
| Cinematic | Wide tonal range, filmic grain feel, dramatic framing |
| Street photography | Raw, urban, spontaneous, real-world context |
| Product photography | Clean, focused, commercial, hero-item framing |

### Mood Descriptors

| Keyword | Feeling |
|---------|---------|
| Calm, purposeful | Unhurried confidence, knows where they're going |
| Effortless cool | Stylish without trying, natural swagger |
| Voyeuristic anticipation | Watching someone who doesn't know they're being watched |
| Quiet satisfaction | Internal contentment, subtle expression |
| Easy, genuine fun | Real laughter, unposed, candid joy |
| Intentional, layered | Every detail earns its place, curated |
| Present, self-possessed | Not performing, just being |

### Composition Keywords

| Keyword | Effect |
|---------|--------|
| Negative space | Empty area creating visual breathing room |
| Shallow depth of field | Subject sharp, background bokeh |
| Leading lines | Environmental geometry draws eye to subject |
| Center-frame | Subject at mathematical center |
| Receding lines | Perspective depth (bleacher rows, hallways) |
| Foreground element | Something between camera and subject, depth layer |
| Soft bokeh | Out-of-focus areas rendered as smooth circular highlights |

---

## Quick Reference Checklist

Before submitting any NanoBanana Pro prompt, verify:

- [ ] System instruction is <= 512 characters
- [ ] Prompt body is <= 8,192 characters
- [ ] Style Anchor preamble is included verbatim as the first lines of the prompt
- [ ] Creative mode is declared (Faithful / Expressive / Vision / Image Asset)
- [ ] Subject described with skin tone, hair, expression, clothing specifics, posture
- [ ] Product details are exhaustive (color, pattern, graphic, trim, fit, how worn)
- [ ] Environment has depth cues (foreground, midground, background)
- [ ] Mood is stated concisely
- [ ] Prompt ends with "No text in image."
- [ ] Reference images have guidance lines explaining what to match
- [ ] <= 3 reference images per scene
- [ ] Aspect ratio matches target platform

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| ImageEngine | Primary generation gateway | Rate limiting, token tracking, budget guards, retry/backoff |
| SceneBoard | Storyboard scene generation | Batch generation with dependency ordering, 3 refs per scene |
| PromptWriter | Prompt construction | Assembles system instruction + preamble + scene description |

**Cross-references:**
- `systems/image-engine/knowledge/domain.md` — WisGate API details, cost optimization, error codes
- `ai_docs/wisgate-nanobanana-api.md` — Full API reference with code examples
- `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` — Original 835-line guide (source for this file)
