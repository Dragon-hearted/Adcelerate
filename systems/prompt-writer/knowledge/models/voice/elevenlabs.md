---
model: "ElevenLabs"
type: "voice"
provider: "ElevenLabs"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "build-mode"
---

# ElevenLabs — Prompt Engineering Guide

## Overview

The market leader in realistic voice generation and voice cloning. ElevenLabs produces the most natural-sounding AI voiceovers, supports 29+ languages with natural accent and intonation, and offers both instant and professional voice cloning.

**Best for:** Most natural-sounding voiceovers, brand voice cloning, multilingual ad campaigns.
**Key differentiator:** Best-in-class voice quality combined with voice cloning from short audio clips.

---

## Access

| Field | Value |
|-------|-------|
| **API** | REST API with streaming support |
| **Authentication** | API key (`xi-api-key` header) |
| **Pricing** | ~$0.12-0.30 per 1,000 characters depending on plan; starts at $5/month |
| **Model ID** | `eleven_multilingual_v2` (primary), `eleven_turbo_v2` (low latency) |

**Model variants:**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Multilingual v2 | Standard | Highest | Standard | Final production voiceovers |
| Turbo v2 | Fast | High | Standard | Real-time applications, previews |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max text length | 5,000 chars per request | Split longer scripts into chunks |
| Supported languages | 29+ | English, Spanish, French, German, Hindi, Chinese, Japanese, Korean, etc. |
| Voice cloning (instant) | Short audio clip | Quick cloning from a few seconds of audio |
| Voice cloning (professional) | Longer recordings | Higher fidelity clone from extended samples |
| Output format | MP3, WAV, PCM | Configurable per request |
| Streaming | Yes | Real-time audio streaming supported |
| Latency | ~200ms | Time to first audio byte |

---

## Prompt Structure

Voice generation "prompts" are the input text plus voice settings. Unlike image models, there is no visual composition — the prompt is the script itself.

### Required Elements

1. **Text/script** — The words to be spoken. Clean, punctuated, natural-sounding text.
2. **Voice ID** — Which voice to use (pre-built library or cloned voice).
3. **Model ID** — Which ElevenLabs model to use (`eleven_multilingual_v2` recommended).

### Optional Elements

1. **Stability** (0.0-1.0) — Lower = more expressive/varied, higher = more consistent/monotone. Default: 0.5.
2. **Similarity boost** (0.0-1.0) — How closely to match the original voice. Higher = more similar but may amplify artifacts. Default: 0.75.
3. **Style** (0.0-1.0) — Amplifies the style of the original voice. Use sparingly.
4. **Speaker boost** — Enhances speaker similarity in multilingual model.

### Script Writing Best Practices

```
[Clean, punctuated text]
[Use em-dashes for pauses — like this]
[Use ellipses for trailing off...]
[CAPITALIZE for emphasis on specific words]
[Break long passages into logical paragraphs]
```

### Budget Strategy

- **Draft/iteration:** Use Turbo v2 for faster previews during script iteration.
- **Production/final:** Use Multilingual v2 for highest quality final renders.
- **Cost optimization:** Batch generate all voice variations in one session. Pre-write and finalize scripts before generating to minimize re-renders.

---

## Best Practices

### Do

- Write scripts as natural spoken language, not written prose — read them aloud before generating.
- Use punctuation to control pacing: commas for brief pauses, periods for full stops, em-dashes for dramatic pauses.
- Set stability to 0.3-0.5 for expressive ad voiceovers that sound human.
- Test multiple voices from the library before committing to one for a campaign.
- Clone the brand spokesperson's voice early and use it consistently across all ad variations.

### Don't

- Don't set stability above 0.8 for ad voiceovers — it sounds robotic and monotone.
- Don't generate from raw copy — ad scripts need to be adapted for spoken delivery (shorter sentences, conversational rhythm).
- Don't include stage directions or parenthetical notes in the text — they will be spoken aloud.
- Don't use ALL CAPS for entire sentences — only for individual words that need emphasis.

---

## Worked Examples

### Example 1: SaaS Product Ad Voiceover

**Context:** 15-second voiceover for a product demo video ad.
**Mode/settings:** Multilingual v2, stability: 0.4, similarity_boost: 0.75

**Prompt:**
```
Stop wasting hours on manual reporting. DataFlow pulls your data, builds the dashboards, and sends the insights — automatically. Try it free for fourteen days.
```

**Annotations:**
- Short, punchy sentences match the 15-second format.
- Em-dash before "automatically" creates a brief dramatic pause that emphasizes the key benefit.
- "fourteen" spelled out instead of "14" to ensure natural pronunciation.
- No stage directions or formatting — just clean spoken text.

**Result quality notes:** At stability 0.4, the voice naturally emphasizes "Stop" and "automatically" without explicit direction.

---

### Example 2: Multilingual Ad Campaign

**Context:** Same ad script in English, Spanish, and Hindi for a global campaign.
**Mode/settings:** Multilingual v2, stability: 0.5, similarity_boost: 0.8 (cloned brand voice)

**Prompt (English):**
```
Your mornings deserve better. Meet Brewly — the smartest coffee maker you'll ever own.
```

**Annotations:**
- Conversational, emotional opening that translates well across languages.
- Brand name "Brewly" kept as-is in all language versions (brand names don't translate).
- Em-dash creates a reveal moment before the product name.

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Robotic, monotone delivery | Stability set too high (>0.8) | Lower stability to 0.3-0.5 for natural variation |
| Mispronounced brand names | Unusual spelling or acronyms | Add phonetic hints or spell out pronunciation |
| Unnatural pacing | Long run-on sentences in the script | Break into short, natural spoken phrases with punctuation |
| Voice sounds different across clips | Inconsistent voice settings or different voice IDs | Lock settings and voice ID for entire campaign |
| Audible artifacts or glitches | Similarity boost too high on cloned voice | Lower similarity_boost to 0.7 or try a different model |

---

## Model-Specific Features

### Voice Cloning

Two tiers of voice cloning:
- **Instant cloning** — Upload a short audio clip, get a usable clone immediately. Good for prototyping.
- **Professional cloning** — Upload extended recordings for higher-fidelity voice matching. Use for production brand voices.

Clone your brand spokesperson's voice once, then use it across all ad variations, languages, and scripts.

### Emotion and Style Control

The `style` parameter amplifies the emotional expressiveness of the voice. Use selectively:
- 0.0: Neutral delivery
- 0.3-0.5: Natural expressiveness (recommended for most ads)
- 0.7+: Exaggerated emotion (use sparingly, can sound unnatural)

### Voice Library

Hundreds of pre-built voices categorized by:
- Gender, age, accent
- Style (conversational, authoritative, warm, energetic)
- Language specialization

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad-creative | Voiceover generation for video ads | Generates VO tracks for Runway/Remotion silent video |
| SceneBoard | Future voiceover for animated storyboards | Could pair with Kling video output |

**Cross-references:**
- `.agents/skills/ad-creative/references/generative-tools.md` — Tool comparison context
- Voice + video workflow: generate VO, then combine with `ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac output.mp4`
