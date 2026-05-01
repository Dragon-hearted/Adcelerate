# Plan: PromptWriter System — Centralized AI Prompt Engineering Authority

## Task Description

Build a centralized PromptWriter system that consolidates all image generation, video generation, and voice generation prompt engineering knowledge from across the Adcelerate monorepo into a single authoritative source. The system includes per-model knowledge files following a standardized schema, a model registry with an extensibility mechanism for new models, a Claude Code skill for prompt generation, and a CLI for registry management. Existing prompt knowledge in SceneBoard (NanoBanana Pro guide, Kling prompts) and ad-creative (generative-tools.md) is migrated into the new system, with source files replaced by pointer references.

## Context

Prompt engineering knowledge for image and video generation is scattered across the monorepo — an 835-line NanoBanana Pro guide in SceneBoard's knowledge dir, Kling video prompts embedded in SceneBoard's domain.md, and a 638-line multi-model reference in ad-creative's skills. This fragmentation means each system maintains its own prompt knowledge, new systems must rediscover best practices, and updating model knowledge requires editing multiple files across different systems.

The PromptWriter system centralizes all of this into one authoritative source that every system (present and future) consults for prompt generation. It also provides a structured mechanism for adding new models as they roll out (Seedance 2.0, etc.).

## Objective

Build a new `prompt-writer` system via `/adcelerate-build` that:
1. Centralizes ALL image, video, and voice generation prompt knowledge into structured per-model files
2. Provides a Claude Code skill other systems invoke for prompt generation
3. Removes prompt knowledge from SceneBoard (NanoBanana guide + Kling prompts) and replaces with references
4. Includes a model registry with a schema template for adding new models
5. Registers as the 7th system in `systems.yaml` and `knowledge/graph.yaml`

## Problem Statement

SceneBoard owns NanoBanana Pro and Kling prompt knowledge. ImageEngine has WisGate API constraints. Ad-creative has broad model comparison data. No single system is responsible for prompt engineering, so:
- New systems (future) have no standard place to find prompt best practices
- Adding a new model (e.g., Seedance 2.0) has no structured process
- Cross-model patterns (visual direction, composition, lighting) are duplicated or incomplete
- SceneBoard's Stage 6 is tightly coupled to locally-stored prompt knowledge

## Solution Approach

Create a **knowledge-first system** — primarily a structured model knowledge database with a thin CLI and a Claude Code skill. The system follows the established `/adcelerate-build` 6-step pipeline (intake -> knowledge capture -> criteria -> scaffold -> validate -> register). After the system is built, a migration phase extracts prompt knowledge from SceneBoard and updates cross-references.

## Relevant Files

### Existing files to migrate FROM:
- `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` — 835-line NanoBanana Pro prompt guide (primary migration source)
- `systems/scene-board/knowledge/domain.md` (lines 303-335) — Kling video prompt guide section
- `.agents/skills/ad-creative/references/generative-tools.md` — 638-line multi-model reference (Flux, Ideogram, Veo, Kling, Runway, Sora 2, Seedance 2.0, Higgsfield, voice tools)
- `.claude/skills/scene-board/references/shot-types.md` — Camera angles, lighting moods, composition principles
- `ai_docs/wisgate-nanobanana-api.md` — WisGate API documentation (referenced, not moved)

### Existing files to MODIFY:
- `.claude/skills/scene-board/generate-storyboard.md` — Stage 6 must reference prompt-writer knowledge instead of local guide
- `.claude/skills/scene-board/SKILL.md` — Add prompt-writer to Related Skills
- `systems/scene-board/knowledge/domain.md` — Replace Kling section with pointer
- `systems/scene-board/knowledge/dependencies.md` — Add prompt-writer dependency
- `systems/scene-board/knowledge/index.md` — Update cross-references
- `.agents/skills/ad-creative/references/generative-tools.md` — Add header note pointing to prompt-writer
- `systems.yaml` — Add prompt-writer registration
- `knowledge/graph.yaml` — Add prompt-writer node and relationships
- `library.yaml` — Add prompt-writer skill entry

### New Files to create:
```
systems/prompt-writer/
  package.json
  justfile
  tsconfig.json
  biome.json
  knowledge/
    index.md
    scope.md
    domain.md
    acceptance-criteria.md
    dependencies.md
    history.md
    visual-direction/
      shot-types.md              # Migrated from scene-board skill references
      composition.md             # Extracted from NanoBanana guide + shot-types
      lighting.md                # Extracted from NanoBanana guide + shot-types
    models/
      _schema.md                 # Template for adding new models (the "settings" mechanism)
      _registry.md               # Master index of all registered models
      image/
        nanobanana-pro.md        # Migrated from scene-board/knowledge/nanobanana-pro-prompt-guide.md
        nanobanana-flash.md      # Extracted from image-engine domain + WisGate docs
        flux.md                  # Extracted from ad-creative generative-tools.md
        ideogram.md              # Extracted from ad-creative generative-tools.md
        dalle-3.md               # Extracted from ad-creative generative-tools.md
        midjourney.md            # Extracted from ad-creative generative-tools.md
        sdxl.md                  # Stub from ad-creative generative-tools.md
      video/
        kling.md                 # Migrated from scene-board/knowledge/domain.md + expanded
        veo.md                   # Extracted from ad-creative generative-tools.md
        runway-gen4.md           # Extracted from ad-creative generative-tools.md
        sora-2.md                # Extracted from ad-creative generative-tools.md
        seedance-2.md            # Extracted from ad-creative generative-tools.md
        higgsfield.md            # Extracted from ad-creative generative-tools.md
      voice/
        elevenlabs.md            # Extracted from ad-creative generative-tools.md
        openai-tts.md            # Extracted from ad-creative generative-tools.md
        cartesia-sonic.md        # Extracted from ad-creative generative-tools.md
  src/
    index.ts                     # System entry point (exports metadata)
    cli.ts                       # CLI: list models, validate registry, add new model stubs
    registry.ts                  # Model registry operations

.claude/skills/prompt-writer/
  SKILL.md                       # Skill entry point with triggers and modes
  write-prompt.md                # Core prompt writing workflow
  select-model.md                # Model selection advisory workflow
  references/
    model-selection-matrix.md    # Quick-reference comparison tables
    prompt-patterns.md           # Cross-model prompt patterns and anti-patterns
```

## Implementation Phases

### Phase 1: Foundation — Build via /adcelerate-build (Steps 1-4)
Run `/adcelerate-build` to create the prompt-writer system. This covers:
- **Step 1 (Intake)**: Define system name, description, scope, inputs/outputs
- **Step 2 (Knowledge Capture)**: Domain knowledge interview covering prompt engineering principles, model landscape, visual direction fundamentals, model update workflow
- **Step 3 (Criteria Formalization)**: Hard gates (model files follow schema, registry is consistent, character limits documented) and soft criteria (prompt quality, knowledge completeness)
- **Step 4 (Scaffolding)**: Scaffold `systems/prompt-writer/` from template, create the extended directory structure for models/ and visual-direction/

### Phase 2: Core Implementation — Knowledge Population
Create all model knowledge files:
- Migrate NanoBanana Pro guide (restructure from 835-line monolith into schema-compliant model file)
- Migrate Kling guide (expand from 33-line section into comprehensive model file)
- Extract model entries from generative-tools.md into individual model files
- Create visual-direction knowledge files (shot-types, composition, lighting)
- Create `_schema.md` template and `_registry.md` index
- Write the CLI source code (src/cli.ts, src/registry.ts)
- Update justfile with `add-model`, `list-models`, `validate` recipes

### Phase 3: Skill Creation
Create the `.claude/skills/prompt-writer/` skill:
- SKILL.md with triggers for "write prompt", "generate image prompt", "video prompt", model names
- write-prompt.md workflow: load model knowledge -> load visual direction -> compose prompt -> validate constraints
- select-model.md: decision tree for choosing the right model
- Reference files: model-selection-matrix.md, prompt-patterns.md

### Phase 4: Migration — Update SceneBoard
- Replace `nanobanana-pro-prompt-guide.md` with pointer file
- Remove Kling section from `domain.md`, replace with pointer
- Update `generate-storyboard.md` Stage 6 to reference prompt-writer knowledge
- Update SceneBoard's SKILL.md Related Skills
- Update `dependencies.md` and `index.md`
- Replace `shot-types.md` in scene-board skill references with pointer

### Phase 5: Validation & Registration (Steps 5-6)
- Validate all model files conform to schema
- Verify registry matches filesystem
- Confirm SceneBoard cross-references resolve
- Register in systems.yaml and knowledge/graph.yaml
- Commit and push

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You NEVER operate directly on the codebase. You use `Task` and `Task*` tools.
- Use `/adcelerate-build` as the primary build framework — it handles Steps 1-6 with approval gates.

### Team Members

- Builder
  - Name: builder-prompt-writer
  - Role: Primary builder — scaffolds system, creates model files, writes CLI code, creates skill, handles migration
  - Agent Type: builder (from `.claude/agents/team/builder.md`)
  - Resume: true

- Builder
  - Name: builder-model-files
  - Role: Parallel model file creator — extracts and structures individual model knowledge files from source material
  - Agent Type: builder (from `.claude/agents/team/builder.md`)
  - Resume: true

- Builder
  - Name: builder-migration
  - Role: Handles SceneBoard migration — updates cross-references, replaces files with pointers, updates generate-storyboard.md
  - Agent Type: builder (from `.claude/agents/team/builder.md`)
  - Resume: true

- Validator
  - Name: validator-prompt-writer
  - Role: Independent validation — verifies schema conformance, cross-reference integrity, SceneBoard still functional
  - Agent Type: validator (from `.claude/agents/team/validator.md`)
  - Resume: false

## Step by Step Tasks

### 1. Run Adcelerate Build — Intake & Knowledge Capture
- **Task ID**: build-intake
- **Depends On**: none
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Run `/adcelerate-build` for a new system named "prompt-writer"
- Complete Steps 1-2 (Intake + Knowledge Capture) with the following pre-populated context:
  - **Name**: PromptWriter
  - **Description**: Centralized prompt engineering knowledge system with per-model guides, visual direction references, and a model registry for AI image, video, and voice generation
  - **Purpose**: Single authority for prompt writing across all Adcelerate systems, replacing scattered prompt knowledge in SceneBoard and ad-creative
  - **Inputs**: generation-request, scene-context, style-anchor, model-name
  - **Outputs**: optimized-prompt, model-recommendation, prompt-validation
  - **Domain knowledge**: Prompt engineering principles (specificity > generality, model constraints, visual direction fundamentals, the Style Anchor pattern from SceneBoard, creative modes, reference image strategies, failure mode catalogs, the _schema.md extensibility mechanism for new models)

### 2. Build — Criteria Formalization & Scaffolding
- **Task ID**: build-scaffold
- **Depends On**: build-intake
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Complete `/adcelerate-build` Steps 3-4 (Criteria Formalization + Scaffolding)
- Hard gates should include:
  - Every model file follows `_schema.md` structure
  - `_registry.md` matches files on disk
  - All character/token limits documented per model
  - `justfile` has `add-model`, `list-models`, `validate` recipes
  - Skill SKILL.md has valid triggers and modes
- Scaffold the extended directory structure: `knowledge/models/{image,video,voice}/`, `knowledge/visual-direction/`, `src/`

### 3. Create Model Schema Template & Registry
- **Task ID**: create-schema
- **Depends On**: build-scaffold
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Create `knowledge/models/_schema.md` with the standardized model file template (frontmatter: model, type, provider, status, lastUpdated; sections: Overview, Access, Constraints table, Prompt Structure, Best Practices, Worked Examples, Failure Modes, Model-Specific Features, Integration Notes)
- Create `knowledge/models/_registry.md` as the master model index table

### 4a. Create Image Model Files
- **Task ID**: create-image-models
- **Depends On**: create-schema
- **Assigned To**: builder-model-files
- **Agent Type**: builder
- **Parallel**: true (with 4b, 4c, 4d)
- Migrate NanoBanana Pro guide from `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` -> `knowledge/models/image/nanobanana-pro.md` (restructure to follow schema; extract visual-direction sections to Phase 4d files)
- Create `nanobanana-flash.md` from image-engine domain knowledge
- Create `flux.md`, `ideogram.md`, `dalle-3.md`, `midjourney.md`, `sdxl.md` extracted from `.agents/skills/ad-creative/references/generative-tools.md`

### 4b. Create Video Model Files
- **Task ID**: create-video-models
- **Depends On**: create-schema
- **Assigned To**: builder-model-files
- **Agent Type**: builder
- **Parallel**: true (with 4a, 4c, 4d)
- Migrate Kling guide from `systems/scene-board/knowledge/domain.md` lines 303-335 -> `knowledge/models/video/kling.md` (expand to full schema)
- Create `veo.md`, `runway-gen4.md`, `sora-2.md`, `seedance-2.md`, `higgsfield.md` extracted from `.agents/skills/ad-creative/references/generative-tools.md`

### 4c. Create Voice Model Files
- **Task ID**: create-voice-models
- **Depends On**: create-schema
- **Assigned To**: builder-model-files
- **Agent Type**: builder
- **Parallel**: true (with 4a, 4b, 4d)
- Create `elevenlabs.md`, `openai-tts.md`, `cartesia-sonic.md` extracted from `.agents/skills/ad-creative/references/generative-tools.md`

### 4d. Create Visual Direction Knowledge
- **Task ID**: create-visual-direction
- **Depends On**: create-schema
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: true (with 4a, 4b, 4c)
- Migrate `.claude/skills/scene-board/references/shot-types.md` -> `knowledge/visual-direction/shot-types.md`
- Extract composition principles into `knowledge/visual-direction/composition.md`
- Extract lighting knowledge into `knowledge/visual-direction/lighting.md`
- Source material: NanoBanana Pro guide sections 6-7, shot-types.md

### 5. Write CLI Source Code
- **Task ID**: write-cli
- **Depends On**: create-schema
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Write `src/index.ts` — system metadata export
- Write `src/cli.ts` — CLI entry point with commands: `list`, `validate`, `add <model-name> --type <image|video|voice>`
- Write `src/registry.ts` — reads `_registry.md`, validates model files exist and follow schema, scaffolds new model stubs from `_schema.md`
- Update `justfile` with recipes: `add-model name type`, `list-models`, `validate`
- Update `package.json` with bin entry

### 6. Create Prompt Writer Skill
- **Task ID**: create-skill
- **Depends On**: create-image-models, create-video-models, create-voice-models, create-visual-direction
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Create `.claude/skills/prompt-writer/SKILL.md` — triggers: "write a prompt", "generate image/video prompt", "optimize prompt", model names; modes: [WP] Write Prompt, [SM] Select Model, [LP] List Models
- Create `.claude/skills/prompt-writer/write-prompt.md` — workflow: gather context -> load model knowledge -> load visual direction -> compose prompt -> validate constraints -> present with annotations
- Create `.claude/skills/prompt-writer/select-model.md` — decision tree: generation type + requirements + budget -> model recommendation
- Create `.claude/skills/prompt-writer/references/model-selection-matrix.md` — comparison tables
- Create `.claude/skills/prompt-writer/references/prompt-patterns.md` — cross-model patterns

### 7. Migrate SceneBoard
- **Task ID**: migrate-sceneboard
- **Depends On**: create-skill, create-image-models, create-video-models
- **Assigned To**: builder-migration
- **Agent Type**: builder
- **Parallel**: false
- Replace `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` with pointer file referencing `systems/prompt-writer/knowledge/models/image/nanobanana-pro.md`
- Update `systems/scene-board/knowledge/domain.md`: remove Kling prompt section (lines 303-335), replace with pointer to `systems/prompt-writer/knowledge/models/video/kling.md`
- Update `.claude/skills/scene-board/generate-storyboard.md` Stage 6: change knowledge source references from local guide to prompt-writer paths. Specifically update:
  - Line 629 reference to `nanobanana-pro-prompt-guide.md` Section 8 -> `systems/prompt-writer/knowledge/models/image/nanobanana-pro.md`
  - The NanoBanana Pro Constraints section can reference prompt-writer
- Update `.claude/skills/scene-board/SKILL.md`: add `prompt-writer` to Related Skills section
- Update `systems/scene-board/knowledge/dependencies.md`: add prompt-writer as a runtime dependency
- Update `systems/scene-board/knowledge/index.md`: fix cross-references
- Replace `.claude/skills/scene-board/references/shot-types.md` with pointer to `systems/prompt-writer/knowledge/visual-direction/shot-types.md`
- Add header note to `.agents/skills/ad-creative/references/generative-tools.md` pointing to prompt-writer for detailed per-model prompt guides

### 8. Register & Update Platform Config
- **Task ID**: register-system
- **Depends On**: migrate-sceneboard, write-cli
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Add `prompt-writer` entry to `systems.yaml` with all required fields (name, path, status, description, task_types, knowledge_path, input/output types, domain_tags, entry_point, justfile, stages)
- Add `prompt-writer` node to `knowledge/graph.yaml` with dependencies (bun runtime) and relationships (scene-board pipeline, image-engine shared-dependency, pinboard shared-dependency)
- Update `systemCount` in graph.yaml metadata to 7
- Update `library.yaml` if it contains skill/system entries

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: register-system
- **Assigned To**: validator-prompt-writer
- **Agent Type**: validator
- **Parallel**: false
- Verify every model file in `knowledge/models/` follows the `_schema.md` structure
- Verify `_registry.md` table matches actual files on disk (no orphans, no missing)
- Verify SceneBoard cross-references resolve (pointer files point to real files)
- Verify `generate-storyboard.md` Stage 6 instructions are complete and reference prompt-writer knowledge
- Verify `systems.yaml` entry is valid YAML with all required fields
- Verify `knowledge/graph.yaml` is valid YAML with updated systemCount
- Run `bun install` in `systems/prompt-writer/` to verify package.json
- Run `bun check` to verify TypeScript compiles
- Check no broken cross-references across the monorepo
- Produce validation report

### 10. Commit & Push
- **Task ID**: commit-push
- **Depends On**: validate-all
- **Assigned To**: builder-prompt-writer
- **Agent Type**: builder
- **Parallel**: false
- Stage all new and modified files
- Commit with descriptive message: "Add PromptWriter system: centralized prompt engineering knowledge for all AI generation models"
- Push to GitHub private repo

## Acceptance Criteria

### Hard Gates
- [ ] `systems/prompt-writer/` exists with complete directory structure
- [ ] Every model file follows `_schema.md` frontmatter and section structure
- [ ] `_registry.md` has entries for all 17+ model files and all point to existing files
- [ ] NanoBanana Pro model file contains all content from the original 835-line guide (restructured, not truncated)
- [ ] Kling model file contains all content from the original domain.md section (expanded, not truncated)
- [ ] `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` is replaced with a pointer file
- [ ] Kling section removed from `systems/scene-board/knowledge/domain.md` and replaced with pointer
- [ ] `.claude/skills/scene-board/generate-storyboard.md` Stage 6 references prompt-writer paths
- [ ] `.claude/skills/prompt-writer/SKILL.md` exists with valid triggers
- [ ] `systems.yaml` has a valid `prompt-writer` entry
- [ ] `knowledge/graph.yaml` has `prompt-writer` node with relationships
- [ ] `justfile` has `add-model`, `list-models`, `validate` recipes
- [ ] `bun install` succeeds in `systems/prompt-writer/`
- [ ] TypeScript compiles without errors

### Soft Criteria
- Model knowledge files are **comprehensive enough to write quality prompts** — not just API docs, but actual prompt engineering guidance with worked examples
- The `_schema.md` template is **clear enough that a non-expert could add a new model** by following it
- The prompt-writer skill workflow produces prompts that are **at least as good as** SceneBoard's current Stage 6 output
- Visual direction knowledge is **model-agnostic** and useful for any image/video generation model
- SceneBoard's pipeline **works identically** after migration — only the knowledge source changes, not the behavior

## Validation Commands

- `cd systems/prompt-writer && bun install` — Verify dependencies install
- `cd systems/prompt-writer && bun check` — Verify TypeScript compiles
- `ls systems/prompt-writer/knowledge/models/{image,video,voice}/` — Verify model files exist
- `cat systems/prompt-writer/knowledge/models/_registry.md` — Verify registry is populated
- `cat systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` — Verify replaced with pointer
- `grep -c "prompt-writer" .claude/skills/scene-board/generate-storyboard.md` — Verify Stage 6 references updated
- `grep -c "prompt-writer" systems.yaml` — Verify system registered
- `grep -c "prompt-writer" knowledge/graph.yaml` — Verify graph updated

## Notes

- The `/adcelerate-build` workflow handles Steps 1-6 with approval gates. The team lead should run the build skill and use team agents for the parallelizable content creation tasks (4a-4d).
- Voice models are included even though the user mentioned "image and video" — the existing generative-tools.md already covers voice, and it makes the system complete. Include them but don't over-invest.
- The `generative-tools.md` in ad-creative is NOT deleted — it serves a different purpose (tool selection/comparison for ad campaigns). A header note is added pointing to prompt-writer for detailed prompt engineering.
- WisGate API docs (`ai_docs/wisgate-nanobanana-api.md`) and ImageEngine domain knowledge stay in place — they are API integration docs, not prompt engineering knowledge. Model files cross-reference them.
- Client-specific knowledge (e.g., Vindof's visual-direction.md) stays in SceneBoard's client directories — that's brand knowledge, not model knowledge.
