# Plan: Adcelerate v1 Platform Upgrade

## Task Description
Upgrade Adcelerate from v0 (collection of independent tools) to v1 (unified orchestration platform) based on the PRD and Architecture Decision Document. This implements the MVP feature set: Knowledge Architecture, System Registry, Build Mode, Execute Mode, Validation Engine, Diagnosis workflow, and existing system migration — all on a new branch to protect the existing codebase.

## Objective
When this plan is complete, Adcelerate will have:
- A central knowledge graph and per-system knowledge directory structure
- A `systems.yaml` registry for system discovery and routing
- Base scaffolding templates for new system creation
- Three core Adcelerate skills: `adcelerate-build`, `adcelerate-execute`, `adcelerate-diagnose`
- Three specialist agents: `adcelerate-scaffolder`, `adcelerate-validator`, `adcelerate-formalizer`
- Pinboard and autoCaption migrated in-place (registered + knowledge bridge)
- v1 justfile recipes for system management
- v1 event emissions in existing hooks
- All work on a `feature/adcelerate-v1` branch — master untouched

## Problem Statement
Domain knowledge evaporates between AI agent sessions, forcing the engineer into open-loop workflows where every build cycle requires re-communicating standards, re-prompting through errors, and manually operating built tools. The v0 monorepo has independent tools but no unifying orchestration, knowledge persistence, or self-validation capabilities.

## Solution Approach
Follow the Architecture Decision Document's 9-step implementation sequence to incrementally build v1 infrastructure. Each phase adds a layer that subsequent phases depend on. The approach is brownfield-respectful — extending existing patterns (justfile, submodule isolation, hooks, skills) rather than replacing them. All work happens on a feature branch.

Source documents:
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Claude Code docs: `ai_docs/` (sub-agents, skills, hooks, agent teams)
- Existing project docs: `docs/`

## Relevant Files

### Existing Files (Read/Modify)
- `justfile` — Add v1 system management recipes (systems-list, systems-validate, systems-health, build-new, build-migrate, run, diagnose)
- `.claude/hooks/send_event.py` — Add v1 event emissions (`adcelerate.*` prefix)
- `.gitmodules` — Reference for submodule paths
- `library.yaml` — Reference for existing catalog pattern (mirrors `systems.yaml` design)
- `docs/project-overview.md` — Reference for existing architecture
- `docs/architecture.md` — Reference for existing v0 architecture
- `docs/development-guide.md` — Reference for development conventions
- `docs/integration-architecture.md` — Reference for hook/session integration
- `_bmad-output/planning-artifacts/prd.md` — PRD (source of truth for requirements)
- `_bmad-output/planning-artifacts/architecture.md` — Architecture decisions (source of truth for design)
- `ai_docs/claude-code-skills.md` — Skill creation patterns
- `ai_docs/claude-code-sub-agents.md` — Sub-agent creation patterns
- `ai_docs/claude-code-hooks.md` — Hook event patterns
- `ai_docs/claude-code-agent-teams.md` — Agent team patterns

### New Files
- `systems.yaml` — System registry (root level, alongside `library.yaml`)
- `knowledge/graph.yaml` — Central knowledge graph
- `knowledge/patterns/.gitkeep` — Cross-system failure patterns directory
- `templates/system/package.json` — Base template package.json (Bun + TS defaults)
- `templates/system/tsconfig.json` — Base template tsconfig (strict, ESM)
- `templates/system/biome.json` — Base template linting/formatting
- `templates/system/justfile` — Base template justfile (dev, test, build recipes)
- `templates/system/knowledge/index.md` — Template knowledge index with frontmatter
- `templates/system/knowledge/domain.md` — Template domain knowledge
- `templates/system/knowledge/acceptance-criteria.md` — Template acceptance criteria (hard gates + soft criteria)
- `templates/system/knowledge/dependencies.md` — Template dependencies
- `templates/system/knowledge/history.md` — Template build/fix history
- `.claude/skills/adcelerate-build/SKILL.md` — Build Mode skill metadata
- `.claude/skills/adcelerate-build/workflow.md` — Build pipeline orchestration
- `.claude/skills/adcelerate-build/steps/step-01-intake.md` — Brief intake & scope
- `.claude/skills/adcelerate-build/steps/step-02-knowledge.md` — Domain knowledge capture
- `.claude/skills/adcelerate-build/steps/step-03-criteria.md` — Acceptance criteria formalization
- `.claude/skills/adcelerate-build/steps/step-04-scaffold.md` — Sub-agent: scaffolding
- `.claude/skills/adcelerate-build/steps/step-05-validate.md` — Sub-agent: validation
- `.claude/skills/adcelerate-build/steps/step-06-register.md` — Registration in systems.yaml
- `.claude/skills/adcelerate-build/prompts/` — Elicitation prompt templates
- `.claude/skills/adcelerate-execute/SKILL.md` — Execute Mode skill metadata
- `.claude/skills/adcelerate-execute/workflow.md` — Task matching → routing → staged delivery
- `.claude/skills/adcelerate-diagnose/SKILL.md` — Diagnosis skill metadata
- `.claude/skills/adcelerate-diagnose/workflow.md` — Inspection → root cause → fix proposal
- `.claude/agents/adcelerate-scaffolder.md` — Scaffolding specialist agent
- `.claude/agents/adcelerate-validator.md` — Independent validation reviewer agent
- `.claude/agents/adcelerate-formalizer.md` — Knowledge formalization agent
- `autoCaption/knowledge/index.md` — autoCaption system summary
- `autoCaption/knowledge/domain.md` — Captioning domain expertise
- `autoCaption/knowledge/acceptance-criteria.md` — autoCaption quality gates
- `autoCaption/knowledge/dependencies.md` — Whisper.cpp, FFmpeg, Remotion deps
- `autoCaption/knowledge/history.md` — autoCaption build/fix history
- `pinboard/knowledge/index.md` — Pinboard system summary
- `pinboard/knowledge/domain.md` — Pinboard domain expertise
- `pinboard/knowledge/acceptance-criteria.md` — Pinboard quality gates
- `pinboard/knowledge/dependencies.md` — Pinboard deps
- `pinboard/knowledge/history.md` — Pinboard build/fix history

## Implementation Phases
### Phase 1: Foundation
- Commit current changes on master, create feature branch
- Create knowledge directory structure and graph.yaml
- Create systems.yaml registry with existing systems pre-registered
- Create base scaffolding templates

### Phase 2: Core Implementation
- Build the adcelerate-build skill with 6-step knowledge capture workflow
- Build the adcelerate-execute skill with routing logic
- Build the adcelerate-diagnose skill
- Create the three specialist agents (scaffolder, validator, formalizer)

### Phase 3: Integration & Polish
- Migrate Pinboard and autoCaption in-place (knowledge directories + registry entries + graph references)
- Add v1 justfile recipes
- Add v1 event emissions to hooks
- Final validation across all components

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Creates the foundational infrastructure — knowledge directory, systems.yaml, templates, and feature branch setup
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-skills
  - Role: Creates all three Adcelerate skills (adcelerate-build, adcelerate-execute, adcelerate-diagnose) with their workflows and step files
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-agents
  - Role: Creates the three specialist agents (adcelerate-scaffolder, adcelerate-validator, adcelerate-formalizer)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-migration
  - Role: Migrates Pinboard and autoCaption in-place — creates knowledge directories, populates knowledge files, updates systems.yaml and graph.yaml
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-integration
  - Role: Adds v1 justfile recipes and v1 event emissions to hooks
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: validator-final
  - Role: Read-only validation of the entire v1 implementation against architecture document and PRD requirements
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 0. Git Prep — Commit & Branch
- **Task ID**: git-prep
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Commit all current uncommitted changes on `master` with a descriptive message (e.g., "Save working state before v1 upgrade")
- Create and checkout a new branch `feature/adcelerate-v1` from master
- Verify the branch is clean and ready for v1 work

### 1. Knowledge Directory & Graph
- **Task ID**: knowledge-foundation
- **Depends On**: git-prep
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Create `knowledge/` directory at monorepo root
- Create `knowledge/graph.yaml` with the schema from the architecture doc:
  - `metadata` section with `lastUpdated`, `systemCount`
  - `systems` section (empty initially, will be populated during migration)
  - `relationships` section (empty initially)
  - `failure_patterns` section (empty initially)
- Create `knowledge/patterns/.gitkeep`
- All YAML must follow the architecture doc's flat structure (no deep nesting, optimized for agent scanning per NFR13)

### 2. Systems Registry
- **Task ID**: systems-registry
- **Depends On**: git-prep
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true (can run parallel with knowledge-foundation after git-prep)
- Create `systems.yaml` at monorepo root following the architecture doc's schema:
  - Include field structure: `name`, `path`, `status`, `description`, `task_types`, `knowledge_path`, `input_types`, `output_types`, `domain_tags`, `entry_point`, `justfile`, `stages`, `registered_at`, `last_validated`
  - Pre-register `autocaption` and `pinboard` with `status: degraded` (not yet fully migrated)
  - Include comments documenting the schema for agent readability
- Validate YAML is well-formed

### 3. Base Scaffolding Templates
- **Task ID**: scaffolding-templates
- **Depends On**: git-prep
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: true (can run parallel with knowledge-foundation and systems-registry)
- Create `templates/system/` directory with all template files per the architecture doc:
  - `package.json` — Bun + TypeScript defaults, ESM (`"type": "module"`), Vitest for testing, Biome for linting
  - `tsconfig.json` — Strict mode, ESM, Node16 module resolution, project defaults matching autoCaption patterns
  - `biome.json` — Linting/formatting config matching existing project conventions
  - `justfile` — Standard recipes: `dev`, `test`, `build`, `lint`, `check`
  - `knowledge/index.md` — Template with proper frontmatter schema (`system`, `type: index`, `version`, `lastUpdated`, `lastUpdatedBy`)
  - `knowledge/domain.md` — Template with frontmatter + placeholder sections
  - `knowledge/acceptance-criteria.md` — Template with Hard Gates (checklist) + Soft Criteria (prose) sections
  - `knowledge/dependencies.md` — Template with frontmatter + sections for runtime, build, optional deps
  - `knowledge/history.md` — Template with frontmatter + changelog format
- All knowledge file frontmatter must match the architecture doc's schema exactly (fields: `system`, `type`, `version`, `lastUpdated`, `lastUpdatedBy`)

### 4. Adcelerate Build Skill
- **Task ID**: build-skill
- **Depends On**: scaffolding-templates
- **Assigned To**: builder-skills
- **Agent Type**: builder
- **Parallel**: false
- Read `ai_docs/claude-code-skills.md` and `ai_docs/claude-code-skills-and-slash-commands.md` for skill creation patterns
- Create `.claude/skills/adcelerate-build/SKILL.md` with:
  - Frontmatter: `name: adcelerate-build`, `description` matching Build Mode purpose, `invocation: user` (user-invocable only)
  - The skill orchestrates the entire Build Mode pipeline
- Create `.claude/skills/adcelerate-build/workflow.md` — Master workflow document defining the 6-step pipeline:
  1. Intake & scope
  2. Domain knowledge capture
  3. Acceptance criteria formalization
  4. Scaffolding (delegates to adcelerate-scaffolder agent)
  5. Validation (delegates to adcelerate-validator agent)
  6. Registration in systems.yaml
- Create step files in `.claude/skills/adcelerate-build/steps/`:
  - `step-01-intake.md` — Brief intake: what system to build, what it does, who it serves, scope boundaries
  - `step-02-knowledge.md` — Domain knowledge capture interview protocol: structured elicitation questions, progressive writes to knowledge dir, multiple passes (draw from BMAD elicitation patterns)
  - `step-03-criteria.md` — Acceptance criteria formalization: convert captured knowledge into hard gates (binary, checklist) + soft criteria (prose, quality signals). Engineer reviews before proceeding.
  - `step-04-scaffold.md` — Delegates to adcelerate-scaffolder agent: copies base template, adds system-specific files based on captured knowledge
  - `step-05-validate.md` — Runs tests, validates against acceptance criteria, delegates to adcelerate-validator agent for independent review
  - `step-06-register.md` — Registers system in systems.yaml, updates knowledge/graph.yaml with new system entry and cross-references
- Create `.claude/skills/adcelerate-build/prompts/` directory with elicitation prompt templates:
  - `domain-elicitation.md` — Questions for extracting domain expertise
  - `quality-elicitation.md` — Questions for defining quality standards
  - `criteria-elicitation.md` — Questions for formalizing acceptance criteria
- All skills must reference the architecture doc for schemas and conventions
- Skills must enforce the engineer-as-CEO principle: human approval gates at every stage transition

### 5. Adcelerate Execute Skill
- **Task ID**: execute-skill
- **Depends On**: systems-registry
- **Assigned To**: builder-skills
- **Agent Type**: builder
- **Parallel**: false (depends on systems-registry being defined, but can start after that)
- Read `ai_docs/claude-code-skills.md` for skill creation patterns
- Create `.claude/skills/adcelerate-execute/SKILL.md` with:
  - Frontmatter: `name: adcelerate-execute`, `description` matching Execute Mode purpose, `invocation: user`
- Create `.claude/skills/adcelerate-execute/workflow.md` defining:
  - Task receipt: natural language task from engineer (FR14)
  - System matching: reads `systems.yaml`, tries structured matching on `task_types`/`input_types`/`output_types`/`domain_tags` first, falls back to NL matching on `description` (Decision 2b)
  - Ambiguity handling: surfaces ambiguous matches to engineer for confirmation
  - Routing: delegates execution to the matched system
  - Staged delivery: reads system's stage definitions from systems.yaml, manages approval gates between stages (FR19-FR20)
  - Validation: hard gate check inline, then delegates to adcelerate-validator agent for soft criteria (Decision 4b)
  - Error handling: tiered — inline recovery (3 retries), diagnostic escalation, system-level diagnosis handoff (Decision 4c)
  - Final delivery: output + validation report presented to engineer for approval

### 6. Adcelerate Diagnose Skill
- **Task ID**: diagnose-skill
- **Depends On**: systems-registry
- **Assigned To**: builder-skills
- **Agent Type**: builder
- **Parallel**: true (can run parallel with execute-skill)
- Create `.claude/skills/adcelerate-diagnose/SKILL.md` with:
  - Frontmatter: `name: adcelerate-diagnose`, `description` for system diagnosis, `invocation: user`
- Create `.claude/skills/adcelerate-diagnose/workflow.md` defining:
  - System selection: engineer names a system or describes symptoms → look up in systems.yaml
  - Pipeline inspection: end-to-end check of the system's pipeline (FR25)
  - Root cause identification: structured diagnosis output
  - Fix proposal: clear explanation of diagnosis + proposed changes (FR26)
  - Engineer approval gate before applying fix (FR27)
  - Fix application + verification (FR28)
  - Guard rail addition to prevent recurrence (FR29)
  - History update: record diagnosis in `[system]/knowledge/history.md` and failure patterns in `knowledge/patterns/` (FR31)
  - Knowledge graph update: add failure pattern to `knowledge/graph.yaml`

### 7. Specialist Agents
- **Task ID**: specialist-agents
- **Depends On**: git-prep
- **Assigned To**: builder-agents
- **Agent Type**: builder
- **Parallel**: true (can run parallel with skills after git-prep)
- Read `ai_docs/claude-code-sub-agents.md` for agent creation patterns
- Read existing `.claude/agents/team/builder.md` and `.claude/agents/team/validator.md` for format reference
- Create `.claude/agents/adcelerate-scaffolder.md`:
  - Frontmatter: `name: adcelerate-scaffolder`, `description: Scaffolds new system sub-projects from base template, adding system-specific files based on captured knowledge`, `model: sonnet`
  - System prompt: copies `templates/system/` to target directory, customizes package.json (name, description), adds system-specific source files (prompt chains, pipeline logic, model config), installs dependencies via `bun install`, creates initial test file
  - Tools: all tools (needs Write, Edit, Bash)
  - Must follow sub-project isolation pattern (own deps, own config, own justfile)
- Create `.claude/agents/adcelerate-validator.md`:
  - Frontmatter: `name: adcelerate-validator`, `description: Independent validation reviewer that checks output against soft acceptance criteria with a fresh context window`, `model: sonnet`, `disallowedTools: Write, Edit, NotebookEdit`
  - System prompt: reads acceptance criteria from `[system]/knowledge/acceptance-criteria.md`, reviews output against soft criteria, produces structured validation report matching the architecture doc's format (frontmatter + Hard Gates checklist + Soft Criteria assessment + Recommendation)
  - Read-only: cannot modify files
- Create `.claude/agents/adcelerate-formalizer.md`:
  - Frontmatter: `name: adcelerate-formalizer`, `description: Reviews and structures knowledge captured during Build Mode interviews into agent-optimized format`, `model: sonnet`
  - System prompt: reviews all knowledge files in a system's `knowledge/` directory after interview, ensures frontmatter schema compliance, structures acceptance criteria into hard gates + soft criteria, ensures consistency across files, updates system index.md
  - Tools: all tools (needs Read, Write, Edit)
- All agent names must use the `adcelerate-` prefix per architecture convention

### 8. Pinboard & autoCaption Migration
- **Task ID**: system-migration
- **Depends On**: knowledge-foundation, systems-registry
- **Assigned To**: builder-migration
- **Agent Type**: builder
- **Parallel**: false
- Read existing code and docs for both systems to understand their domain
- **autoCaption migration:**
  - Create `autoCaption/knowledge/` directory
  - Create `autoCaption/knowledge/index.md` with proper frontmatter (`system: autocaption`, `type: index`, `version: 1`, etc.) — summary of the autoCaption system, what it does, entry points, stage definitions
  - Create `autoCaption/knowledge/domain.md` — captioning domain expertise extracted from existing docs and code
  - Create `autoCaption/knowledge/acceptance-criteria.md` — hard gates (video produces captions, output format valid, timing accurate) + soft criteria (readability, style matching)
  - Create `autoCaption/knowledge/dependencies.md` — Whisper.cpp, FFmpeg, Remotion, Bun, etc.
  - Create `autoCaption/knowledge/history.md` — initial entry documenting migration
- **Pinboard migration:**
  - Create `pinboard/knowledge/` directory
  - Create all 5 knowledge files following same pattern, adapted for Pinboard's domain (Pinterest-style board application with server/client architecture)
- **Registry update:**
  - Update `systems.yaml` entries for both systems: change status from `degraded` to `active`, fill in all structured fields (task_types, input_types, output_types, domain_tags, stages)
- **Knowledge graph update:**
  - Update `knowledge/graph.yaml` with both systems' entries, their dependencies, any shared models/deps, and initial cross-references

### 9. Justfile v1 Recipes
- **Task ID**: justfile-integration
- **Depends On**: systems-registry
- **Assigned To**: builder-integration
- **Agent Type**: builder
- **Parallel**: true (can run parallel with migration and skills)
- Add v1 system management recipes to root `justfile` per architecture doc:
  - `systems-list` — Read systems.yaml, display all registered systems + status
  - `systems-validate` — Verify registry entries match filesystem (directories exist, knowledge dirs present)
  - `systems-health` — Quick health check across all registered systems
  - `build-new` — Launch adcelerate-build skill for new system
  - `build-migrate name` — Launch adcelerate-build skill for existing system migration
  - `run task` — Launch adcelerate-execute skill with task description
  - `diagnose name` — Launch adcelerate-diagnose skill for named system
- Recipes must follow existing justfile patterns (set dotenv-load, grouped by section with comment headers)

### 10. Hook Event Emissions
- **Task ID**: hook-events
- **Depends On**: git-prep
- **Assigned To**: builder-integration
- **Agent Type**: builder
- **Parallel**: true (can run parallel with other tasks)
- Read `.claude/hooks/send_event.py` to understand existing event emission pattern
- Read `ai_docs/claude-code-hooks.md` for hook event patterns
- Add v1 event naming convention support (`adcelerate.<mode>.<action>`) per architecture doc:
  - Build events: `adcelerate.build.started`, `adcelerate.build.knowledge_captured`, `adcelerate.build.scaffolding_started`, `adcelerate.build.validation_passed`, `adcelerate.build.registration_complete`
  - Execute events: `adcelerate.execute.task_received`, `adcelerate.execute.system_matched`, `adcelerate.execute.stage_completed`, `adcelerate.execute.validation_passed`, `adcelerate.execute.delivered`
  - Diagnose events: `adcelerate.diagnose.started`, `adcelerate.diagnose.root_cause_found`, `adcelerate.diagnose.fix_proposed`, `adcelerate.diagnose.fix_applied`
  - Error events: `adcelerate.error.inline_retry`, `adcelerate.error.budget_exhausted`, `adcelerate.error.escalated`
- Payload contract: every event includes `{ system_id, timestamp, session_id }` plus action-specific data
- Existing events remain untouched — v1 events are additive
- Dashboard filters by `adcelerate.*` prefix automatically (no dashboard changes needed)

### 11. Final Validation
- **Task ID**: validate-all
- **Depends On**: knowledge-foundation, systems-registry, scaffolding-templates, build-skill, execute-skill, diagnose-skill, specialist-agents, system-migration, justfile-integration, hook-events
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- **Validation checklist:**
  - Verify `knowledge/graph.yaml` exists and is valid YAML with correct schema
  - Verify `systems.yaml` exists, is valid YAML, and has entries for autocaption and pinboard
  - Verify `templates/system/` contains all required template files with correct frontmatter
  - Verify all three skills exist with SKILL.md and workflow.md:
    - `.claude/skills/adcelerate-build/` (SKILL.md, workflow.md, steps/*, prompts/*)
    - `.claude/skills/adcelerate-execute/` (SKILL.md, workflow.md)
    - `.claude/skills/adcelerate-diagnose/` (SKILL.md, workflow.md)
  - Verify all three specialist agents exist:
    - `.claude/agents/adcelerate-scaffolder.md`
    - `.claude/agents/adcelerate-validator.md`
    - `.claude/agents/adcelerate-formalizer.md`
  - Verify autoCaption knowledge directory: all 5 files present with correct frontmatter
  - Verify pinboard knowledge directory: all 5 files present with correct frontmatter
  - Verify justfile has v1 recipes (systems-list, systems-validate, systems-health, build-new, build-migrate, run, diagnose)
  - Verify hook events follow `adcelerate.*` naming convention
  - Verify NO changes to master branch (all work on feature/adcelerate-v1)
  - Verify all knowledge file frontmatter follows the schema: `system`, `type`, `version`, `lastUpdated`, `lastUpdatedBy`
  - Verify systems.yaml entries match filesystem (referenced paths exist)
  - Verify no secrets or sensitive data in any knowledge files (NFR10-NFR11)
  - Run `just systems-validate` if the recipe is functional

## Acceptance Criteria

1. **Feature branch exists**: `feature/adcelerate-v1` branch created from master, all changes on this branch only
2. **Knowledge architecture**: `knowledge/graph.yaml` exists with correct flat schema, `knowledge/patterns/` directory exists
3. **System registry**: `systems.yaml` at root with autocaption and pinboard registered, following full schema from architecture doc
4. **Templates**: `templates/system/` contains package.json, tsconfig.json, biome.json, justfile, and 5 knowledge template files — all with correct frontmatter
5. **Build skill**: `.claude/skills/adcelerate-build/` has SKILL.md, workflow.md, 6 step files, and prompt templates — implements the full knowledge-capture → scaffold → validate → register pipeline
6. **Execute skill**: `.claude/skills/adcelerate-execute/` has SKILL.md and workflow.md — implements structured matching → NL fallback → staged delivery → validation
7. **Diagnose skill**: `.claude/skills/adcelerate-diagnose/` has SKILL.md and workflow.md — implements inspection → root cause → fix proposal → guard rail
8. **Specialist agents**: Three agents (scaffolder, validator, formalizer) exist with correct frontmatter, system prompts, and tool restrictions
9. **System migration**: Both autoCaption and pinboard have `knowledge/` directories with all 5 knowledge files populated with real content extracted from existing code/docs
10. **Justfile recipes**: Root justfile has all 7 v1 recipes
11. **Hook events**: send_event.py supports `adcelerate.*` event naming with correct payload contract
12. **Architecture compliance**: All naming follows `adcelerate-` prefix, all knowledge files follow frontmatter schema, all YAML follows flat structure convention
13. **No breakage**: Existing v0 functionality (observability dashboard, submodule management, hooks) remains operational

## Validation Commands
Execute these commands to validate the task is complete:

- `git branch --show-current` — Verify on `feature/adcelerate-v1` branch
- `cat knowledge/graph.yaml` — Verify knowledge graph structure
- `cat systems.yaml` — Verify system registry with both systems
- `ls templates/system/` — Verify all template files present
- `ls templates/system/knowledge/` — Verify knowledge template files
- `ls .claude/skills/adcelerate-build/` — Verify build skill structure
- `ls .claude/skills/adcelerate-build/steps/` — Verify all 6 step files
- `ls .claude/skills/adcelerate-execute/` — Verify execute skill structure
- `ls .claude/skills/adcelerate-diagnose/` — Verify diagnose skill structure
- `ls .claude/agents/adcelerate-*.md` — Verify all 3 specialist agents
- `ls autoCaption/knowledge/` — Verify autoCaption knowledge files
- `ls pinboard/knowledge/` — Verify pinboard knowledge files
- `grep -c 'systems-list\|systems-validate\|systems-health\|build-new\|build-migrate\|run task\|diagnose name' justfile` — Verify v1 recipes (should be >= 7)
- `grep -c 'adcelerate\.' .claude/hooks/send_event.py` — Verify v1 event support
- `git diff master --stat` — Verify scope of changes
- `just default` — Verify justfile still lists all recipes without error

## Notes

- **Branch safety**: All work MUST happen on `feature/adcelerate-v1`. Master must remain untouched after the initial commit.
- **Submodule awareness**: autoCaption and pinboard are git submodules. Knowledge directories created inside them may need to be committed within the submodule or treated as untracked files in the parent repo. The builder should handle this appropriately.
- **No new runtime dependencies**: v1 infrastructure is markdown/YAML files, Claude Code skills/agents, and justfile recipes. No new npm packages or Python dependencies at the monorepo level.
- **Architecture doc is source of truth**: All schemas, naming conventions, and patterns must match the architecture document exactly. When in doubt, re-read `_bmad-output/planning-artifacts/architecture.md`.
- **PRD MVP scope**: Only implement Phase 1 (MVP) features. Evolution Mode (Phase 2) and Discord command center (Phase 3) are explicitly out of scope.
- **Knowledge file content**: For the migration task, populate knowledge files with real content derived from existing code, tests, docs, and configuration — not placeholder text. The knowledge must be agent-readable and useful.
