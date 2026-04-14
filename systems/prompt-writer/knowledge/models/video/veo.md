---
model: "veo"
type: "video"
provider: "Google (DeepMind)"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Veo — Prompt Engineering Guide

## Overview

Google DeepMind's video generation model (Veo 3.1), available through the Gemini API and Vertex AI. Veo is the strongest option for short-form social video ads with native audio — it generates dialogue, sound effects, and ambient audio alongside video, supports native vertical 9:16 output, and can upscale to 4K. Ideal for TikTok, Reels, and Shorts content.

**Best for:** High-quality video ads with native audio, vertical social video (9:16), short-form content up to 60 seconds
**Key differentiator:** Native audio generation (dialogue, SFX, ambient) built into the video output — no separate voiceover step needed for many use cases

---

## Access

| Field | Value |
|-------|-------|
| **API** | Gemini API, Vertex AI |
| **Authentication** | Google API key or Vertex AI service account |
| **Pricing** | ~$0.15/sec (Veo 3.1 Fast), ~$0.40/sec (Veo 3.1 Standard) |
| **Model ID** | `veo-3.1-fast`, `veo-3.1-standard` (provider-specific) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Veo 3.1 Fast | Faster | Good | ~$0.15/sec | Quick iterations, draft video |
| Veo 3.1 Standard | Slower | Highest | ~$0.40/sec | Final production video |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies by API | Check provider documentation |
| Max system instruction | N/A | Single-prompt model |
| Max duration | 60 seconds | At 1080p |
| Supported aspect ratios | 16:9, 9:16, 1:1 | Native vertical 9:16 support |
| Max resolution | 4K (via upscale) | Native 1080p with upscale option |
| Max reference images | 1 | Image-to-video supported |
| Output format | MP4 | With native audio track |
| Text rendering | No | Avoid text in video prompts |
| Native audio | Yes | Dialogue, sound effects, ambient audio |
| Negative prompt support | Limited | Describe what you want rather than what to avoid |

---

## Prompt Structure

Veo supports both text-to-video and image-to-video. For social ad production, text-to-video with audio is the primary workflow.

### Required Elements

1. **Scene description** — Visual content: subject, setting, action
2. **Audio direction** — What should be heard: dialogue, SFX, ambient
3. **Duration/pacing** — How the content unfolds over time

### Optional Elements

1. **Source image** — For image-to-video mode
2. **Camera movement** — How the camera behaves
3. **Mood/tone** — Emotional direction

### Prompt Template

```
[Visual scene description — subject, setting, action, lighting]

[Audio direction — dialogue in quotes, sound effects, ambient sounds]

[Camera movement — pan, dolly, static, tracking]

[Mood/tone — emotional quality of the scene]

[Aspect ratio: 9:16 for vertical, 16:9 for landscape]
```

### Budget Strategy

- **Draft/iteration:** Veo 3.1 Fast at ~$0.15/sec — a 15-sec draft costs ~$2.25
- **Production/final:** Veo 3.1 Standard at ~$0.40/sec — a 15-sec final costs ~$6.00
- **Cost optimization:** 100 x 15-sec videos at Fast = ~$225. Use Fast for iteration and Standard only for final approved concepts. For templated variations, use Remotion instead.

---

## Best Practices

### Do

- Include audio direction in every prompt — it's Veo's strongest differentiator
- Specify dialogue in quotes with speaker context: `A confident female voice says "Start your free trial today"`
- Use native 9:16 aspect ratio for social video (TikTok, Reels, Shorts) — Veo handles this natively
- Describe ambient audio: "coffee shop background chatter, soft jazz, espresso machine hissing"
- Keep videos to 15-30 seconds for ad use — this is the sweet spot for social ads and Veo's cost structure

### Don't

- Generate long videos (60 sec) during iteration — use 5-10 sec clips to validate concepts first
- Skip audio direction — Veo will generate audio anyway, but it may not match your intent
- Include text/typography in the visual — Veo cannot render readable text
- Use Veo for silent video — its cost premium over competitors is justified by native audio; use Runway for silent
- Expect Veo to maintain character consistency across separate generations — each generation is independent

---

## Worked Examples

### Example 1: Vertical Social Video Ad with Voiceover

**Context:** 15-second TikTok/Reels ad for a productivity app.
**Mode/settings:** Text-to-video, Veo 3.1 Fast, 9:16 vertical, 15 seconds

**Prompt:**
```
A young professional sits at a clean modern desk, looking frustrated at a
cluttered spreadsheet on their laptop. They discover an app notification,
tap their phone, and their expression shifts to relief and satisfaction.
The desk transitions from cluttered to organized. Bright, modern office
with natural window light. 9:16 vertical framing.

Audio: Upbeat, modern background music. A confident voiceover says "Stop
wasting hours on manual reporting. DataFlow organizes everything
automatically." Subtle UI tap sound when they interact with the phone.

Camera: Starts with a medium shot, slowly pushes in to a close-up as the
transformation happens.

Mood: Frustration to relief to confidence. Aspirational, modern.
```

**Annotations:**
- Scene describes a narrative arc (frustration -> discovery -> satisfaction) within 15 seconds
- Audio direction includes three layers: background music, voiceover with exact script, SFX
- Voiceover text in quotes ensures Veo generates the specific dialogue
- Camera push-in creates visual progression matching the narrative arc
- 9:16 vertical specified for social platform native format

**Result quality notes:** Veo's native audio generation means this single prompt produces a complete video ad with voiceover, music, and SFX — no post-production audio layering needed.

---

### Example 2: Product Demo with Ambient Audio

**Context:** 10-second product showcase for a premium water bottle.
**Mode/settings:** Image-to-video, Veo 3.1 Standard, 1:1 square, 10 seconds

**Prompt:**
```
The premium matte black water bottle sits on a wooden surface in morning
light. Condensation beads slowly form on the surface. A hand reaches in
from the right and picks up the bottle. Water sloshes subtly inside. The
morning light shifts gradually.

Audio: Quiet morning ambiance — distant birds, soft room tone. Subtle
water slosh when the bottle is picked up. No music, no voiceover.

Camera: Static with subtle push in over the 10 seconds.

Mood: Calm, premium, morning ritual.
```

**Annotations:**
- Minimal action — the product is the hero, motion is secondary
- Audio direction specifies what NOT to include (no music, no voiceover) for a premium feel
- Ambient audio (birds, room tone, water slosh) adds sensory richness
- Static camera with subtle push-in keeps focus on the product

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Audio doesn't match scene | Vague or missing audio direction | Be specific: name sounds, include dialogue in quotes, specify music style |
| Voiceover says wrong words | Long or complex dialogue | Shorten dialogue, use simpler sentence structures |
| Video exceeds budget | Long duration + Standard quality | Use Fast for iteration; keep production clips to 15-30 sec |
| Character looks different in each generation | No cross-generation consistency mechanism | Use image-to-video with a consistent source image, or use Runway Gen-4 for character consistency |
| Text in video is unreadable | Veo cannot render text | Remove text from prompt; overlay text in post-production (Remotion) |
| Vertical video has awkward framing | Wrong aspect ratio or composition prompt | Specify "9:16 vertical framing" and describe composition for tall format |

---

## Model-Specific Features

### Native Audio Generation

Veo's primary differentiator. Generates synchronized audio alongside video:
- **Dialogue** — Spoken words with natural intonation (include exact text in quotes)
- **Sound effects** — Contextual SFX (footsteps, UI sounds, object interactions)
- **Ambient audio** — Background atmosphere (room tone, nature sounds, city noise)
- **Music** — Background music matching the mood (specify style/tempo)

This eliminates the need for separate voiceover generation (ElevenLabs, OpenAI TTS) in many ad production workflows.

### Native Vertical Output (9:16)

Veo generates native vertical video for Stories, Reels, Shorts, and TikTok:
- No cropping or reformatting needed
- Composition is natively optimized for tall format
- Eliminates the common problem of horizontal-to-vertical adaptation

### 4K Upscale

Generate at 1080p and upscale to 4K for:
- YouTube ads and pre-rolls
- Digital signage
- High-resolution social feeds

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad Creative pipeline | Social video ad generation | Native vertical + audio for social platforms |
| Campaign variation workflows | Multiple video ad variations | Text-to-video for concept exploration |

**Cross-references:**
- [Veo on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- For silent video with character consistency, see `models/video/runway-gen4.md`
- For audio-only needs on silent video, see `models/voice/elevenlabs.md`
