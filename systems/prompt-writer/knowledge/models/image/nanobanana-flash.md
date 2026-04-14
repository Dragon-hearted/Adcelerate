---
model: "nanobanana-flash"
type: "image"
provider: "Google (Gemini)"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "builder-model-files"
---

# NanoBanana Flash — Prompt Engineering Guide

## Overview

The high-efficiency variant of Google's NanoBanana image generation family, available in two tiers: `gemini-3.1-flash-image-preview` (Nano Banana 2) and `gemini-2.5-flash-image`. Flash models share the same prompt architecture as NanoBanana Pro but trade peak quality for speed and cost efficiency, making them ideal for iteration, concept exploration, and draft storyboards.

**Best for:** Rapid prompt iteration, concept exploration, draft storyboards, budget-conscious batch generation
**Key differentiator:** Same API and prompt structure as Pro at significantly lower cost — iterate with Flash, finalize with Pro

---

## Access

| Field | Value |
|-------|-------|
| **API** | WisGate (JuheAPI) — `POST /v1beta/models/{model}:generateContent` |
| **Authentication** | `x-goog-api-key` header with `WISDOM_GATE_KEY` env var |
| **Pricing** | ~$0.04/image (2.5 Flash), lower per-token than Pro |
| **Model ID** | `gemini-3.1-flash-image-preview` or `gemini-2.5-flash-image` |

**Base URL:** `https://api.wisgate.ai`

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| `gemini-3.1-flash-image-preview` (Nano Banana 2) | Fast | High | Mid | Fast iteration with good quality |
| `gemini-2.5-flash-image` | Fastest | Good | Lowest (~1,290 tokens/image) | Budget-conscious rapid prototyping |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | 8,192 chars | Same as Pro |
| Max system instruction | 512 chars | Same as Pro |
| Max duration | N/A | Image model |
| Supported aspect ratios | 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 | Flash supports MORE ratios than Pro (adds 1:4, 1:8, 4:1, 8:1) |
| Max resolution | 4K (3.1 Flash), 2K (2.5 Flash) | 3.1 Flash supports 0.5K, 1K, 2K, 4K; 2.5 Flash supports 1K, 2K |
| Max reference images | 14 (6 objects + 5 humans) | Same as Pro |
| Output format | PNG | Base64-encoded in API response |
| Text rendering | Partial | Same limitation as Pro — always end with "No text in image." |
| Native audio | N/A | Image model |
| Negative prompt support | No | Use terminal constraints |

**Note:** `gemini-3.1-flash-image-preview` currently does not support the `imageSize` parameter in some configurations.

---

## Prompt Structure

Flash uses the identical prompt architecture as NanoBanana Pro. All prompts written for Pro work with Flash, and vice versa. The same system instruction + style anchor preamble + prompt body structure applies.

### Required Elements

1. **System Instruction** (max 512 chars) — Same format as Pro
2. **Style Anchor Preamble** (200-400 chars) — Same verbatim preamble requirement
3. **Subject Description** — Same specificity requirements
4. **Terminal Line** — Must end with `No text in image.`

### Optional Elements

1. **Environment/Setting** — Same depth cue recommendations
2. **Brand Elements** — Same product-as-hero approach
3. **Mood** — Same concise mood description
4. **Reference Guidance** — Same reference pairing format

### Prompt Template

Identical to NanoBanana Pro. See `models/image/nanobanana-pro.md` for the full template.

### Budget Strategy

- **Draft/iteration:** Use `gemini-2.5-flash-image` for the fastest, cheapest exploration. Good for testing compositions and prompt structure.
- **Quality iteration:** Use `gemini-3.1-flash-image-preview` when you need higher quality iteration but aren't ready for Pro cost.
- **Production/final:** Switch to `gemini-3-pro-image-preview` (Pro) once the prompt is finalized.
- **Cost optimization:** Gemini 2.5 Flash Image consumes ~1,290 tokens per image regardless of aspect ratio. Use lower resolutions (1K, 2K) during iteration.

---

## Best Practices

### Do

- Use Flash for all prompt development and iteration before switching to Pro for finals
- Test composition, framing, and color balance on Flash before committing Pro budget
- Use `gemini-2.5-flash-image` for high-volume batch exploration (e.g., testing 10+ prompt variations)
- Use `gemini-3.1-flash-image-preview` when you need Flash-speed with quality closer to Pro
- Write prompts identically for Flash and Pro — the same prompt should work on both

### Don't

- Use Flash for final client-facing deliverables — Pro produces noticeably better detail and coherence
- Assume Flash quality issues are prompt problems — try the same prompt on Pro before rewriting
- Use 4K resolution during iteration — it costs more tokens and slows generation without helping prompt development
- Skip Flash iteration and go straight to Pro — this wastes budget on prompt refinement

---

## Worked Examples

### Example 1: Quick Composition Test

**Context:** Testing whether a basketball court scene composition works before committing to Pro generation.
**Mode/settings:** Expressive, `gemini-2.5-flash-image`, 1K resolution

**Prompt:**
```
[Same system instruction and prompt as the Pro version]
```

**Annotations:**
- Identical prompt to Pro — the goal is to validate composition and mood
- 1K resolution keeps cost minimal
- If the composition works, regenerate on Pro at 2K or 4K for the final

**Result quality notes:** Flash output will have slightly less detail in textures and slightly less coherent fine details (garment patterns, facial features) compared to Pro. Composition, color balance, and overall mood are reliable indicators of what Pro will produce.

---

### Example 2: Batch Variation Exploration

**Context:** Testing 5 different clothing descriptions for the same scene to find the best product presentation.
**Mode/settings:** Faithful, `gemini-2.5-flash-image`, 1K resolution

**Prompt:**
```
[5 variations of the same base prompt with different clothing descriptions]
```

**Annotations:**
- Run all 5 variations on Flash at ~$0.04 each = ~$0.20 total
- Same 5 on Pro would cost ~$1.20
- Pick the best 1-2 and regenerate on Pro

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Noticeably lower detail than Pro | Expected behavior — Flash trades quality for speed | Accept for iteration; switch to Pro for finals |
| Fine garment details (patterns, logos) are blurry | Flash has lower detail fidelity | Not a prompt issue — regenerate on Pro for accuracy |
| `imageSize` parameter ignored | Known limitation of `gemini-3.1-flash-image-preview` | Omit `imageSize` or use `gemini-2.5-flash-image` instead |
| Budget exceeded (402 response) | Token ceiling hit | Check `IMAGE_ENGINE_TOKEN_CEILING` setting; use lower resolution |
| Rate limit exceeded (429) | Too many requests per minute | ImageEngine handles retry/backoff; check `IMAGE_ENGINE_RATE_LIMIT` |

---

## Model-Specific Features

### Extended Aspect Ratio Support

`gemini-3.1-flash-image-preview` supports additional extreme aspect ratios not available in Pro:
- **1:4** and **1:8** — Ultra-tall vertical formats
- **4:1** and **8:1** — Ultra-wide horizontal formats

These are useful for banner ads, vertical story formats, or panoramic compositions.

### Identical Prompt Compatibility

Flash and Pro use the exact same prompt format. This enables a "develop on Flash, ship on Pro" workflow where no prompt modifications are needed when upgrading to Pro for final output.

### Token-Efficient Generation

Gemini 2.5 Flash Image consumes a flat ~1,290 tokens per image regardless of aspect ratio, making costs predictable for batch generation budgeting.

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| ImageEngine | Generation gateway | Same API path as Pro, just different model ID in URL |
| SceneBoard | Draft storyboard iteration | Flash used during visual direction exploration |
| PromptWriter | Prompt construction | Same prompt format — no model-specific adjustments needed |

**Cross-references:**
- `models/image/nanobanana-pro.md` — Full prompt guide (Flash uses identical format)
- `systems/image-engine/knowledge/domain.md` — WisGate API details, model catalog
- `ai_docs/wisgate-nanobanana-api.md` — Full API reference
