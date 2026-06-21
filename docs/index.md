# Adcelerate — Project Documentation Index

> **Canonical design docs (current — start here):**
> - **[Product Requirements (PRD)](./prd.md)** — the Console (Canvas + Command Center): problem, flows, execution & editing model, distribution, v1 scope.
> - **[Decision log (ADRs 0001–0025)](./adr/)** — every architectural "why", self-contained.
> - **[Glossary / domain model](../CONTEXT.md)** — the 24 canonical terms; the PRD and ADRs use them verbatim.
> - **[Release prep & checklist](./release-prep.md)** — distribution model and pre-publish gate.
>
> ⚠️ **The scan below is stale** (generated 2026-03-23, before the Console platform; it still describes the deprecated `obs-*` observability dashboard). Trust the canonical docs above. A setup-doc rewrite for the clone-light / lazy-init path is tracked in `release-prep.md`.

**Generated:** 2026-03-23 | **Mode:** Initial Scan | **Scan Level:** Quick

## Project Overview

- **Type:** Monorepo with 4 parts
- **Primary Language:** TypeScript
- **Runtime:** Bun
- **Architecture:** Submodule-isolated monorepo with orchestration layer

## Quick Reference

### AutoEditor (cli)
- **Type:** CLI / Video Rendering Pipeline
- **Tech Stack:** Bun, TypeScript, Remotion 4, Whisper.cpp, Zod, Vitest
- **Root:** `auto-editor/`
- **Entry Point:** `src/cli.ts`

### Pinboard (web)
- **Type:** Full-Stack Web Application
- **Tech Stack:** React 19, Hono, Vite, Tailwind CSS, SQLite, fal.ai
- **Root:** `pinboard/`
- **Entry Point:** `server/src/index.ts`

### Observability Dashboard (web)
- **Type:** Real-time Event Dashboard
- **Tech Stack:** Vue 3, Vite, Tailwind CSS, Bun, SQLite, WebSocket
- **Root:** `apps/`
- **Entry Point:** `server/src/index.ts`

### Platform (library)
- **Type:** Agent Tooling / Skill Library
- **Tech Stack:** Python, just, YAML, Shell
- **Root:** `.` (root)
- **Entry Point:** `justfile`

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Integration Architecture](./integration-architecture.md)
- [Project Parts Metadata](./project-parts.json)

## Existing Documentation

- [AutoEditor README](../auto-editor/README.md) — Usage, CLI options, project structure, roadmap
- [Pinboard README](../pinboard/README.md) — Architecture overview, getting started
- [Observability Server README](../apps/server/README.md) — Basic server setup
- **AI Docs** (`ai_docs/`) — Claude Code documentation cache (hooks, skills, agents, channels, plugins, MCP, sub-agents). Not committed; regenerate locally with `/load_ai_docs`.

## Getting Started

1. **Clone with submodules:** `git clone --recurse-submodules <repo-url>`
2. **Initialize:** `just sub-init`
3. **Install deps:** `just obs-install` and `bun install` in each submodule
4. **Configure:** Set up `.env` files (root for Anthropic key, pinboard for fal.ai key)
5. **Run:** `just obs-start` for dashboard, `just sub pinboard dev` for pinboard, `cd systems/auto-editor && bun run src/cli.ts` for captioning
