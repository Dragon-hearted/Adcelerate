---
model: "seedance-2"
type: "video"
provider: "ByteDance"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Seedance 2.0 — Prompt Engineering Guide

## Overview

ByteDance's video generation model featuring Dual-Branch Diffusion Transformer architecture for simultaneous audio-visual generation. Seedance 2.0 offers up to 20 seconds at 2K resolution with native audio, up to 12 reference files for multimodal input, and an OpenAI-compatible API format. It is estimated to be 10-100x cheaper per clip than Sora 2, making it the best option for high-volume video ad production.

**Best for:** High-volume short video ad production at low cost, multimodal reference inputs, affordable audio-visual generation
**Key differentiator:** Lowest cost per clip among audio-capable video generators — estimated 10-100x cheaper than Sora 2 — with up to 12 reference files and OpenAI-compatible API

---

## Access

| Field | Value |
|-------|-------|
| **API** | BytePlus (official), Replicate, WaveSpeedAI, fal.ai (third-party); OpenAI-compatible API format |
| **Authentication** | API key per provider |
| **Pricing** | ~$0.10-0.80/min depending on resolution |
| **Model ID** | Provider-specific |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Standard resolution | Standard | Good | ~$0.10/min | High-volume batch production |
| 2K resolution | Slower | Highest | ~$0.80/min | Final production assets |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies by provider | Check provider documentation |
| Max system instruction | N/A | Single-prompt model |
| Max duration | 20 seconds | At up to 2K resolution |
| Supported aspect ratios | 16:9, 9:16, 1:1 | Standard video ratios |
| Max resolution | 2K | Higher than most competitors |
| Max reference images | 12 | Multimodal input — product images, brand assets, style references |
| Output format | MP4 | With native audio track |
| Text rendering | No | Text will distort during generation |
| Native audio | Yes | Simultaneous audio-visual via Dual-Branch Diffusion Transformer |
| Negative prompt support | Limited | Provider-dependent |

---

## Prompt Structure

Seedance uses the OpenAI-compatible API format, making integration straightforward for teams already using OpenAI SDKs. Prompts describe both visual and audio content.

### Required Elements

1. **Scene description** — Visual content, setting, action
2. **Audio direction** — Voiceover, SFX, ambient sounds, music

### Optional Elements

1. **Reference files** — Up to 12 for multimodal input (product images, brand assets, style refs)
2. **Camera movement** — How the camera behaves
3. **Mood/pacing** — Emotional direction and timing

### Prompt Template

```
[Scene description — subject, setting, action, lighting]

[Audio direction — voiceover text, sound effects, ambient, music style]

[Camera — movement type, speed]

[Mood — emotional quality, energy level]
```

### Budget Strategy

- **Draft/iteration:** Standard resolution at ~$0.10/min — a 15-sec draft costs ~$0.025
- **Production/final:** 2K resolution at ~$0.80/min — a 15-sec final costs ~$0.20
- **Cost optimization:** At these prices, 100 x 15-sec video ads costs ~$2.50-$20 depending on resolution. This is 10-100x cheaper than Sora 2 or Veo, making Seedance the go-to for high-volume production.

---

## Best Practices

### Do

- Use Seedance for high-volume video ad production where cost per clip matters most
- Leverage the 12-reference-file capability: feed product images, brand style guides, and example ads simultaneously
- Use the OpenAI-compatible API format for easy integration with existing OpenAI SDK tooling
- Include audio direction in every prompt — Seedance generates synchronized audio-visual
- Generate multiple variations cheaply and curate the best results

### Don't

- Use Seedance for clips longer than 20 seconds — use Kling (3 min) or Veo/Sora (60 sec) for longer content
- Expect the highest visual quality — Seedance optimizes for cost/volume over peak quality
- Skip reference files when brand consistency matters — 12-file multimodal input is a key strength
- Compare per-second pricing directly with per-minute pricing — Seedance charges per minute
- Use for single hero videos where quality trumps cost — use Veo Standard or sora-2-pro instead

---

## Worked Examples

### Example 1: High-Volume Product Ad Batch

**Context:** Generating 50 short video ads for different products, each 10 seconds, with consistent brand aesthetic.
**Mode/settings:** Text-to-video, standard resolution, 10 seconds, 6 reference files (3 product images, 2 brand style images, 1 example ad)

**Prompt:**
```
A clean product showcase video. The featured product sits centered on a
modern surface. Soft studio lighting creates gentle shadows. The product
slowly rotates. Clean, premium brand aesthetic matching the reference style.

Audio: Upbeat, modern electronic background music at low volume. Subtle
product interaction sounds. No voiceover.

Camera: Slow dolly around the product, ending with a slight push in.

Mood: Premium, clean, aspirational. Modern e-commerce aesthetic.
```

**Annotations:**
- Same base prompt used across all 50 videos, with product reference images swapped
- 6 reference files maintain brand consistency without detailed per-product prompting
- At ~$0.025 per 10-sec clip (standard res), the entire 50-video batch costs ~$1.25
- Audio direction keeps it simple — background music and subtle SFX

**Result quality notes:** Quality is good-enough for social ad testing. For winning concepts, regenerate on Veo or Sora for premium quality.

---

### Example 2: Audio-Visual Ad with Voiceover

**Context:** 15-second social ad with synchronized voiceover and sound effects.
**Mode/settings:** Text-to-video, 2K resolution, 15 seconds, 4 reference files

**Prompt:**
```
A person opens a delivery box on their kitchen counter and discovers
a premium subscription box. They lift out each item with genuine
excitement, placing them on the counter. Bright, warm kitchen lighting.

Audio: A friendly voice says "Unbox your monthly discovery. Fresh picks,
delivered." Box opening sound, gentle rustling of packaging. Light,
cheerful background music.

Camera: Over-the-shoulder medium shot, static with gentle handheld sway.

Mood: Joyful discovery, premium unboxing experience.
```

**Annotations:**
- Dual-Branch architecture handles audio and visual simultaneously
- Voiceover in quotes with SFX descriptions
- Reference files include product images and brand aesthetic examples
- 2K resolution for higher quality on this specific ad

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Audio out of sync with video | Complex audio-visual timing | Simplify audio direction; fewer simultaneous audio elements |
| Lower visual quality than Veo/Sora | Seedance optimizes for cost over peak quality | Expected behavior — use for volume, not hero content |
| Inconsistent brand look across batch | Not using reference files | Leverage 12-file reference input with brand assets |
| 20-second limit too short | Hard duration constraint | Stitch multiple clips in post, or use Kling/Veo for longer content |
| OpenAI API compatibility issues | Provider-specific differences | Test with official BytePlus API first; third-party providers may have variations |

---

## Model-Specific Features

### Dual-Branch Diffusion Transformer

Seedance's architecture generates audio and video simultaneously through two parallel branches:
- **Visual branch** — Generates the video frames
- **Audio branch** — Generates synchronized audio (dialogue, SFX, ambient, music)
- Both branches are trained together, producing better audio-visual alignment than post-hoc audio addition

### 12 Reference Files

Multimodal input supporting up to 12 reference files:
- Product images for visual accuracy
- Brand style guides for aesthetic consistency
- Example ads for format/composition reference
- Audio references for sound style (if supported by provider)

This is more reference files than any other video generator, making it ideal for brand-consistent batch production.

### OpenAI-Compatible API

Seedance follows the OpenAI API format, enabling:
- Drop-in replacement in existing OpenAI SDK workflows
- Familiar request/response structure
- Easy A/B testing between Sora 2 and Seedance on the same codebase

### Cost Advantage

Estimated 10-100x cheaper per clip than Sora 2:
- At standard resolution: ~$0.10/min (~$0.025 per 15-sec clip)
- At 2K resolution: ~$0.80/min (~$0.20 per 15-sec clip)
- Enables generating 100+ video ad variations for the cost of a few premium clips

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad Creative pipeline | High-volume video ad production | Lowest cost per clip for audio-visual |
| A/B test workflows | Video ad variation testing | Generate 50+ variations cheaply |
| OpenAI-stack projects | Drop-in via OpenAI-compatible API | Same SDK, different endpoint |

**Cross-references:**
- [Seedance 2.0](https://seed.bytedance.com/en/seedance2_0)
- For higher quality single clips, see `models/video/veo.md` or `models/video/sora-2.md`
- For longer duration, see `models/video/kling.md` (up to 3 min)
