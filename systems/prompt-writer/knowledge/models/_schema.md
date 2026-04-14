---
model: "[model-name]"
type: "[image|video|voice]"
provider: "[company-name]"
status: "production|experimental|deprecated"
lastUpdated: "[YYYY-MM-DD]"
lastUpdatedBy: "[who]"
---

# [Model Name] — Prompt Engineering Guide

<!--
  This file follows the PromptWriter model schema.
  To add a new model: copy this file to the appropriate directory
  (image/, video/, or voice/), fill in all sections, and register
  in _registry.md. Run `just validate` to verify.
-->

## Overview

<!-- What this model is, what it's best for, key differentiators from other models
     in the same category. 2-3 sentences. -->

**Best for:** [primary use cases]
**Key differentiator:** [what makes this model unique]

---

## Access

<!-- How to access the model: API endpoints, SDKs, authentication, pricing. -->

| Field | Value |
|-------|-------|
| **API** | [endpoint or SDK name] |
| **Authentication** | [API key, OAuth, etc.] |
| **Pricing** | [cost per unit — image, second, character, etc.] |
| **Model ID** | [API model identifier, if applicable] |

**Model variants (if any):**

| Variant | Speed | Quality | Cost | Best For |
|---------|-------|---------|------|----------|
| [variant-name] | [speed] | [quality] | [cost] | [use case] |

---

## Constraints

<!-- Hard limits the model enforces. Prompts that violate these will fail or
     produce degraded output. All limits MUST be documented. -->

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Max prompt length | [chars/tokens] | [any notes] |
| Max system instruction | [chars/tokens] | [if applicable — "N/A" if single-prompt model] |
| Max duration | [seconds] | [video/voice only — "N/A" for image] |
| Supported aspect ratios | [list] | [e.g., 1:1, 16:9, 9:16, 4:3] |
| Max resolution | [dimensions] | [e.g., 1080p, 4K, 2048x2048] |
| Max reference images | [count] | [0 if not supported] |
| Output format | [format] | [e.g., PNG, MP4, MP3, WAV] |
| Text rendering | [yes/no/partial] | [accuracy notes] |
| Native audio | [yes/no] | [video only — dialogue, SFX, ambient] |
| Negative prompt support | [yes/no] | [how to structure if supported] |

---

## Prompt Structure

<!-- How to structure a prompt for this specific model. What goes where,
     in what order, at what length. -->

### Required Elements

<!-- Elements that must be present in every prompt for good results. -->

1. **[element-name]** — [description, max length if applicable]
2. **[element-name]** — [description]

### Optional Elements

<!-- Elements that improve results but aren't strictly required. -->

1. **[element-name]** — [when to include, what it does]
2. **[element-name]** — [when to include]

### Prompt Template

<!-- A fill-in-the-blank template showing the recommended structure. -->

```
[system instruction or role setup]

[style anchor / visual identity preamble]

[subject description]

[environment / setting]

[camera / framing]

[lighting]

[composition]

[brand elements]

[mood / energy]

[terminal constraints — e.g., "No text in image."]
```

### Budget Strategy

<!-- How to balance quality vs cost with this model. When to use which tier. -->

- **Draft/iteration:** [which variant or setting to use]
- **Production/final:** [which variant or setting to use]
- **Cost optimization:** [tips for reducing cost without sacrificing quality]

---

## Best Practices

<!-- The 5-10 most important things to know for writing good prompts with this model.
     Format as Do / Don't pairs where possible. -->

### Do

- [specific actionable advice]
- [specific actionable advice]
- [specific actionable advice]

### Don't

- [specific thing to avoid, with reason]
- [specific thing to avoid, with reason]
- [specific thing to avoid, with reason]

---

## Worked Examples

<!-- At least 2 annotated, real-world prompt examples showing the structure in action.
     Include the prompt, annotations explaining each part, and why it works. -->

### Example 1: [descriptive name]

**Context:** [what we're generating and why]
**Mode/settings:** [any model-specific settings used]

**Prompt:**
```
[the actual prompt text]
```

**Annotations:**
- [line/section] — [why this works, what it does]
- [line/section] — [why this works, what it does]

**Result quality notes:** [what makes this prompt produce good output]

---

### Example 2: [descriptive name]

**Context:** [what we're generating and why]
**Mode/settings:** [any model-specific settings used]

**Prompt:**
```
[the actual prompt text]
```

**Annotations:**
- [line/section] — [why this works, what it does]

---

## Failure Modes

<!-- Common mistakes specific to this model. Generic failure modes are documented
     in domain.md; this section covers model-specific issues. -->

| Symptom | Cause | Fix |
|---------|-------|-----|
| [what goes wrong] | [why it happens] | [how to fix it] |
| [what goes wrong] | [why it happens] | [how to fix it] |
| [what goes wrong] | [why it happens] | [how to fix it] |

---

## Model-Specific Features

<!-- Unique capabilities this model has that others don't. Creative modes,
     special reference types, camera controls, voice cloning, etc. -->

### [Feature Name]

[Description of the feature, when to use it, how it affects prompting.]

---

## Integration Notes

<!-- How this model fits into the Adcelerate pipeline. Which systems call it,
     what APIs wrap it, any workflow-specific notes. -->

| System | Usage | Notes |
|--------|-------|-------|
| [system-name] | [how it uses this model] | [any integration specifics] |

**Cross-references:**
- [link to related API docs, if any]
- [link to related system knowledge, if any]
