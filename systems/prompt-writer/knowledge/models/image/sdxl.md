---
model: "sdxl"
type: "image"
provider: "Stability AI"
status: "experimental"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# SDXL — Prompt Engineering Guide

## Overview

Stability AI's open-source image generation model, available through fal.ai's fast-sdxl endpoint and self-hostable on GPU infrastructure. SDXL provides basic photorealistic generation at low cost, making it a budget option for teams with GPU infrastructure or high-volume needs where per-image API costs matter.

**Best for:** Self-hosted generation, budget-conscious batch production, teams with GPU infrastructure
**Key differentiator:** Open source and self-hostable — zero per-image cost when running on your own GPUs

---

## Access

| Field | Value |
|-------|-------|
| **API** | fal.ai (`fal-ai/fast-sdxl` endpoint), Replicate, self-hosted |
| **Authentication** | API key per provider, or none for self-hosted |
| **Pricing** | Very low via API (~$0.01-0.03/image), free when self-hosted |
| **Model ID** | `fal-ai/fast-sdxl` (fal.ai), `stability-ai/sdxl` (Replicate) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| fast-sdxl (fal.ai) | Fast | Good | ~$0.01-0.03 | Quick API-based generation |
| Self-hosted | Depends on hardware | Good | Free (GPU cost) | High-volume, zero marginal cost |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | ~2,000 chars | Varies by provider |
| Max system instruction | N/A | Single-prompt model |
| Max duration | N/A | Image model |
| Supported aspect ratios | Flexible | Common: 1:1, 16:9, 9:16, 4:3 |
| Max resolution | 1024x1024 native | Higher via upscaling |
| Max reference images | 0 (base model) | ControlNet/IP-Adapter add-ons support references |
| Output format | PNG, JPEG | Provider-dependent |
| Text rendering | No | Very poor text rendering |
| Native audio | N/A | Image model |
| Negative prompt support | Yes | Standard negative prompt field |

---

## Prompt Structure

SDXL uses a single text prompt with an optional negative prompt. Prompts should be descriptive with quality-boosting keywords.

### Required Elements

1. **Subject description** — What to generate
2. **Quality keywords** — Help improve output quality

### Optional Elements

1. **Negative prompt** — Elements to avoid
2. **Style keywords** — Artistic direction
3. **ControlNet/IP-Adapter inputs** — For guided generation (advanced)

### Prompt Template

```
[Subject description — detailed, specific]

[Style/medium keywords — e.g., "photorealistic, 8K, professional photography"]

[Quality boosters — "sharp focus, high detail, masterpiece"]

Negative prompt: [blurry, low quality, distorted, text, watermark, deformed]
```

### Budget Strategy

- **Draft/iteration:** fal.ai fast-sdxl at ~$0.01/image
- **Production/final:** Consider Flux or NanoBanana Pro for higher quality
- **Cost optimization:** Self-hosting eliminates per-image costs entirely — best for teams already running GPU infrastructure

---

## Best Practices

### Do

- Include quality-boosting keywords: "photorealistic, sharp focus, high detail, professional photography, 8K"
- Use negative prompts to prevent common artifacts: "blurry, low quality, distorted, text, watermark, deformed hands"
- Use SDXL when cost is the primary constraint and quality requirements are moderate
- Consider self-hosting for high-volume workflows where API costs would add up
- Use as a rapid prototyping tool when exploring concepts before investing in higher-quality models

### Don't

- Expect quality on par with Flux Pro, NanoBanana Pro, or Midjourney — SDXL is a generation behind
- Attempt text rendering — SDXL has very poor text capability
- Use for client-facing final deliverables without quality review — output is less consistent than newer models
- Skip the negative prompt — it significantly improves SDXL output quality
- Use for brand-consistency-critical work — no native reference image support in base model

---

## Worked Examples

### Example 1: Basic Product Shot

**Context:** Quick product image for internal concept exploration.
**Mode/settings:** fal.ai fast-sdxl, 1024x1024

**Prompt:**
```
Professional product photography of a sleek black wireless headphone on a
clean white surface. Soft studio lighting from the upper left. Subtle shadow.
Sharp focus, photorealistic, 8K quality, commercial product photography.
```

**Negative prompt:**
```
blurry, low quality, distorted, text, watermark, amateur, noisy
```

**Annotations:**
- Quality-boosting keywords ("8K quality, commercial product photography") significantly improve SDXL output
- Negative prompt prevents common SDXL artifacts
- Simple, clean composition plays to SDXL's strengths

**Result quality notes:** Acceptable for internal use and concept exploration. For client-facing work, regenerate on Flux Pro or NanoBanana Pro.

---

### Example 2: Lifestyle Scene

**Context:** Draft lifestyle image for ad concept testing.
**Mode/settings:** fal.ai fast-sdxl, 16:9

**Prompt:**
```
Young professional woman working at a minimalist desk in a bright modern
apartment. Natural window light. Laptop and coffee cup on the desk. Plants
in background. Photorealistic, lifestyle photography, clean and modern,
natural color palette, professional quality.
```

**Negative prompt:**
```
blurry, distorted, text, watermark, oversaturated, artificial, deformed hands
```

**Annotations:**
- Lifestyle scene for ad concept validation
- Natural lighting and clean composition are SDXL's sweet spot
- "deformed hands" in negative prompt is SDXL-specific — hands are a known weakness

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Deformed hands/fingers | Known SDXL weakness | Add "deformed hands, extra fingers" to negative prompt; crop hands out of frame |
| Lower overall quality than expected | SDXL is older generation | Accept for draft work; use newer models for production |
| Text artifacts in image | SDXL cannot render text | Remove text requirements; add "text" to negative prompt |
| Inconsistent quality across batch | SDXL has higher variance than newer models | Generate more variations and curate the best |
| Blurry or noisy output | Missing quality keywords | Add "sharp focus, high detail, 8K, masterpiece" to prompt |

---

## Model-Specific Features

### Open Source / Self-Hostable

SDXL's primary advantage is that it's fully open source. Teams with GPU infrastructure can:
- Run unlimited generations at zero per-image cost
- Fine-tune on custom datasets for brand-specific output
- Deploy on-premise for data privacy requirements
- Customize with ControlNet, IP-Adapter, and LoRA extensions

### ControlNet / IP-Adapter Extensions

While base SDXL has no reference image support, community extensions add this capability:
- **ControlNet** — Guide generation with edge maps, depth maps, poses
- **IP-Adapter** — Use reference images for style/identity transfer
- **LoRA** — Fine-tune on specific subjects, styles, or brands

These require self-hosting setup and are not available through basic API providers.

### Negative Prompt Support

SDXL supports a dedicated negative prompt field, which is more effective than positive-prompt-only models at avoiding specific artifacts. This is essential for getting good SDXL output.

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Budget-conscious workflows | Low-cost image generation | fal.ai fast-sdxl endpoint |
| Self-hosted pipelines | Zero-marginal-cost batch generation | Requires GPU infrastructure |

**Cross-references:**
- fal.ai fast-sdxl endpoint
- For higher quality production needs, see `models/image/flux.md` or `models/image/nanobanana-pro.md`

**Gap note:** SDXL is included as a budget/self-hosted option. For most Adcelerate production workflows, NanoBanana Pro or Flux will produce superior results. SDXL is best suited for teams that need high-volume generation at minimal cost or have specific self-hosting requirements.
