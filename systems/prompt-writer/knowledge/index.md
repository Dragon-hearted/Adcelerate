---
system: "prompt-writer"
type: index
version: 1
lastUpdated: "2026-04-14"
lastUpdatedBy: build-mode
---

# PromptWriter

## Summary
Centralized prompt engineering knowledge system with per-model guides, visual direction references, and a model registry for AI image, video, and voice generation. PromptWriter is the single authority that every Adcelerate system consults when writing generation prompts — replacing scattered prompt knowledge previously maintained in SceneBoard and ad-creative.

## Entry Points
- **CLI**: `src/cli.ts` — Registry management with `list`, `validate`, `add` commands
- **Programmatic API**: `src/index.ts` — Exported system metadata and registry operations
- **Claude Code Skill**: `.claude/skills/prompt-writer/SKILL.md` — Prompt generation and model selection

## Stage Definitions

### write-prompt
Compose an optimized, model-specific prompt from knowledge files and context.
- **Input**: generation-request, scene-context, style-anchor, model-name
- **Process**: Load model knowledge -> load visual direction -> compose prompt -> validate constraints
- **Output**: optimized-prompt with annotations and constraint validation

### select-model
Recommend the best model for a generation request.
- **Input**: generation type (image/video/voice), requirements, budget
- **Process**: Evaluate against model-selection-matrix, check capabilities and constraints
- **Output**: model-recommendation with rationale

### list-models
Display all registered models.
- **Input**: Optional type filter (image/video/voice)
- **Process**: Read _registry.md, display formatted table
- **Output**: Model summary table

### validate
Check registry and model file integrity.
- **Input**: None
- **Process**: Compare _registry.md against filesystem, check schema conformance
- **Output**: Validation report (pass/fail with details)

### add-model
Scaffold a new model file from the schema template.
- **Input**: model-name, model-type (image/video/voice)
- **Process**: Copy _schema.md to appropriate directory, set frontmatter
- **Output**: New model stub file ready to be populated

## Knowledge Files
- [Scope](scope.md) — System boundaries, inputs/outputs, target users
- [Domain Knowledge](domain.md) — Prompt engineering fundamentals, visual direction, model patterns
- [Acceptance Criteria](acceptance-criteria.md) — Hard gates and soft quality criteria
- [Dependencies](dependencies.md) — Runtime, build, and optional dependencies
- [History](history.md) — Build and maintenance history

## Knowledge Subdirectories
- `models/` — Per-model prompt engineering guides, schema template, registry
  - `models/_schema.md` — Template for new model files
  - `models/_registry.md` — Master index of all registered models
  - `models/image/` — Image generation models (NanoBanana Pro, Flash, Flux, Ideogram, DALL-E 3, Midjourney, SDXL)
  - `models/video/` — Video generation models (Kling, Veo, Runway Gen-4, Sora 2, Seedance 2.0, Higgsfield)
  - `models/voice/` — Voice generation models (ElevenLabs, OpenAI TTS, Cartesia Sonic)
- `visual-direction/` — Model-agnostic visual building blocks
  - `visual-direction/shot-types.md` — Camera angles, framing, lens feel
  - `visual-direction/composition.md` — Spatial rules, depth, element placement
  - `visual-direction/lighting.md` — Light sources, color temperature, mood

## Cross-References
- **SceneBoard** — Primary consumer. Stage 6 references prompt-writer model knowledge. NanoBanana Pro guide migrated from here.
- **ImageEngine** — Shared dependency. Model constraints inform API request parameters.
- **Pinboard** — Future consumer for image generation prompts.
- **ad-creative skill** — Supplementary reference. generative-tools.md provides tool comparison; prompt-writer provides deep prompt engineering.
- `.claude/skills/scene-board/references/shot-types.md` — Replaced with pointer to prompt-writer visual-direction.
