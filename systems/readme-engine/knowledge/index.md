---
system: "readme-engine"
type: index
version: 1
lastUpdated: "2026-04-13"
lastUpdatedBy: build-mode
---

# ReadmeEngine

## Summary
Automated README generation and maintenance engine that produces best-in-class documentation for the Adcelerate monorepo, each registered system, and sub-projects (apps/). Reads all knowledge infrastructure (systems.yaml, library.yaml, graph.yaml, knowledge/ dirs, package.json files, git history) to produce deep, accurate, visually polished README.md files. Includes drift detection to flag stale documentation and selective re-rendering to keep READMEs current.

## Entry Points
- **CLI**: `src/cli.ts` — Primary entry point with `generate`, `detect`, `update` commands
- **Programmatic API**: `src/index.ts` — Exported functions for use by other systems

## Stage Definitions

### generate
Generate full README.md files from knowledge sources.
- **Input**: `--target root | system:<name> | app:<name> | all`
- **Process**: Collect data from knowledge sources → render sections via renderers → assemble via templates → write README.md
- **Output**: README.md file(s) written to target path(s)

### detect
Analyze drift between current knowledge sources and existing READMEs.
- **Input**: `--target root | system:<name> | app:<name> | all`
- **Process**: Compare stored fingerprints against current knowledge source state
- **Output**: DriftReport JSON with per-section staleness status

### update
Selectively re-render only stale sections of existing READMEs.
- **Input**: `--target root | system:<name> | app:<name> | all`
- **Process**: Run drift detection → re-render stale sections only → merge into existing README
- **Output**: Updated README.md with only stale sections refreshed

## Knowledge Files
- [Domain Knowledge](domain.md) — README best practices, template patterns, and quality standards
- [Acceptance Criteria](acceptance-criteria.md) — Hard gates and soft quality criteria
- [Dependencies](dependencies.md) — Runtime, build, and optional dependencies
- [History](history.md) — Build, fix, and diagnosis history

## Cross-References
- All registered systems (autoCaption, SceneBoard, Pinboard, Instagram Scrapper, ImageEngine) — generates READMEs for each
- `systems.yaml` — System registry, primary data source
- `knowledge/graph.yaml` — Dependency topology for mermaid diagrams
- `library.yaml` — Skills/agents/commands catalog for root README
