---
model: "OpenAI TTS"
type: "voice"
provider: "OpenAI"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "build-mode"
---

# OpenAI TTS — Prompt Engineering Guide

## Overview

Simple, affordable text-to-speech built into the OpenAI API. Uses the same SDK as GPT and DALL-E, making it the easiest voice tool to integrate for teams already in the OpenAI ecosystem. No voice cloning, but solid quality at very low cost.

**Best for:** Quick voiceovers, cost-effective high-volume narration, simple integration.
**Key differentiator:** Lowest cost per minute of any production-quality TTS, same SDK as the rest of the OpenAI stack.

---

## Access

| Field | Value |
|-------|-------|
| **API** | OpenAI API (same SDK as GPT/DALL-E) |
| **Authentication** | OpenAI API key |
| **Pricing** | $15/million chars (standard), $30/million chars (HD); ~$0.015/min with gpt-4o-mini-tts |
| **Model ID** | `tts-1` (standard), `tts-1-hd` (HD), `gpt-4o-mini-tts` (newest, cheapest) |

**Model variants:**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| tts-1 | Fast | Good | $15/M chars | High-volume, fast turnaround |
| tts-1-hd | Standard | Better | $30/M chars | Final production voiceovers |
| gpt-4o-mini-tts | Fast | Good | ~$0.015/min | Cost-optimized production |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max text length | 4,096 chars per request | Split longer scripts into chunks |
| Supported languages | 13+ | English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, etc. |
| Voice cloning | No | 13 built-in voices only, no custom cloning |
| Output format | MP3, OPUS, AAC, FLAC, WAV, PCM | Configurable per request |
| Streaming | Yes | Real-time streaming supported |
| Latency | ~300ms | Time to first audio byte |
| Built-in voices | 13 | alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, + more |

---

## Prompt Structure

### Required Elements

1. **Text/script** — The words to be spoken. Clean, naturally punctuated text.
2. **Voice** — One of the 13 built-in voices (e.g., `alloy`, `nova`, `onyx`).
3. **Model** — Which TTS model to use (`tts-1`, `tts-1-hd`, or `gpt-4o-mini-tts`).

### Optional Elements

1. **Response format** — Output audio format (mp3, opus, aac, flac, wav, pcm).
2. **Speed** (0.25-4.0) — Playback speed multiplier. Default: 1.0.

### Script Writing Best Practices

```
[Keep sentences short and natural]
[Use commas and periods for pacing]
[Spell out numbers: "fourteen" not "14"]
[Avoid abbreviations: "versus" not "vs."]
```

### Budget Strategy

- **Draft/iteration:** Use `tts-1` for rapid previews at lowest latency.
- **Production/final:** Use `tts-1-hd` for noticeable quality improvement.
- **High volume:** Use `gpt-4o-mini-tts` for best cost-per-minute at good quality.
- **Cost optimization:** At $0.015/min, OpenAI TTS is ~10x cheaper than ElevenLabs for bulk narration.

---

## Best Practices

### Do

- Test all 13 voices to find the best match for your brand tone before committing.
- Use `tts-1-hd` for client-facing deliverables and `tts-1` for internal drafts.
- Write scripts in natural spoken English — short sentences, conversational rhythm.
- Use this as the default for high-volume, cost-sensitive voiceover needs.

### Don't

- Don't expect voice cloning — if you need a specific brand voice, use ElevenLabs instead.
- Don't use the speed parameter for anything beyond 1.5x or below 0.75x — quality degrades.
- Don't include SSML tags — OpenAI TTS doesn't support them (use punctuation for pacing instead).
- Don't use this for emotional, expressive ad voiceovers — it's more neutral/consistent than ElevenLabs.

---

## Worked Examples

### Example 1: Product Demo Narration

**Context:** Voiceover for a 30-second product walkthrough video.
**Mode/settings:** tts-1-hd, voice: nova, speed: 1.0

**Prompt:**
```
Here's how DataFlow works. Connect your data sources in one click. Choose from fifty dashboard templates. And your reports update automatically, every single day.
```

**Annotations:**
- Four short, clear sentences matching the demo's visual beats.
- "fifty" spelled out for natural pronunciation.
- "every single day" uses emphasis through word choice rather than formatting.

**Result quality notes:** Nova voice delivers a clean, professional narration. No expressiveness or emotion — just clear and reliable.

---

### Example 2: Batch Ad Variations

**Context:** Generating 20 voiceover variations for A/B testing different ad scripts.
**Mode/settings:** gpt-4o-mini-tts, voice: alloy, speed: 1.0

**Prompt (variation 3 of 20):**
```
Tired of spreadsheet chaos? DataFlow organizes everything — so you can focus on what matters.
```

**Annotations:**
- Short (under 15 seconds when spoken) to fit standard ad formats.
- Question opening grabs attention.
- Using gpt-4o-mini-tts for cost efficiency when generating 20 variations.

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Flat, uninspired delivery | OpenAI TTS is inherently more neutral | Switch to ElevenLabs for expressive ads; keep OpenAI for informational content |
| Mispronounced words | Unusual proper nouns or technical terms | Spell phonetically or add context words nearby |
| Pacing feels rushed or slow | Script rhythm doesn't match natural speech | Rewrite with shorter sentences and more punctuation pauses |
| Audio quality sounds compressed | Using tts-1 instead of tts-1-hd | Upgrade to tts-1-hd for production deliverables |

---

## Model-Specific Features

### Voice Selection Guide

| Voice | Character | Best For |
|-------|-----------|----------|
| alloy | Neutral, balanced | General narration, corporate |
| echo | Warm, resonant | Storytelling, brand narratives |
| fable | Animated, British-accented | Creative, literary content |
| nova | Clear, professional | Product demos, tutorials |
| onyx | Deep, authoritative | Premium brands, serious tone |
| shimmer | Bright, upbeat | Consumer products, friendly tone |

### Same-SDK Integration

If your project already uses the OpenAI SDK for GPT or DALL-E, TTS requires zero additional setup — same API key, same SDK, same billing.

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad-creative | Cost-effective bulk voiceover generation | Best for high-volume A/B test variations |
| SceneBoard | Draft voiceovers during storyboard iteration | Use for previews, upgrade to ElevenLabs for finals |

**Cross-references:**
- `.agents/skills/ad-creative/references/generative-tools.md` — Tool comparison context
- OpenAI TTS docs: https://platform.openai.com/docs/guides/text-to-speech
