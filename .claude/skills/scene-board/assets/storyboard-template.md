---
project: "{{project-name}}"
client: "{{client-name}}"
platform: "{{platform}}"
aspect_ratio: "{{aspect-ratio}}"
duration: "{{total-duration}}"
scenes: "{{scene-count}}"
date: "{{date}}"
status: "draft"
output_dir: "systems/scene-board/clients/{{client-slug}}/storyboards"
---

# {{project-name}}

{{subtitle — e.g., "UGC Video Ad - Storyboard & Nano Banana Pro Prompts"}}

---

## PROJECT SPECIFICATIONS

| | |
|---|---|
| **Duration** | {{total-duration}} |
| **Format** | {{aspect-ratio}} |
| **Style** | {{video-style}} |
| **Product** | {{product-name}} |
| **Model/Talent** | {{model-description}} |
| **Setting** | {{setting-description}} |
| **Audio** | {{audio-description}} |

---

## STORYBOARD

*On-Screen Text (Hook): {{hook-text}}*

| Seq | Scene | Visual Action & Composition | Audience Sees | Audio / Text | Visuals |
|-----|-------|----------------------------|---------------|--------------|---------|
{{FOR EACH SCENE:}}
| {{seq-number}} | {{scene-name}} ({{start-time}}-{{end-time}}) | {{visual-action-description}} Camera: {{camera-details}} | {{audience-perception}} | {{audio-text-content}} | [Visual placeholder] |
{{END FOR EACH}}

---

## NanoBanana Pro Prompts

{{FOR EACH SCENE:}}

### Scene {{seq-number}} — {{scene-name}}

**Render Method**: {{nanobanana-pro | remotion}}
**Creative Mode**: {{Faithful | Expressive | Vision | Image Asset}}

**System Instruction** ({{char-count}} chars):
```
{{system-instruction}}
```

**Prompt** ({{char-count}} chars):
```
{{prompt-text}}
```

> Remember: All NanoBanana Pro prompts must end with "No text in image." to prevent garbled text artifacts.

**Reference Images**:
1. {{reference-description-1}}
2. {{reference-description-2}}
3. {{reference-description-3}}

---

{{END FOR EACH}}

## PRODUCTION NOTES

| Category | Details |
|----------|---------|
| **Color Palette** | {{color-palette}} |
| **Lighting** | {{lighting-description}} |
| **Camera** | {{camera-style}} |
| **Text Style** | {{text-style}} |
| **Music** | {{music-description}} |

---

## B-ROLL SHOTS (can be used if needed)

| Seq | B-Roll Name | Use During | Audio / Text | Visuals |
|-----|------------|------------|--------------|---------|
{{FOR EACH B-ROLL:}}
| {{b-roll-seq}} | **{{b-roll-name}}** | {{use-during-scene}} {{contextual-quote}} Duration: {{b-roll-duration}} | {{b-roll-audio}} | [Visual placeholder] |
{{END FOR EACH}}

---

{{product-name}} | {{tagline}} | {{website}}
