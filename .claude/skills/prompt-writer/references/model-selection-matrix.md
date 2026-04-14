# Model Selection Matrix

Quick-reference comparison tables for choosing the right generation model.

---

## Image Models

| Model | Quality | Text Rendering | Multi-Ref | API | Cost/Image | Best For |
|-------|---------|---------------|-----------|-----|-----------|----------|
| **NanoBanana Pro** | Highest | No (garbles) | 3-14 refs | Gemini | ~$0.24 | Production storyboards, product visuals |
| **NanoBanana Flash** | Good | No | Same | Gemini | ~$0.04 | Iteration, concept exploration |
| **Flux** | High | No | Up to 8 | Replicate/BFL | $0.01-0.06 | Brand consistency, product variations |
| **Ideogram** | High | Best (~90%) | Up to 3 | Ideogram | ~$0.06 | Text in images, branded typography |
| **DALL-E 3** | Good | Good | No | OpenAI | ~$0.04-0.12 | General purpose, simple integration |
| **Midjourney** | Highest aesthetic | No | Limited | Discord (no API) | Subscription | Artistic, high-aesthetic imagery |
| **SDXL** | Good | No | Varies | Open source | Free (GPU cost) | Self-hosted, fine-tuned models |

### Image Model Quick Decision

| Scenario | Choose |
|----------|--------|
| SceneBoard storyboard (final) | NanoBanana Pro |
| SceneBoard storyboard (draft) | NanoBanana Flash |
| Text/headlines in image | Ideogram |
| Product in many contexts | Flux (multi-reference) |
| Artistic/conceptual mood board | Midjourney |
| Need API + good quality + budget | DALL-E 3 |
| GPU cluster, custom models | SDXL |

---

## Video Models

| Model | Max Length | Audio | Resolution | Consistency | API | Cost/Sec | Best For |
|-------|-----------|-------|------------|-------------|-----|----------|----------|
| **Kling** | 3 min | Native (2.6) | 1080p | Via source image | Third-party | ~$0.09 | Image-to-video storyboards |
| **Veo** | 60 sec | Native | 1080p/4K | Per-clip | Gemini/Vertex | $0.15-0.40 | Social video with audio |
| **Runway Gen-4** | 10 sec | No (silent) | 1080p | Cross-shot | Official | Credits | Multi-shot consistency |
| **Sora 2** | 60 sec | Native + dialogue | 1080p | Per-clip | OpenAI | $0.10-0.50 | Talking head, testimonials |
| **Seedance 2.0** | 20 sec | Native | 2K | Via 12 refs | BytePlus + third-party | $0.002-0.013/sec | High-volume, low cost |
| **Higgsfield** | Varies | Yes | 1080p | Per-clip | Web only | Platform | Camera presets, social |

### Video Model Quick Decision

| Scenario | Choose |
|----------|--------|
| SceneBoard scene animation | Kling (image-to-video) |
| Social ad with voiceover | Veo (vertical + native audio) |
| Testimonial with dialogue | Sora 2 (lip sync) |
| Multi-shot brand video | Runway Gen-4 (consistency) |
| 50+ ad variations cheaply | Seedance 2.0 (volume pricing) |
| Cinematic camera moves | Higgsfield (50+ presets) |
| Longest single clip | Kling (3 min) |
| Silent video + separate VO | Runway Gen-4 + ElevenLabs |

---

## Voice Models

| Model | Quality | Cloning | Languages | Latency | Cost | Best For |
|-------|---------|---------|-----------|---------|------|----------|
| **ElevenLabs** | Best | Yes (instant + pro) | 29+ | ~200ms | $0.12-0.30/1K chars | Premium voiceovers, cloning |
| **OpenAI TTS** | Good | No | 13+ | ~300ms | $0.015/min | Budget bulk narration |
| **Cartesia Sonic** | Very good | No | 15+ | ~40ms | $0.03/min | Real-time, emotional |

### Voice Model Quick Decision

| Scenario | Choose |
|----------|--------|
| Brand voice cloning | ElevenLabs |
| Cheapest at scale | OpenAI TTS |
| Real-time preview | Cartesia Sonic |
| Multilingual campaign | ElevenLabs |
| Emotional/conversational ad | Cartesia Sonic |
| Simple, reliable voiceover | OpenAI TTS |

---

## Pipeline Combinations

| Pipeline | Image | Video | Voice | Use Case |
|----------|-------|-------|-------|----------|
| SceneBoard standard | NanoBanana Pro | Kling | N/A | Storyboard animation |
| Social ad (vertical) | NanoBanana Pro | Veo | (built-in) | TikTok/Reels/Shorts |
| Testimonial ad | N/A | Sora 2 | (built-in) | Talking-head video |
| Brand video (multi-shot) | NanoBanana Pro | Runway Gen-4 | ElevenLabs | Consistent multi-clip |
| High-volume testing | Flux | Seedance 2.0 | OpenAI TTS | A/B test variations |
| Premium brand film | NanoBanana Pro | Kling | ElevenLabs | Hero content |
