---
model: "Cartesia Sonic"
type: "voice"
provider: "Cartesia"
status: "production"
lastUpdated: "2026-04-14"
lastUpdatedBy: "build-mode"
---

# Cartesia Sonic — Prompt Engineering Guide

## Overview

Ultra-low latency voice generation built for real-time applications. Cartesia Sonic achieves 40ms time-to-first-audio, making it the fastest production TTS available. Uniquely supports nonverbal expressiveness — laughter, breathing, sighs, and emotional inflections that make generated speech sound genuinely human.

**Best for:** Real-time voice generation, lowest latency, ads requiring natural emotional reactions.
**Key differentiator:** 40ms TTFA (fastest in class) and nonverbal expressiveness (laughter, breathing, emotional inflections).

---

## Access

| Field | Value |
|-------|-------|
| **API** | REST + WebSocket streaming |
| **Authentication** | API key |
| **Pricing** | Starts at $5/month; pay-as-you-go from $0.03/min |
| **Model ID** | `sonic-2024-12-12` (standard), Sonic Turbo (lower latency) |

**Model variants:**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| Sonic | 40ms TTFA | Very good | $0.03/min | Production voiceovers |
| Sonic Turbo | <40ms TTFA | Good | Similar | Real-time interactive applications |

---

## Constraints

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max text length | Per-request limits apply | Use streaming for long content |
| Supported languages | 15+ | English, Spanish, French, German, Portuguese, Italian, Chinese, Japanese, etc. |
| Voice cloning | No | Pre-built voice library |
| Output format | WAV, PCM, MP3 | Configurable per request |
| Streaming | Yes (WebSocket) | True real-time streaming for interactive use |
| Latency | ~40ms TTFA | Fastest in class — time to first audio byte |
| Nonverbal sounds | Yes | Laughter, breathing, sighs, emotional inflections |

---

## Prompt Structure

### Required Elements

1. **Text/script** — The words to be spoken, with optional emotion/nonverbal tags.
2. **Voice ID** — Selected from Cartesia's voice library.
3. **Model ID** — Sonic model version.

### Optional Elements

1. **Emotion tags** — Inline markers for emotional delivery (model interprets naturally).
2. **Speed control** — Adjust pacing.
3. **Output format** — WAV, PCM, or MP3.

### Script Writing for Nonverbal Expressiveness

Cartesia Sonic's unique capability is generating natural nonverbal sounds. Write scripts that invite these:

```
[Laughs] I know, right? That's exactly what I thought.
[Sighs] Another spreadsheet. Another wasted afternoon.
Hmm... okay, what if we tried it this way?
```

The model naturally produces breathing pauses, laughter, and emotional inflections when the script text implies them.

### Budget Strategy

- **Draft/iteration:** Standard Sonic is already fast and affordable at $0.03/min.
- **Production/final:** Same model — Sonic quality is consistent.
- **Cost optimization:** At $0.03/min, Cartesia is cheaper than ElevenLabs (~$0.12-0.30/1K chars) for most use cases. Use for high-volume generation.

---

## Best Practices

### Do

- Use Cartesia when latency matters — real-time previews, interactive demos, live applications.
- Write scripts that include natural conversational elements (hesitations, reactions) to leverage nonverbal expressiveness.
- Use WebSocket streaming for interactive applications where the user is waiting for audio.
- Consider Cartesia for ads that need genuine-sounding emotional reactions (laughter, surprise, satisfaction).

### Don't

- Don't use Cartesia for voice cloning — it doesn't support custom voices (use ElevenLabs instead).
- Don't write overly formal scripts — Cartesia shines with conversational, natural text.
- Don't ignore the nonverbal capability — it's the key differentiator. If your script is purely informational with no emotion, OpenAI TTS may be cheaper.

---

## Worked Examples

### Example 1: Conversational Ad Voiceover

**Context:** 15-second voiceover for a relatable, conversational ad.
**Mode/settings:** Sonic, standard voice

**Prompt:**
```
Okay so... I used to spend like two hours on reports every Monday. Two hours. Now? DataFlow does it while I'm still on my first coffee. Honestly? Life-changing.
```

**Annotations:**
- Conversational fillers ("Okay so...", "Honestly?") trigger natural speech patterns.
- Repetition ("Two hours.") delivered as emphasis with natural pause.
- The script reads like someone talking to a friend, which is Cartesia's sweet spot.

**Result quality notes:** Sonic naturally adds micro-pauses, breathing, and vocal fry that make this sound like a real person, not a TTS engine.

---

### Example 2: Emotional Product Reveal

**Context:** Voiceover for the "aha moment" in a product video.
**Mode/settings:** Sonic, expressive voice

**Prompt:**
```
Wait... is that — oh. Oh wow. It actually works. All my data, organized, in one place. I didn't think it could be this simple.
```

**Annotations:**
- Dashes and ellipses create natural hesitation and discovery moments.
- "Oh wow" triggers genuine-sounding surprise from the model.
- The progression from confusion to delight plays to Sonic's emotional range.

---

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Over-expressive delivery | Script has too many emotional cues packed together | Space out emotional beats; not every sentence needs a reaction |
| Flat delivery despite conversational script | Voice selection doesn't match the tone | Try different voices from the library; some are more expressive |
| Audio pops or artifacts | WebSocket connection issues during streaming | Use REST API for non-real-time generation; check connection stability |
| Unnatural laughter | Explicit "[Laughs]" tag forces it | Let laughter emerge from context ("I know, right?") rather than explicit tags |

---

## Model-Specific Features

### Nonverbal Expressiveness

Cartesia Sonic's signature feature. The model generates:
- **Laughter** — Natural chuckles, giggles, hearty laughs based on script context.
- **Breathing** — Realistic breath sounds between phrases.
- **Sighs** — Expressive exhales for frustration, relief, or contemplation.
- **Emotional inflections** — Surprise, delight, concern, confidence based on text content.

This makes Sonic ideal for ad voiceovers that need to sound human and relatable rather than polished and robotic.

### Ultra-Low Latency

40ms time-to-first-audio enables:
- Real-time ad preview during creative iteration — hear the voiceover as you write the script.
- Interactive demo applications where the user clicks and immediately hears the result.
- Live streaming applications with dynamic TTS.

---

## Integration Notes

| System | Usage | Notes |
|--------|-------|-------|
| Ad-creative | Real-time voiceover preview during script iteration | 40ms TTFA means instant feedback on script changes |
| SceneBoard | Future real-time preview for storyboard voiceovers | Could provide instant audio preview alongside image generation |

**Cross-references:**
- `.agents/skills/ad-creative/references/generative-tools.md` — Tool comparison context
- Cartesia Sonic docs: https://docs.cartesia.ai/build-with-cartesia/tts-models/latest
