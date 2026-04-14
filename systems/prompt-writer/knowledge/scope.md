# PromptWriter — System Scope

## System Name

PromptWriter

## Description

Centralized prompt engineering knowledge system with per-model guides, visual direction references, and a model registry for AI image, video, and voice generation. PromptWriter is the single authority that every Adcelerate system consults when writing generation prompts — replacing scattered prompt knowledge previously maintained independently in SceneBoard, ad-creative, and other systems.

## In Scope

### Image Generation Models
- **NanoBanana Pro** (Gemini) — Primary image model for SceneBoard storyboards. Comprehensive prompt guide covering system instructions, creative modes, style anchors, reference image strategies, and worked examples.
- **NanoBanana Flash** (Gemini 3.1 Flash / 2.5 Flash) — Fast iteration and draft generation. Economical alternative to Pro for concept exploration.
- **Flux** (Black Forest Labs) — Open-weight models (Flux 2 Pro, Flex, Dev, Klein). Multi-image reference for brand consistency. Product-in-context generation.
- **Ideogram** — Best-in-class text rendering in images (~90% accuracy). Typography-heavy ad banners, branded graphics.
- **DALL-E 3** (OpenAI) — General image generation with good text rendering. ChatGPT integration.
- **Midjourney** — High-aesthetic artistic imagery. No official public API (Discord-based).
- **SDXL** (Stable Diffusion XL) — Open-source, self-hosted. Best for teams with GPU infrastructure and custom fine-tuning needs.

### Video Generation Models
- **Kling** (Kuaishou) — Up to 3 minutes at 1080p. SceneBoard's primary video model for image-to-video animation. Simultaneous audio-visual generation (Kling 2.6). Camera and motion controls.
- **Veo** (Google DeepMind) — Up to 60 seconds at 1080p/4K. Native audio. Vertical 9:16 for social.
- **Runway Gen-4** — Character/scene consistency across shots. Motion brush and camera controls. Style transfer.
- **Sora 2** (OpenAI) — Up to 60 seconds with synchronized dialogue, sound effects, and ambient audio.
- **Seedance 2.0** (ByteDance) — Up to 20 seconds at 2K. Dual-branch diffusion transformer for simultaneous audio-visual. Up to 12 reference files. Cost-effective high-volume production.
- **Higgsfield** — 50+ professional camera movements. All-in-one workflow: image gen, animation, editing. Social/mobile-first.

### Voice Generation Models
- **ElevenLabs** — Market leader. 29+ languages. Voice cloning (instant + professional). Emotion control. Streaming.
- **OpenAI TTS** — Simple, affordable. 13 built-in voices. Same SDK as GPT/DALL-E.
- **Cartesia Sonic** — Ultra-low latency (40ms TTFA). Nonverbal expressiveness (laughter, breathing). Real-time streaming.

### Visual Direction Knowledge
- **Shot types and camera angles** — Wide, medium, close-up, POV, overhead, and their prompt implications.
- **Composition principles** — Rule of thirds, center-frame, negative space, leading lines, depth of field, foreground elements.
- **Lighting** — Natural vs studio, time-of-day keywords, light-subject interaction, mood through lighting, key/fill/rim terminology.

### Model Registry & Extensibility
- **_schema.md template** — Standardized structure for adding new models: frontmatter metadata, overview, access info, constraints table, prompt structure, best practices, worked examples, failure modes, model-specific features, integration notes.
- **_registry.md index** — Master table of all registered models with type, provider, status, and file path.
- **Add-model workflow** — Copy _schema.md, fill sections, register in _registry.md, validate via CLI.

### CLI for Registry Management
- `list` — Display all registered models with type/status summary.
- `validate` — Check that _registry.md entries match files on disk, all files follow _schema.md structure.
- `add <model-name> --type <image|video|voice>` — Scaffold a new model file from _schema.md template.

### Claude Code Skill
- **Write Prompt [WP]** — Load model knowledge, load visual direction, compose optimized prompt, validate against model constraints.
- **Select Model [SM]** — Decision tree for choosing the right model given generation type, requirements, and budget.
- **List Models [LP]** — Quick reference of available models and capabilities.

## Out of Scope

- **API gateway/proxy** — That responsibility belongs to ImageEngine (WisGate integration, API key management, rate limiting, budget enforcement).
- **Actual image/video/voice generation** — PromptWriter produces prompts, not media. Generation is handled by ImageEngine, SceneBoard, or direct API calls.
- **Runtime service** — PromptWriter has no HTTP server or running process. It is a knowledge system accessed by Claude Code skills and other systems at build/prompt-composition time.
- **Model training or fine-tuning** — PromptWriter documents how to prompt existing models, not how to train them.
- **Brand/client-specific knowledge** — Client visual direction files (e.g., Vindof's visual-direction.md) stay in SceneBoard's client directories. PromptWriter provides the model-agnostic foundation; client knowledge layers on top.
- **API documentation** — WisGate API docs stay in `ai_docs/`. ImageEngine domain knowledge stays in ImageEngine. PromptWriter cross-references them but does not duplicate API integration details.

## Inputs

| Input | Description | Source |
|-------|-------------|--------|
| `generation-request` | What needs to be generated — subject, scene, purpose, format | Calling system (SceneBoard, Pinboard, etc.) |
| `scene-context` | Narrative context — what moment in the story, what precedes/follows, emotional beat | SceneBoard storyboard data |
| `style-anchor` | Visual identity preamble — brand colors, photographic style, mood, model appearance | Client visual direction documents |
| `model-name` | Which generation model to target (e.g., "nanobanana-pro", "kling", "flux") | Caller specifies, or PromptWriter recommends |

## Outputs

| Output | Description | Consumer |
|--------|-------------|----------|
| `optimized-prompt` | A model-specific prompt composed from knowledge files, visual direction, and scene context. Includes system instruction, prompt body, and reference guidance where applicable. | ImageEngine (for API calls), SceneBoard (Stage 6), ad-creative workflows |
| `model-recommendation` | Which model best fits the generation request, with rationale based on the model selection matrix. | Any system deciding which model to use |
| `prompt-validation` | Warnings about constraint violations (character limits, known failure patterns, missing required elements). | The agent composing the prompt |

## Target Users

- **SceneBoard** — Replaces locally-stored NanoBanana Pro guide and Kling prompt section. Stage 6 references PromptWriter knowledge instead.
- **ImageEngine** — Shared dependency for understanding model constraints and prompt formats.
- **Pinboard** — Future consumer for image generation prompts.
- **Ad-creative skill** — Supplements the existing generative-tools.md with deep per-model prompt engineering guidance.
- **Claude Code agents** — Any agent writing image, video, or voice generation prompts in the Adcelerate monorepo.
- **Future systems** — Any new system that needs to generate AI media has a single place to find prompt best practices.
