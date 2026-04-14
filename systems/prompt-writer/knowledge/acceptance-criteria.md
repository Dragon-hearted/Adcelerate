---
system: "prompt-writer"
type: acceptance-criteria
version: 1
lastUpdated: "2026-04-14"
lastUpdatedBy: build-mode
---

# Acceptance Criteria — PromptWriter

## Hard Gates
_Binary pass/fail criteria. ALL must pass for output to be considered valid._

- [ ] Every model file in `knowledge/models/` follows the `_schema.md` frontmatter and section structure
- [ ] `_registry.md` table entries match actual files on disk — no orphans, no missing entries
- [ ] All character/token limits are documented in each model file's Constraints table
- [ ] `justfile` has `add-model`, `list-models`, `validate` recipes that execute without error
- [ ] `.claude/skills/prompt-writer/SKILL.md` exists with valid triggers and modes
- [ ] NanoBanana Pro model file contains all content from the original 835-line guide (restructured, not truncated)
- [ ] Kling model file contains all content from the original SceneBoard domain.md section (expanded, not truncated)
- [ ] `systems/scene-board/knowledge/nanobanana-pro-prompt-guide.md` is replaced with a pointer file
- [ ] Kling section removed from `systems/scene-board/knowledge/domain.md` and replaced with pointer
- [ ] `.claude/skills/scene-board/generate-storyboard.md` Stage 6 references prompt-writer paths
- [ ] `systems.yaml` has a valid `prompt-writer` entry with all required fields
- [ ] `knowledge/graph.yaml` has `prompt-writer` node with relationships
- [ ] TypeScript compiles with zero errors (`bunx tsc --noEmit`)
- [ ] Biome lint passes with zero errors (`bunx biome check`)
- [ ] `bun install` succeeds in `systems/prompt-writer/`

## Soft Criteria
_Quality guidance for human judgment at approval gates._

### Model Knowledge Quality
Model knowledge files should be **comprehensive enough to write quality prompts** — not just API docs, but actual prompt engineering guidance with worked examples, failure modes, and model-specific patterns. A Claude Code agent reading only the model file should be able to write a production-quality prompt.

### Schema Template Clarity
The `_schema.md` template should be **clear enough that a non-expert could add a new model** by following it. Every section should include placeholder text explaining what to write.

### Prompt Quality
The prompt-writer skill workflow should produce prompts that are **at least as good as** SceneBoard's current Stage 6 output. The skill should load model knowledge, apply visual direction, and validate constraints.

### Visual Direction Generality
Visual direction knowledge files (shot-types, composition, lighting) should be **model-agnostic** and useful for any image or video generation model. They should contain prompt-building vocabulary, not model-specific syntax.

### Migration Integrity
SceneBoard's pipeline should **work identically** after migration — only the knowledge source changes, not the behavior. All cross-references should resolve to real files.
