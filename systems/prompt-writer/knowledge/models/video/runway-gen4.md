---
model: "runway-gen4"
type: "video"
provider: "Runway"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Runway Gen-4 — Prompt Engineering Guide

## Overview

Runway's Gen-4 video generation model, offering the strongest controllability and consistency features among video generators. Gen-4 excels at maintaining character and scene consistency across multiple shots, provides motion brush and camera controls, and supports both image-to-video and video-to-video style transfer. Output is silent — pair with voice tools for audio.

**Best for:** Controlled video generation with character/scene consistency, style transfer on existing footage, editing and remixing video content
**Key differentiator:** Character and scene consistency across shots — the best option when the same person/product must look identical across multiple video clips

---

## Access

| Field | Value |
|-------|-------|
| **API** | Runway Developer Portal |
| **Authentication** | Runway API key |
| **Pricing** | Subscription-based + per-generation credits |
| **Model ID** | `gen-4` (via Runway API) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Gen-4 Standard | Standard | High | Credits-based | General video generation |
| Gen-4 Turbo | Faster | Good | More credits | Faster iteration |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies | Check API docs for current limits |
| Max system instruction | N/A | Single-prompt model |
| Max duration | ~10 seconds | Per generation; extend with multi-clip workflows |
| Supported aspect ratios | 16:9, 9:16, 1:1 | Standard video ratios |
| Max resolution | 1080p | Standard HD output |
| Max reference images | Multiple | Character/scene reference images for consistency |
| Output format | MP4 | Silent — no native audio |
| Text rendering | No | Text will morph or distort |
| Native audio | No | Silent output — pair with ElevenLabs, OpenAI TTS, or Cartesia |
| Negative prompt support | Limited | Focus on positive descriptions |

---

## Prompt Structure

Runway Gen-4 uses text prompts with optional reference images for character/scene consistency and source images/videos for image-to-video and video-to-video workflows.

### Required Elements

1. **Scene description** — Visual content and action
2. **Motion direction** — What moves and how
3. **Style direction** — Visual aesthetic, mood

### Optional Elements

1. **Character references** — Images of characters to maintain across shots
2. **Scene references** — Environment images for consistency
3. **Motion brush** — Paint motion areas directly on the source image
4. **Camera controls** — Specific camera movement parameters
5. **Source video** — For video-to-video style transfer

### Prompt Template

```
[Scene description — subject, environment, action]

[Motion — what moves, direction, speed, style of movement]

[Camera — movement type, speed, direction]

[Mood/lighting — emotional quality, visual atmosphere]
```

### Budget Strategy

- **Draft/iteration:** Standard mode, shorter clips (4-5 sec)
- **Production/final:** Standard mode, full-length clips with character references
- **Cost optimization:** Gen-4 is credits-based, so batch efficiently. Use motion brush for precise control rather than multiple regenerations.

---

## Best Practices

### Do

- Use character reference images to maintain consistent appearance across multiple video clips
- Use scene reference images to maintain environment consistency
- Use the motion brush to specify exactly which areas of the frame should move
- Use camera controls for precise camera movements (pan, tilt, zoom parameters)
- Plan for silent output — budget time for audio layering in post-production
- Use video-to-video style transfer to match existing footage to brand aesthetics

### Don't

- Expect native audio — all Gen-4 output is silent; always plan for audio layering
- Generate long single clips — 10 seconds is the limit; plan multi-clip sequences
- Skip character references when consistency matters — prompt-only consistency is unreliable
- Use Gen-4 for use cases where native audio is essential — use Veo, Sora 2, or Kling instead
- Rely on text in the video — text will morph or distort during generation

---

## Worked Examples

### Example 1: Brand Video with Character Consistency

**Context:** Creating a 3-clip brand video where the same person appears in different settings.
**Mode/settings:** Image-to-video with character references, 3 separate 8-second clips

**Clip 1 Prompt:**
```
A young professional woman walks through a modern office lobby, carrying
a laptop bag over her shoulder. Natural window light. Confident stride.
Medium-wide tracking shot following her movement. Clean, corporate,
aspirational aesthetic.
```

**Clip 2 Prompt:**
```
The same woman sits at a cafe table, working on her laptop with a focused
expression. Warm afternoon light through the window. A coffee cup beside
the laptop. Camera slowly pushes in from medium to medium close-up.
Warm, productive mood.
```

**Clip 3 Prompt:**
```
The same woman stands on a rooftop terrace at golden hour, looking out
over the city with a satisfied expression. Wind gently moves her hair.
Slow pan from her profile to a wider shot revealing the cityscape.
Aspirational, accomplished mood.
```

**Annotations:**
- Same character reference image used across all 3 clips for identity consistency
- Each clip has different setting, action, and camera movement
- "The same woman" reinforced in text (character reference does the heavy lifting)
- Each clip is independent but designed to cut together as a narrative

**Result quality notes:** Gen-4's character consistency is its strongest feature. The same person will look recognizably consistent across all three clips when using reference images. Pair with ElevenLabs voiceover for the final ad.

---

### Example 2: Video-to-Video Style Transfer

**Context:** Re-styling existing product footage to match a new brand aesthetic.
**Mode/settings:** Video-to-video with style reference images

**Prompt:**
```
Transform this product showcase footage to match a warm, premium,
artisanal aesthetic. Soft golden tones, gentle film grain, slightly
desaturated highlights. The motion and framing should stay identical,
only the visual style changes. Premium, handcrafted feel.
```

**Annotations:**
- Source video provides the motion and composition
- Style reference images define the target aesthetic
- Prompt describes the style transformation, not the scene content
- "Motion and framing should stay identical" prevents unwanted changes

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Character looks different across clips | Missing character reference images | Always provide character reference images for multi-clip consistency |
| Motion is too subtle or too extreme | Vague motion description | Use specific motion descriptions; leverage motion brush for precision |
| Silent output when audio was expected | Gen-4 produces no audio | This is by design — layer audio in post with ElevenLabs/OpenAI TTS/Cartesia |
| 10-second limit too short for scene | Hard duration limit | Plan multi-clip sequences; use Kling or Veo for longer single clips |
| Style transfer changes the content | Prompt didn't anchor the content | Specify "keep motion and framing identical, only change visual style" |

---

## Model-Specific Features

### Character/Scene Consistency

Gen-4's primary differentiator for ad production:
- Upload character reference images to maintain identity across shots
- Upload scene/environment references for consistent settings
- Enables multi-clip brand videos with the same spokesperson/character

### Motion Brush

Paint directly on the source image to specify:
- Which areas should move (and which should stay static)
- Direction and intensity of motion per region
- Enables precise control impossible with text prompts alone

### Camera Controls

Parameter-based camera movement:
- Pan (horizontal), tilt (vertical), zoom
- Speed and easing controls
- More precise than text-based camera direction

### Video-to-Video Style Transfer

Transform existing footage while preserving motion and framing:
- Re-style footage to match new brand aesthetics
- Apply artistic treatments to product videos
- Convert raw footage to polished ad content

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad Creative pipeline | Multi-clip brand videos | Character consistency across shots |
| Post-production workflows | Style transfer on existing footage | Re-brand or re-style video content |
| Audio layering | Pair with voice tools | Gen-4 output is silent — always needs audio |

**Cross-references:**
- [Runway API Docs](https://docs.dev.runwayml.com/)
- For audio layering: `models/voice/elevenlabs.md`, `models/voice/openai-tts.md`, `models/voice/cartesia-sonic.md`
- For native audio video, see `models/video/veo.md` or `models/video/sora-2.md`
