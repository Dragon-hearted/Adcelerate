---
system: "readme-engine"
type: acceptance-criteria
version: 1
lastUpdated: "2026-04-13"
lastUpdatedBy: build-mode
---

# Acceptance Criteria — ReadmeEngine

## Hard Gates
_Binary pass/fail criteria. ALL must pass for output to be considered valid._

- [ ] `bun run systems/readme-engine/src/cli.ts generate --target root` produces a valid `README.md` at the monorepo root
- [ ] `bun run systems/readme-engine/src/cli.ts generate --target system:pinboard` produces a README matching or exceeding current Pinboard README quality
- [ ] `bun run systems/readme-engine/src/cli.ts generate --target all` produces READMEs for root + all 5 registered systems + apps
- [ ] `bun run systems/readme-engine/src/cli.ts detect --target all` produces a DriftReport JSON with per-section staleness
- [ ] Generated READMEs include: centered header, badges, TOC, features, architecture diagram, tech stack, getting started, project structure
- [ ] Mermaid diagrams are generated from `knowledge/graph.yaml` and `systems.yaml` data, not hardcoded
- [ ] Badge generation reads actual package.json dependencies to determine technology badges
- [ ] TypeScript compiles with zero errors (`bunx tsc --noEmit`)
- [ ] Biome lint passes with zero errors (`bunx biome check`)
- [ ] System is registered in `systems.yaml` with all required fields
- [ ] System is registered in `knowledge/graph.yaml` with dependencies and related systems
- [ ] `.claude/hooks/readme_drift_check.py` exists and is wired into settings.json SessionEnd
- [ ] `.claude/commands/readme-update.md` exists and is functional

## Soft Criteria
_Quality guidance for human judgment at approval gates. Surfaced to the engineer for review._

### Visual Design Quality
Generated READMEs should look **professionally designed** with consistent spacing, emoji usage, and structured layouts matching the Pinboard README visual standard. Key signals: **centered hero headers**, **horizontal rule separators**, **emoji-prefixed sections**, **well-formatted tables**, and **appropriate use of code blocks**.

### Content Depth & Accuracy
READMEs should demonstrate **genuine understanding** of each system's architecture and purpose, not just surface descriptions. Architecture diagrams should reflect real component relationships. Tech stack tables should list actual dependencies with correct versions. Getting started sections should contain **copy-pasteable commands** that work.

### Diagram Quality
Mermaid charts should **accurately represent** the dependency topology from graph.yaml with readable labels and real relationships. ASCII architecture diagrams should use **box-drawing characters** (not plain dashes/pipes) and convey meaningful component structure.

### Graceful Degradation
Template system should **gracefully handle** systems with different structures (CLI vs web app vs script-based). Missing data should result in **omitted sections**, not broken output or placeholder text. A system without a `demo/` directory should simply skip the demo section.

### Performance
Auto-update mechanism should be **lightweight**. The drift check SessionEnd hook must complete in **under 1 second**. Full generation for all targets should complete in **under 10 seconds**.
