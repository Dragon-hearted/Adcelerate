---
model: "midjourney"
type: "image"
provider: "Midjourney"
status: "experimental"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Midjourney — Prompt Engineering Guide

## Overview

Midjourney produces highly artistic, aesthetically refined images with a distinctive cinematic quality. It is widely regarded as producing the most visually appealing outputs for creative and artistic use cases. However, it lacks an official public API — access is primarily through Discord, and unofficial APIs carry ban risk.

**Best for:** Artistic/aesthetic hero images, high-visual-quality creative campaigns, mood boards, aspirational brand imagery
**Key differentiator:** Highest aesthetic quality and artistic refinement among image generators — produces "gallery-ready" visuals with minimal prompting

---

## Access

| Field | Value |
|-------|-------|
| **API** | No official public API — Discord-based interaction |
| **Authentication** | Midjourney subscription + Discord account |
| **Pricing** | $10-120/month subscription (tiered by GPU hours) |
| **Model ID** | N/A (version selected in Discord via `--v` parameter) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Standard | Moderate | High | Included in subscription | General use |
| Turbo | Fast | High | 2x GPU minutes | Time-sensitive work |
| Relaxed | Slow (queued) | High | Unlimited (Pro plan) | Batch exploration |

**Important:** Unofficial APIs (third-party services that automate Discord interaction) exist but violate Midjourney's Terms of Service and risk account bans. Do not rely on them for production workflows.

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | ~6,000 chars | Discord message limit applies |
| Max system instruction | N/A | Single-prompt model |
| Max duration | N/A | Image model |
| Supported aspect ratios | Flexible | Set via `--ar` parameter (e.g., `--ar 16:9`) |
| Max resolution | Up to 2048x2048 | Upscale available |
| Max reference images | Limited | Image prompts via URL, style references via `--sref` |
| Output format | PNG, JPEG | Via Discord download |
| Text rendering | No | Very poor text rendering — avoid text in images |
| Native audio | N/A | Image model |
| Negative prompt support | Partial | Via `--no` parameter (e.g., `--no text, watermark`) |

---

## Prompt Structure

Midjourney responds best to concise, evocative prompts rather than exhaustive descriptions. It interprets artistic intent well.

### Required Elements

1. **Subject** — What to generate, described evocatively
2. **Style/mood** — Artistic direction, medium, or aesthetic

### Optional Elements

1. **Parameters** — `--ar`, `--v`, `--s` (stylize), `--no`, `--sref` (style reference)
2. **Image URL reference** — Prepend an image URL to influence the generation
3. **Style reference** — `--sref [URL]` to match a visual aesthetic

### Prompt Template

```
[Subject description — evocative, not exhaustive]

[Style/medium/mood keywords]

[Technical parameters: --ar 16:9 --v 6.1 --s 750 --no text]
```

### Budget Strategy

- **Draft/iteration:** Relaxed mode on Pro plan (unlimited, queued)
- **Production/final:** Standard or Turbo mode for faster, priority generation
- **Cost optimization:** Subscription-based, so cost scales with plan tier rather than per-image. Best value at high volumes with Pro/Mega plans.

---

## Best Practices

### Do

- Write concise, evocative prompts — Midjourney interprets artistic intent better than literal descriptions
- Use the `--s` (stylize) parameter to control how much artistic interpretation the model applies (0 = literal, 1000 = maximum artistic)
- Use `--sref` with a URL to maintain consistent visual style across generations
- Use `--no text, watermark, words` to prevent text artifacts
- Leverage Midjourney for hero images that need the highest aesthetic quality

### Don't

- Write exhaustively detailed technical prompts — Midjourney handles these worse than concise poetic ones
- Build production pipelines depending on Midjourney — no official API means no reliable automation
- Use unofficial API wrappers in production — ban risk is real and would break your pipeline
- Expect accurate text rendering — Midjourney is the worst of the major models at text
- Use for high-volume automated batch generation — Discord-based workflow doesn't support this

---

## Worked Examples

### Example 1: Aspirational Brand Hero Image

**Context:** Creating a hero image for a premium fashion brand landing page.
**Mode/settings:** Standard mode, `--v 6.1 --ar 16:9 --s 750`

**Prompt:**
```
Golden hour on a Mediterranean rooftop terrace, young woman in an oversized
linen blazer gazing over terracotta rooftops, warm amber light, editorial
fashion photography, Condé Nast aesthetic, shallow depth of field --ar 16:9
--v 6.1 --s 750 --no text watermark
```

**Annotations:**
- Evocative scene-setting rather than exhaustive detail
- Named aesthetic reference ("Condé Nast") for style direction
- `--s 750` for high artistic interpretation
- `--no text watermark` prevents unwanted artifacts

**Result quality notes:** Midjourney excels at this type of prompt — evocative, aesthetic, emotional. The output will have a gallery-quality visual polish that's difficult to achieve with other models.

---

### Example 2: Product Mood Board

**Context:** Generating mood board imagery for a premium skincare brand campaign.
**Mode/settings:** Standard mode, `--v 6.1 --ar 1:1 --s 500`

**Prompt:**
```
Minimalist flat lay, luxury skincare bottles on marble surface, soft pink
and cream palette, morning light, editorial product photography, Kinfolk
magazine aesthetic --ar 1:1 --v 6.1 --s 500 --no text labels
```

**Annotations:**
- Clean, specific composition request
- Named publication aesthetic for consistent style
- Lower stylize (500) for more faithful product representation

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Text appears garbled in image | Midjourney cannot render text | Always use `--no text`; add text in post-production |
| Too much artistic interpretation | High `--s` value | Lower `--s` to 100-250 for more literal output |
| Inconsistent style across batch | No systematic reference mechanism | Use `--sref` with a consistent style reference URL |
| Production pipeline breaks | Unofficial API got banned | Do not rely on unofficial APIs; use Flux/NanoBanana for automated pipelines |
| Cannot automate generation | No official API | Use Discord manually; for automation needs, switch to Flux, DALL-E 3, or NanoBanana |

---

## Model-Specific Features

### Style Reference (`--sref`)

Provide a URL to an image that defines the target visual aesthetic. Midjourney will match the style (not content) of the reference across generations. Useful for maintaining campaign visual identity.

### Stylize Parameter (`--s`)

Controls the balance between prompt fidelity and artistic interpretation:
- `--s 0` — Most literal interpretation of the prompt
- `--s 250` — Default balance
- `--s 750-1000` — Maximum artistic expression, model takes significant creative liberties

### Negative Prompt (`--no`)

Exclude specific elements: `--no text, watermark, blurry, distorted` — useful for preventing common artifacts.

### Discord-Based Workflow

All interaction happens through Discord:
- `/imagine` — Generate from prompt
- `/describe` — Get prompt suggestions from an image
- Upscale and variation buttons on generated images
- Pan and zoom controls for extending compositions

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Manual creative workflow | Hero image generation | Not automatable — Discord-based only |
| Mood board creation | Aspirational brand imagery | Manual use for high-aesthetic needs |

**Cross-references:**
- No API docs — Discord-based platform
- For automated pipelines requiring similar aesthetic quality, consider Flux 2 Pro as an alternative

**Gap note:** Midjourney lacks an official API, making it unsuitable for automated Adcelerate pipelines. It is included here for manual creative workflows and as an aesthetic benchmark. If Midjourney releases a public API, this file should be updated with access details and integration notes.
