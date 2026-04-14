---
model: "flux"
type: "image"
provider: "Black Forest Labs"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# Flux — Prompt Engineering Guide

## Overview

Open-weight image generation models from Black Forest Labs, accessed via Replicate, BFL's native API, or fal.ai. Flux excels at photorealistic images with multi-image reference support (up to 8 images), making it the strongest option for brand-consistent variations where the same product or person must appear identically across many ad creatives.

**Best for:** Photorealistic images, brand-consistent ad variations at scale, multi-reference product consistency, style transfer
**Key differentiator:** Up to 8 reference images for consistent identity across generations — ideal for producing 50+ ad variations with the same product/person

---

## Access

| Field | Value |
|-------|-------|
| **API** | Replicate, BFL API, fal.ai |
| **Authentication** | API key per provider |
| **Pricing** | ~$0.01-0.06/image depending on model variant and resolution |
| **Model ID** | `flux-2-pro`, `flux-2-flex`, `flux-2-dev`, `flux-2-klein` (via respective providers) |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Flux 2 Pro | ~6 sec | Highest | $0.015/MP | Final production assets |
| Flux 2 Flex | ~22 sec | High + editing | $0.06/MP | Iterative editing workflows |
| Flux 2 Dev | ~2.5 sec | Good | $0.012/MP | Rapid prototyping |
| Flux 2 Klein | Fastest | Good | Lowest | High-volume batch generation |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | Varies by provider | Typically 2,000-4,000 chars |
| Max system instruction | N/A | Single-prompt model — no separate system instruction |
| Max duration | N/A | Image model |
| Supported aspect ratios | Flexible | Most common: 1:1, 16:9, 9:16, 4:3, 3:4 |
| Max resolution | Up to 2048x2048 | Varies by variant |
| Max reference images | 8 | For consistent identity across generations |
| Output format | PNG, JPEG | Provider-dependent |
| Text rendering | Partial | Better than average but not reliable for long text |
| Native audio | N/A | Image model |
| Negative prompt support | Yes | Supported in most API providers |

---

## Prompt Structure

Flux uses a single-prompt architecture (no separate system instruction). Prompts should be descriptive and direct.

### Required Elements

1. **Subject description** — Detailed visual description of the main subject
2. **Style/medium** — Photography style, artistic medium, or visual approach
3. **Setting/environment** — Where the scene takes place

### Optional Elements

1. **Reference images** — Up to 8 for identity/style consistency
2. **Negative prompt** — What to avoid in the generation
3. **Style transfer cues** — When matching reference image aesthetics

### Prompt Template

```
[Style/medium declaration]

[Subject description — physical details, clothing, pose, expression]

[Environment — setting, background, spatial context]

[Lighting — direction, quality, color temperature]

[Composition — framing, depth of field, focal point]

[Brand/product specifics if applicable]
```

### Budget Strategy

- **Draft/iteration:** Flux 2 Dev ($0.012/MP) or Flux 2 Klein (lowest cost) for rapid exploration
- **Production/final:** Flux 2 Pro ($0.015/MP) for highest quality
- **Cost optimization:** At $0.01-0.06/image, Flux is one of the most cost-effective options for high-volume generation. 100 images costs ~$1-6.

---

## Best Practices

### Do

- Use multi-image references (up to 8) when generating ad variations that need consistent product/person identity
- Provide product reference images for brand consistency across a batch of 50+ variations
- Use style reference images to match existing brand aesthetics
- Use Flux 2 Pro for final assets and Flux 2 Dev/Klein for iteration
- Be specific about photographic style: "editorial product photography" rather than "nice photo"

### Don't

- Rely on Flux for accurate text rendering in images — use Ideogram for text-heavy needs
- Skip reference images when consistency across variations matters — Flux's multi-ref is its core strength
- Use Flux 2 Flex for simple generation — it's optimized for iterative editing workflows and is slower
- Assume the Dev model (open-weight, self-hostable) matches Pro quality — it's good but not the highest tier

---

## Worked Examples

### Example 1: Product-in-Context Ad Variation

**Context:** Generating 10 variations of a SaaS product shown on different devices in different settings.
**Mode/settings:** Flux 2 Pro, 3 reference images (product screenshot, brand style guide, device mockup)

**Prompt:**
```
Editorial product photography. A sleek laptop displaying a modern kanban board
interface sits on a clean white desk in a minimalist home office. Morning
sunlight from the left creates soft shadows. Shallow depth of field — screen
sharp, background softly blurred. Coffee cup and small succulent visible in
background. Clean, aspirational, modern SaaS aesthetic. Color palette: white,
light gray, brand blue accents.
```

**Annotations:**
- Style declared upfront (editorial product photography)
- Product described with enough detail for consistency
- Environment gives context without overwhelming
- Reference images carry the brand consistency burden — prompt handles composition

**Result quality notes:** With 3 reference images, Flux maintains product identity across all 10 variations while varying the environment and composition per prompt.

---

### Example 2: Brand-Consistent Social Ad Batch

**Context:** Producing 50 social media ad images with the same person wearing different outfits in different locations.
**Mode/settings:** Flux 2 Klein (high volume), 4 reference images (person identity x2, brand style x2)

**Prompt:**
```
Photorealistic lifestyle photography. A young woman in her late 20s with
shoulder-length brown hair and warm smile stands in a sun-lit urban cafe.
She wears a navy fitted blazer over a white tee. Natural window light from
the right, shallow depth of field. Candid, approachable energy. Modern
professional aesthetic.
```

**Annotations:**
- Person identity maintained via reference images, not just prompt text
- Each of the 50 variations changes the outfit and location in the prompt
- Klein variant keeps cost under $3 for the entire batch

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Inconsistent product/person across variations | Not using reference images, or too few references | Use 3-8 reference images for identity consistency |
| Text in image is garbled or incorrect | Flux has partial text rendering | Use Ideogram for text-heavy images instead |
| Blurry or low-detail output | Using Dev/Klein variant for final assets | Switch to Flux 2 Pro for production quality |
| Style doesn't match brand | No style reference images provided | Include 1-2 brand style reference images |

---

## Model-Specific Features

### Multi-Image Reference (up to 8)

Flux's strongest feature for ad creative. Provide up to 8 reference images to maintain consistent identity:
- **Product images** — Same product appears accurately in every generation
- **Person images** — Same face/body across all ad variations
- **Style images** — Consistent visual aesthetic matching brand guidelines
- **Device mockups** — Consistent device framing for SaaS/app ads

### Style Transfer

Upload reference images that define the target aesthetic (color palette, lighting style, composition approach) and Flux will match the visual feel across new generations.

### Open-Weight Dev Model

Flux 2 Dev is open-weight and can be self-hosted on GPU infrastructure, eliminating per-image API costs for teams with the infrastructure to support it.

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad Creative pipeline | High-volume ad variation generation | Multi-ref for brand consistency |
| A/B test workflows | Rapid image variation production | Klein variant for cost-effective batch testing |

**Cross-references:**
- [Replicate Flux](https://replicate.com/black-forest-labs/flux-2-pro)
- [BFL API Docs](https://docs.bfl.ml/)
