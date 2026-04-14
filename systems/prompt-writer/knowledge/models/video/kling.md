---
model: "kling"
type: "video"
provider: "Kuaishou"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Kling — Prompt Engineering Guide

## Overview

Kuaishou's video generation model, the primary video model in Adcelerate's SceneBoard pipeline for animating storyboard scenes. Kling excels at image-to-video animation where a NanoBanana Pro still image is the anchor frame, and the prompt describes only motion, camera movement, and atmospheric dynamics. Supports up to 3 minutes at 1080p with simultaneous audio-visual generation (Kling 2.6).

**Best for:** Image-to-video storyboard animation, cinematic product videos, longer-form content (up to 3 min), audio-synced video
**Key differentiator:** Image-to-video mode where the source image guarantees visual consistency, 4-layer prompt structure (subject motion -> secondary motion -> camera motion -> atmosphere), and up to 3-minute duration

---

## Access

| Field | Value |
|-------|-------|
| **API** | Kling API, PiAPI, fal.ai (third-party) |
| **Authentication** | API key per provider |
| **Pricing** | ~$0.09/sec (via fal.ai) |
| **Model ID** | Provider-specific (Kling 2.6 latest) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Kling 2.6 | Standard | Highest, native audio | ~$0.09/sec | Final production with audio |
| Kling (standard) | Standard | High | ~$0.09/sec | Image-to-video animation |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies by provider | Motion description + camera + atmosphere |
| Max system instruction | N/A | Single-prompt model |
| Max duration | 3 minutes | At 1080p, 30-48fps |
| Supported aspect ratios | 16:9, 9:16, 1:1 | Match source image ratio |
| Max resolution | 1080p | 30-48fps depending on settings |
| Max reference images | 1 (source image) | Image-to-video uses single source frame |
| Output format | MP4 | Standard video output |
| Text rendering | No | Text in source image may morph — include "text morphing" in negative prompt |
| Native audio | Yes (Kling 2.6) | Simultaneous audio-visual generation |
| Negative prompt support | Yes | Critical for quality — always use negative prompt |

---

## Prompt Structure

Kling uses a fundamentally different prompt approach depending on the mode. In Adcelerate, **image-to-video is the primary mode** — the NanoBanana Pro output is the anchor frame, and the prompt describes only what moves.

### Image-to-Video vs Text-to-Video

**Image-to-video (primary in Adcelerate):**
- The prompt does NOT re-describe the visual scene — the image already contains it
- The prompt focuses exclusively on: subject motion, secondary motion, camera movement, atmospheric dynamics
- Style consistency is guaranteed by the source image — no style description needed

**Text-to-video:**
- Full scene description required (subject, environment, lighting, style)
- Less consistent results — no anchor frame
- Use for standalone video concepts without a storyboard

### Required Elements (Image-to-Video)

1. **Subject motion** — What the main subject physically does. Specific gestures, actions, expressions changing. Include physics: weight transfer, fabric movement, hair sway.
2. **Camera motion** — How the camera behaves. Use specific keywords.
3. **Negative prompt** — Always include to prevent common artifacts.

### Optional Elements

1. **Secondary motion** — Environment animation: wind, reflections, background people, particles, light changes
2. **Atmosphere** — Ambient dynamics: light shifting, dust motes, lens flare movement

### 4-Layer Prompt Structure

This is the core prompting methodology for Kling in the Adcelerate pipeline:

```
Layer 1 — Subject Motion:
[What the main subject physically does. Be specific about physics:
weight transfer between feet, fabric catching wind, hair bouncing,
hand gestures, expression shifts.]

Layer 2 — Secondary Motion:
[Environment animation: wind moving leaves, reflections on surfaces,
background figures walking, particles floating, shadows shifting.]

Layer 3 — Camera Motion:
[Camera behavior keyword + description. Choose from:
static, slow pan, tracking, dolly, handheld drift, push in.]

Layer 4 — Atmosphere:
[Ambient dynamics: golden light shifting across surface, dust motes
catching light, subtle lens flare drift, heat shimmer.]
```

### Camera Motion Keywords

| Keyword | Effect | When to Use |
|---------|--------|-------------|
| **Static** | Camera doesn't move | Product hero moments, intimate close-ups |
| **Slow pan** | Gentle horizontal sweep | Revealing environment, establishing shots |
| **Tracking** | Camera follows subject movement | Walking shots, character-in-motion scenes |
| **Dolly** | Camera moves toward or away from subject | Dramatic reveal, increasing intimacy |
| **Handheld drift** | Subtle organic micro-movements | Documentary feel, POV shots, binocular scenes |
| **Push in** | Slow zoom toward subject | Building tension, drawing attention to detail |

### Negative Prompt Template

Always include this negative prompt (or a variation of it):

```
morphing, sliding feet, cartoonish, jittery motion, distorted face,
text morphing, floating limbs
```

### Budget Strategy

- **Draft/iteration:** Shorter duration (2-3 sec) to validate motion direction before committing to full-length clips
- **Production/final:** Full scene duration at target resolution
- **Cost optimization:** At ~$0.09/sec, a 5-second clip costs ~$0.45. A 15-second scene costs ~$1.35. Budget hero scenes for longer duration and use shorter clips for supporting scenes.

---

## Best Practices

### Do

- Describe physics-based motion: "weight transfer between feet," "fabric catching and releasing golden light," "hair bouncing slightly with each step"
- Use specific camera keywords (static, slow pan, tracking, dolly, handheld drift, push in) — vague descriptions produce random camera behavior
- Always include the negative prompt template to prevent common Kling artifacts
- Match the source image's aspect ratio in the video generation settings
- Keep motion descriptions grounded and realistic — Kling produces natural-looking motion when not pushed into extreme actions
- For binocular POV scenes, use "handheld drift — binocular POV micro-movements" for organic instability

### Don't

- Re-describe the visual scene in image-to-video mode — the source image handles this
- Include style descriptions or lighting setup in image-to-video — the source image IS the style
- Request extreme or fast motion — Kling produces best results with subtle, natural movements
- Skip the negative prompt — "morphing," "sliding feet," and "distorted face" are common Kling artifacts
- Request text to appear or stay stable in the video — text will morph; add "text morphing" to negative prompt
- Use text-to-video when you have a storyboard image available — image-to-video is always more consistent

---

## Worked Examples

### Example 1: Lifestyle Walking Scene — Cream Pineapple Shirt (Image-to-Video)

**Context:** Animating a storyboard scene where a character walks across a basketball court. Source: Scene 5 NanoBanana Pro output.
**Mode/settings:** Image-to-video, 5 seconds duration

**Motion & Animation Direction:**
```
The guy strolls across the court with one hand in his pocket. His camp collar
shirt sways gently with each step — the cream fabric catching and releasing
golden light. Wide-leg jorts move with a lazy rhythm. His wavy hair bounces
slightly. A basketball rolls slowly in the background.
```

**Camera Motion:**
```
Handheld drift — binocular POV micro-movements. No deliberate pan. Subtle
organic instability.
```

**Negative Prompt:**
```
morphing, sliding feet, cartoonish, jittery motion, distorted face, text
morphing, floating limbs
```

**Annotations:**
- **Subject motion** is physics-based: fabric "catching and releasing" light, hair "bounces slightly," "lazy rhythm" — these produce natural-looking motion
- **Secondary motion**: basketball rolling in background adds environmental life
- **Camera**: "handheld drift" with "micro-movements" matches the binocular POV established in the source image
- **Negative prompt** prevents the most common Kling artifacts
- No visual scene description — the source image handles all visual context

**Result quality notes:** 5-second duration is the sweet spot for single-action scenes. The physics-based motion descriptions (fabric movement, hair bounce) produce significantly more realistic animation than generic "he walks across the court."

---

### Example 2: Static Close-Up — Brand Reveal Moment (Image-to-Video)

**Context:** Animating the brand reveal close-up from Scene 6 — minimal motion, maximum intimacy. Source: Scene 6 NanoBanana Pro Faithful mode output.
**Mode/settings:** Image-to-video, 3 seconds duration

**Motion & Animation Direction:**
```
Subtle breathing motion — chest rises and falls gently. A slight knowing
smile forms slowly. His eyes hold steady contact with the viewer. The shirt
fabric shifts almost imperceptibly with his breath. Golden hour light
subtly shifts across his face.
```

**Camera Motion:**
```
Static — no camera movement. The stillness of the frame contrasts with the
subtle human motion.
```

**Negative Prompt:**
```
morphing, sliding feet, cartoonish, jittery motion, distorted face, text
morphing, floating limbs, rapid movement
```

**Annotations:**
- Extremely subtle motion — breathing, micro-expression, light shift
- Static camera creates intimate, portrait-like feel
- "rapid movement" added to negative prompt because this scene needs stillness
- 3-second duration is enough for a close-up beat
- The Vindof neck label in the source image may be affected by motion — keeping motion minimal protects brand detail accuracy

---

### Example 3: Text-to-Video Product Explainer

**Context:** Standalone product explainer video without a storyboard source image.
**Mode/settings:** Text-to-video, 15 seconds duration

**Prompt:**
```
A sleek matte black water bottle rotates slowly on a clean white surface.
Soft studio lighting from the upper left. The bottle catches highlights
along its curved edge. Camera slowly dollies in from a medium shot to a
close-up. Clean, modern product photography aesthetic. Minimal, premium feel.
```

**Negative Prompt:**
```
morphing, cartoonish, jittery motion, distorted, text, watermark,
low quality, blurry
```

**Annotations:**
- Full scene description required in text-to-video mode (unlike image-to-video)
- Simple rotation motion is well within Kling's capabilities
- Dolly camera movement creates visual interest in a product shot
- 15-second duration for a product video is appropriate

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Feet sliding across surface during walking | "Sliding feet" is a common Kling artifact | Include "sliding feet" in negative prompt; describe weight transfer ("each foot plants firmly") |
| Face distortion during expression changes | Rapid or extreme expression shifts | Keep expression changes subtle; include "distorted face" in negative prompt |
| Text in image morphs into gibberish | Kling cannot maintain text stability | Include "text morphing" in negative prompt; minimize text in source images |
| Floating or disconnected limbs | Complex body poses confuse the model | Include "floating limbs" in negative prompt; use simpler poses in source image |
| Cartoonish or exaggerated motion | Motion description too dramatic | Use subtle, physics-based motion descriptions; include "cartoonish" in negative prompt |
| Camera moves when static was requested | Ambiguous camera instructions | Use explicit keyword: "Static — absolutely no camera movement" |
| Fabric/clothing looks unrealistic during motion | Generic motion description | Describe fabric physics: "sways gently," "catches light," "moves with lazy rhythm" |
| Jittery, unstable video output | Complex scene with too many moving elements | Simplify: fewer simultaneous motions, shorter duration, static camera |

---

## Model-Specific Features

### Image-to-Video Mode

The primary mode in Adcelerate. Uses a single source image as the anchor frame:
- Visual consistency guaranteed by the source image
- Prompt focuses exclusively on motion, not appearance
- SceneBoard generates the source image via NanoBanana Pro, then passes it to Kling
- No style repetition needed — the image IS the style

### 4-Layer Motion Architecture

Kling produces the best results when motion is structured in four distinct layers:
1. **Subject motion** — Physical actions with physics (weight, fabric, hair)
2. **Secondary motion** — Environmental animation (wind, reflections, background activity)
3. **Camera motion** — Specific camera behavior keyword + description
4. **Atmosphere** — Ambient dynamics (light shifts, particles, lens effects)

This structure prevents motion confusion where the model tries to move everything at once.

### Simultaneous Audio-Visual (Kling 2.6)

Kling 2.6 generates audio alongside video:
- Ambient sounds matching the scene
- Footsteps, fabric rustling, environmental audio
- Reduces the need for separate audio generation in post-production

### Duration Flexibility

Up to 3 minutes at 1080p — the longest duration among mainstream video generators:
- 2-5 sec: Single-action scenes, close-up beats
- 5-15 sec: Walking shots, product reveals, lifestyle moments
- 15-60 sec: Extended narrative sequences
- 60-180 sec: Full product explainers, brand stories

---

## Motion Keyword Library

### Subject Motion

| Keyword/Phrase | Effect |
|---------------|--------|
| Weight transfer between feet | Natural walking physics |
| Fabric sways gently | Realistic clothing movement |
| Hair bounces slightly | Natural hair physics |
| Subtle breathing motion | Chest rises/falls, minimal movement |
| Knowing smile forms slowly | Gradual micro-expression |
| Hand adjusts shirt casually | Natural body language gesture |
| Catches and releases light | Fabric/surface light interaction |
| Lazy rhythm | Slow, unhurried movement quality |

### Camera Motion

| Keyword | Effect |
|---------|--------|
| Static | No camera movement — stillness |
| Slow pan | Gentle horizontal sweep |
| Tracking | Camera follows subject |
| Dolly in/out | Camera moves toward/away from subject |
| Handheld drift | Organic micro-movements, documentary feel |
| Push in | Slow zoom toward subject |
| Binocular POV micro-movements | Subtle organic instability for POV shots |

### Atmosphere

| Keyword/Phrase | Effect |
|---------------|--------|
| Golden light shifts across surface | Subtle time-of-day progression |
| Dust motes catching light | Atmospheric particles in light beams |
| Lens flare drifts | Subtle optical effect |
| Shadows lengthen slightly | Time passing |
| Wind rustles leaves | Environmental atmosphere |

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| SceneBoard | Primary video generation | Image-to-video from NanoBanana Pro outputs, batch sequencing |
| PromptWriter | Motion prompt construction | Assembles 4-layer motion prompts per scene |
| ImageEngine | Source image provider | NanoBanana Pro generates the anchor frame |

**Cross-references:**
- `systems/scene-board/knowledge/domain.md` — SceneBoard's Kling integration and batch workflow
- `models/image/nanobanana-pro.md` — Source image generation for Kling's image-to-video mode
- [Kling AI Developer Docs](https://klingai.com/global/dev/model/video)
