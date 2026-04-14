# Select Model Workflow

## Purpose

Recommend the best generation model for the user's needs based on generation type, requirements, budget, and use case.

## Workflow

### Step 1: Gather Requirements

Ask the user:

1. **What are you generating?** — Image, video, or voice?
2. **What's the use case?** — Storyboard scene, ad creative, product shot, social content, voiceover, etc.
3. **Key requirements** — Any of: text in image, voice cloning, native audio, character consistency, specific duration, vertical format, budget constraints.
4. **Volume** — One-off or batch (how many)?

### Step 2: Load Decision Data

Read the model comparison references:
```
.claude/skills/prompt-writer/references/model-selection-matrix.md
systems/prompt-writer/knowledge/models/_registry.md
```

### Step 3: Apply Decision Tree

#### Image Model Selection

```
Need text rendered in the image?
  -> YES -> Ideogram (best text rendering)

Already in the SceneBoard pipeline?
  -> YES -> NanoBanana Pro (production) or Flash (iteration)

Need multi-image reference for brand consistency?
  -> YES -> Flux (up to 8 references)

Need self-hosted / open source?
  -> YES -> SDXL

Need highest aesthetic quality (artistic)?
  -> YES -> Midjourney

General purpose, good quality?
  -> DALL-E 3

Default for ad creative:
  -> NanoBanana Pro (best overall quality + text + editing)
```

#### Video Model Selection

```
Animating a storyboard image (image-to-video)?
  -> YES -> Kling (primary SceneBoard pipeline, up to 3 min)

Need native dialogue / talking head?
  -> YES -> Sora 2 (synchronized lip-sync)

Need vertical social video with native audio?
  -> YES -> Veo (9:16 + native audio)

Need character/scene consistency across shots?
  -> YES -> Runway Gen-4 (silent — pair with voice tool)

Need high-volume at lowest cost?
  -> YES -> Seedance 2.0 (10-100x cheaper than Sora)

Need cinematic camera movements?
  -> YES -> Higgsfield (50+ presets, web-based)

Default for ad video:
  -> Veo (best balance of quality, audio, and vertical support)
```

#### Voice Model Selection

```
Need voice cloning?
  -> YES -> ElevenLabs (instant + professional cloning)

Need lowest latency / real-time?
  -> YES -> Cartesia Sonic (40ms TTFA)

Need cheapest at scale?
  -> YES -> OpenAI TTS (~$0.015/min)

Need multilingual (10+ languages)?
  -> YES -> ElevenLabs (29+ languages)

Need nonverbal expressiveness (laughter, breathing)?
  -> YES -> Cartesia Sonic

Default for ad voiceover:
  -> ElevenLabs (best quality, most features)
```

### Step 4: Present Recommendation

Provide:

1. **Recommended model** — Name and why
2. **Alternative** — Second-best option with tradeoff explanation
3. **Key considerations** — Budget impact, integration notes, limitations
4. **Next step** — Offer to write a prompt for the recommended model (route to [write-prompt.md](write-prompt.md))

### Step 5: If User Wants to Proceed

Route to **[WP] Write Prompt** with the selected model pre-loaded.
