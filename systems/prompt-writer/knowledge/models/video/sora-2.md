---
model: "sora-2"
type: "video"
provider: "OpenAI"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Sora 2 — Prompt Engineering Guide

## Overview

OpenAI's video generation model with synchronized audio, including dialogue, sound effects, and ambient audio. Sora 2 is the strongest option for dialogue-heavy video content like testimonials, talking-head ads, and narrative brand videos. Available in fast and pro quality tiers through the OpenAI API.

**Best for:** Video ads with dialogue/voiceover, testimonial-style content, talking-head videos, narrative brand videos
**Key differentiator:** Synchronized dialogue generation — characters speak with lip sync, making it ideal for talking-head and testimonial video ads

---

## Access

| Field | Value |
|-------|-------|
| **API** | OpenAI API |
| **Authentication** | OpenAI API key |
| **Pricing** | ~$0.10-0.50/sec depending on variant and resolution |
| **Model ID** | `sora-2` (fast), `sora-2-pro` (quality) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| sora-2 (fast) | Fast | Good | ~$0.10/sec | Iteration, drafts |
| sora-2-pro | Slower | Highest | ~$0.50/sec | Final production |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies | Check OpenAI docs for current limits |
| Max system instruction | N/A | Single-prompt model |
| Max duration | 60 seconds | With synchronized audio |
| Supported aspect ratios | 16:9, 9:16, 1:1 | Standard video ratios |
| Max resolution | 1080p | Standard HD |
| Max reference images | 1 | Image-to-video supported |
| Output format | MP4 | With synchronized audio track |
| Text rendering | No | Text will distort or morph |
| Native audio | Yes | Dialogue, SFX, ambient — synchronized with video |
| Negative prompt support | Limited | Focus on positive descriptions |

---

## Prompt Structure

Sora 2 uses text prompts with optional source images. For dialogue content, include the exact spoken text in quotes with character context.

### Required Elements

1. **Scene description** — Visual content, setting, characters
2. **Action/motion** — What happens in the scene
3. **Audio direction** — Dialogue (in quotes), SFX, ambient

### Optional Elements

1. **Source image** — For image-to-video mode
2. **Camera movement** — How the camera behaves
3. **Mood/tone** — Emotional direction

### Prompt Template

```
[Scene description — characters, setting, visual context]

[Action — what happens, character movements, expressions]

[Dialogue — exact spoken text in quotes, with speaker attribution]

[Sound design — ambient audio, SFX, music style]

[Camera — movement, framing, transitions]

[Mood — emotional quality, pacing]
```

### Budget Strategy

- **Draft/iteration:** sora-2 (fast) at ~$0.10/sec — a 15-sec draft costs ~$1.50
- **Production/final:** sora-2-pro at ~$0.50/sec — a 15-sec final costs ~$7.50
- **Cost optimization:** Use fast variant for all concept testing. Only switch to pro for approved final concepts. At pro pricing, keep production clips to 15-30 seconds for ad use.

---

## Best Practices

### Do

- Include exact dialogue in quotes with speaker context: `The presenter looks at the camera and says "Your data, organized in seconds."`
- Describe character expressions that match the dialogue: "excited expression," "thoughtful pause," "genuine smile"
- Specify ambient audio to create atmosphere: "quiet office ambiance," "upbeat background music"
- Use image-to-video mode with a portrait/headshot to control character appearance
- Keep dialogue to 2-3 sentences per 15-second clip for natural pacing

### Don't

- Write monologue-length dialogue in a single generation — break into multiple clips
- Skip audio direction — Sora 2 will generate audio regardless, but without direction it may not match intent
- Expect consistent characters across separate generations — each is independent (use Runway Gen-4 for consistency)
- Include on-screen text — it will morph or distort during video
- Use sora-2-pro for iteration — at ~$0.50/sec it's expensive for exploratory work

---

## Worked Examples

### Example 1: Testimonial-Style Video Ad

**Context:** 15-second video testimonial for a SaaS product.
**Mode/settings:** Text-to-video, sora-2 (fast), 9:16 vertical, 15 seconds

**Prompt:**
```
A friendly young man in a casual blue button-down shirt sits in a well-lit
modern home office. Bookshelf and plant in the soft background. He looks
directly at the camera with a genuine, enthusiastic expression.

He says: "I used to spend three hours every Monday on reports. Now DataFlow
does it in ten minutes. I actually look forward to Mondays now."

He smiles naturally at the end, slight head nod of emphasis.

Audio: Clean room tone, no background music. Natural speech with friendly,
conversational delivery. Subtle room ambiance.

Camera: Medium close-up, static. Slight shallow depth of field.

Mood: Authentic, trustworthy, genuine enthusiasm.
```

**Annotations:**
- Dialogue in quotes with conversational delivery direction
- Character expression matches dialogue arc (enthusiastic -> genuine smile)
- "Looks directly at camera" creates testimonial connection
- No background music — clean testimonial aesthetic
- Static camera is standard for talking-head content
- 15 seconds is ideal for a social ad testimonial clip

**Result quality notes:** Sora 2's dialogue sync is strongest with natural, conversational text. Keep sentences short and natural-sounding.

---

### Example 2: Product Demo with Narration

**Context:** 20-second product demo with voiceover narration (not talking head).
**Mode/settings:** Text-to-video, sora-2 (fast), 16:9 landscape, 20 seconds

**Prompt:**
```
Close-up of hands typing on a sleek laptop in a modern workspace. The
screen shows a clean dashboard interface transitioning smoothly. The hands
pause, then click a button, and a visualization appears. Warm morning
light from the left.

A professional female voice narrates: "See your entire team's progress
in one view. Click, filter, done."

Audio: Soft, modern electronic background music. Subtle keyboard clicks.
Clean, professional mix.

Camera: Starts with a close-up on hands and screen, slowly widens to
reveal the workspace context.

Mood: Clean, efficient, empowering.
```

**Annotations:**
- Voiceover narration (not dialogue from a character) — Sora 2 handles both modes
- Short, punchy narration text (13 words) — easy for the model to sync accurately
- Visual action aligned with narration timing
- Background music specified to create professional ad feel

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Dialogue sounds unnatural or robotic | Complex sentence structure or uncommon words | Simplify dialogue to short, conversational sentences |
| Lip sync doesn't match audio | Long dialogue or rapid speech | Keep to 2-3 short sentences per 15-sec clip |
| Character looks different across clips | No cross-generation consistency | Use image-to-video with same source image, or use Runway Gen-4 |
| Audio quality is inconsistent | Missing audio direction | Specify ambient, music, and delivery style explicitly |
| Budget overrun on pro variant | Using sora-2-pro for iteration | Always use sora-2 (fast) for drafts; reserve pro for final approved concepts |
| Text on screen morphs | Attempting to show text in video | Remove text from prompt; overlay text in post-production |

---

## Model-Specific Features

### Synchronized Dialogue

Sora 2's primary differentiator. Characters speak with lip-synced audio:
- Include exact dialogue in quotes
- Specify delivery style: "conversational," "excited," "calm and authoritative"
- Best with short, natural sentences — 2-3 per 15-second clip
- Supports both direct character speech and voiceover narration

### Dual Quality Tiers

- **sora-2 (fast):** ~$0.10/sec — for iteration and concept testing
- **sora-2-pro:** ~$0.50/sec — for final production quality
- Same prompt format for both — easy to upgrade quality without reworking prompts

### Image-to-Video

Provide a source image to control character appearance:
- Use a portrait/headshot for testimonial-style content
- Use a product image for product demo animation
- Source image anchors the visual, prompt handles motion and audio

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad Creative pipeline | Dialogue-heavy video ad production | Testimonials, talking-head ads, narrated demos |
| OpenAI-stack projects | Same SDK as GPT, DALL-E | Unified API key and authentication |

**Cross-references:**
- [OpenAI Video Generation](https://platform.openai.com/docs/guides/video-generation)
- For silent video with consistency, see `models/video/runway-gen4.md`
- For native audio with vertical social focus, see `models/video/veo.md`
