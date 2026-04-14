---
name: prompt-writer
description: "Centralized AI prompt engineering. Use when the user wants to write, optimize, or review prompts for image, video, or voice generation models (NanoBanana Pro, Kling, Flux, Ideogram, Veo, Runway, Sora, Seedance, ElevenLabs, OpenAI TTS, Cartesia, DALL-E, Midjourney, SDXL, Higgsfield). Triggers: 'write a prompt', 'generate image prompt', 'video prompt', 'optimize prompt', 'which model', 'model recommendation', 'NanoBanana', 'Kling prompt', 'Flux prompt', 'Ideogram', 'Veo', or any model name + 'prompt'."
---

# PromptWriter — AI Generation Prompt Engineering

PromptWriter is the single authority for writing AI image, video, and voice generation prompts across all Adcelerate systems. It provides per-model knowledge, visual direction references, and a model registry.

## On Activation

1. Determine which mode the user needs:
   - **[WP] Write Prompt** — Compose an optimized prompt for a specific model
   - **[SM] Select Model** — Get a recommendation for which model to use
   - **[LP] List Models** — See all available models and their capabilities

2. Route to the appropriate workflow:
   - WP -> [write-prompt.md](write-prompt.md)
   - SM -> [select-model.md](select-model.md)
   - LP -> Display the model registry summary (read `systems/prompt-writer/knowledge/models/_registry.md`)

3. If the user mentions a specific model name, default to **[WP] Write Prompt** with that model pre-selected.

## Knowledge Sources

All prompt engineering knowledge lives in `systems/prompt-writer/knowledge/`:

- **Model guides** — `models/{image,video,voice}/<model>.md` — Per-model prompt structure, best practices, constraints, worked examples, failure modes
- **Visual direction** — `visual-direction/{shot-types,composition,lighting}.md` — Model-agnostic camera, composition, and lighting vocabulary
- **Domain knowledge** — `domain.md` — Cross-cutting principles: Style Anchor pattern, creative modes, reference strategies, failure mode catalog
- **Schema template** — `models/_schema.md` — Template for adding new models
- **Registry** — `models/_registry.md` — Master index of all registered models

## Related Skills

- **scene-board** — Primary consumer. SceneBoard's Stage 6 uses PromptWriter knowledge for NanoBanana Pro and Kling prompts.
- **ad-creative** — Uses PromptWriter for model selection and prompt optimization across campaigns.

## Quick Reference

### Image Models
| Model | Best For |
|-------|----------|
| NanoBanana Pro | Production storyboard images, product visuals |
| NanoBanana Flash | Fast iteration, concept exploration |
| Flux | Multi-reference brand consistency, product variations |
| Ideogram | Text rendering in images, branded typography |
| DALL-E 3 | General image generation |
| Midjourney | High-aesthetic artistic imagery |
| SDXL | Self-hosted, customizable |

### Video Models
| Model | Best For |
|-------|----------|
| Kling | Image-to-video storyboard animation (up to 3 min) |
| Veo | Social video with native audio (up to 60s) |
| Runway Gen-4 | Character/scene consistency, silent video |
| Sora 2 | Dialogue and talking-head video (up to 60s) |
| Seedance 2.0 | High-volume affordable video with audio |
| Higgsfield | Social video with cinematic camera presets |

### Voice Models
| Model | Best For |
|-------|----------|
| ElevenLabs | Best quality, voice cloning, multilingual |
| OpenAI TTS | Cheapest, simple integration |
| Cartesia Sonic | Lowest latency, nonverbal expressiveness |
