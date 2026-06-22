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

4. **Before composing, check the Prompt Recipes table below.** If the request implies a specific deliverable or output format (a static ad, a UGC clip, a JSON prompt, "enhance this prompt", a Kling shot list), the matching recipe — folded into the named model guide — defines the exact structure to follow. Pick the recipe by deliverable + format first, then apply that model guide's Constraints. Then run [WP].

## Prompt Recipes — When to Use What

Task/format-specific prompt recipes are folded into the model guide that best fits each deliverable. Match the request to a row, then open that model guide's `## Prompt Recipe: …` section for the full structure and examples.

| Deliverable / request | Output format | Recipe → model guide |
|---|---|---|
| Static advertising visual (headline + CTA + typography) | prose | Static Ads Prompter → `models/image/ideogram.md` |
| Image prompt from a rough idea or brief | prose | Image Prompt Generator → `models/image/nanobanana-pro.md` |
| "Enhance / improve this image prompt" | prose | Image Prompt Enhancer → `models/image/nanobanana-pro.md` |
| Image prompt as a structured JSON object | JSON | JSON Image Prompter → `models/image/nanobanana-pro.md` |
| Kling shot-list video prompt | 4-part text (style/anchor/shots/sound) | Kling 3.0 Shot-List Prompter → `models/video/kling.md` |
| "Enhance / improve this video prompt" | prose | Video Prompt Enhancer → `models/video/kling.md` |
| Video prompt as a structured JSON object | JSON | JSON Video Prompter → `models/video/kling.md` |
| UGC / creator / talking-head clip with exact dialogue | labeled fields | UGC Prompter → `models/video/sora-2.md` |

**Recipe vs. model:** the recipe defines *how to shape the prompt* for a deliverable; the model guide's Constraints define *what the model allows*. The JSON and enhancer recipes are model-agnostic — they're homed on the primary model of their media type, but the structure transfers to any model in that category (apply the target model's Constraints).

## Knowledge Sources

All prompt engineering knowledge lives in `systems/prompt-writer/knowledge/`:

- **Model guides** — `models/{image,video,voice}/<model>.md` — Per-model prompt structure, best practices, constraints, worked examples, failure modes
- **Visual direction** — `visual-direction/{shot-types,composition,lighting,facial-expressions}.md` — Model-agnostic camera, composition, lighting, and FACS-based facial-expression vocabulary
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
