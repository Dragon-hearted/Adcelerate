---
type: registry
version: 1
lastUpdated: "2026-04-14"
lastUpdatedBy: build-mode
---

# Model Registry

Master index of all registered models in PromptWriter. Every model file in the `models/` directory tree must have an entry here, and every entry must point to an existing file.

Run `just validate` to check consistency between this registry and the filesystem.

## Image Models

| Model | Provider | Status | File |
|-------|----------|--------|------|
| NanoBanana Pro | Google (Gemini) | production | image/nanobanana-pro.md |
| NanoBanana Flash | Google (Gemini) | production | image/nanobanana-flash.md |
| Flux | Black Forest Labs | production | image/flux.md |
| Ideogram | Ideogram | production | image/ideogram.md |
| DALL-E 3 | OpenAI | production | image/dalle-3.md |
| Midjourney | Midjourney | experimental | image/midjourney.md |
| SDXL | Stability AI | experimental | image/sdxl.md |

## Video Models

| Model | Provider | Status | File |
|-------|----------|--------|------|
| Kling | Kuaishou | production | video/kling.md |
| Veo | Google (DeepMind) | production | video/veo.md |
| Runway Gen-4 | Runway | production | video/runway-gen4.md |
| Sora 2 | OpenAI | production | video/sora-2.md |
| Seedance 2.0 | ByteDance | production | video/seedance-2.md |
| Higgsfield | Higgsfield | experimental | video/higgsfield.md |

## Voice Models

| Model | Provider | Status | File |
|-------|----------|--------|------|
| ElevenLabs | ElevenLabs | production | voice/elevenlabs.md |
| OpenAI TTS | OpenAI | production | voice/openai-tts.md |
| Cartesia Sonic | Cartesia | production | voice/cartesia-sonic.md |

## Summary

| Type | Count | Production | Experimental |
|------|-------|------------|-------------|
| Image | 7 | 5 | 2 |
| Video | 6 | 5 | 1 |
| Voice | 3 | 3 | 0 |
| **Total** | **16** | **13** | **3** |

## Adding a New Model

1. Run `just add-model <name> <image|video|voice>` to scaffold from `_schema.md`
2. Populate all sections in the new model file
3. Add an entry to the appropriate table above
4. Run `just validate` to confirm consistency
