# Adcelerate — Project Documentation Index

**Generated:** 2026-03-23 | **Mode:** Initial Scan | **Scan Level:** Quick

## Project Overview

- **Type:** Monorepo with 4 parts
- **Primary Language:** TypeScript
- **Runtime:** Bun
- **Architecture:** Submodule-isolated monorepo with orchestration layer

## Quick Reference

### autoCaption (cli)
- **Type:** CLI / Video Rendering Pipeline
- **Tech Stack:** Bun, TypeScript, Remotion 4, Whisper.cpp, Zod, Vitest
- **Root:** `autoCaption/`
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

- [autoCaption README](../autoCaption/README.md) — Usage, CLI options, project structure, roadmap
- [Pinboard README](../pinboard/README.md) — Architecture overview, getting started
- [Observability Server README](../apps/server/README.md) — Basic server setup
- [AI Docs](../ai_docs/) — Claude Code documentation (hooks, skills, agents, channels, plugins, MCP, sub-agents)

## Getting Started

1. **Clone with submodules:** `git clone --recurse-submodules <repo-url>`
2. **Initialize:** `just sub-init`
3. **Install deps:** `just obs-install` and `bun install` in each submodule
4. **Configure:** Set up `.env` files (root for Anthropic key, pinboard for fal.ai key)
5. **Run:** `just obs-start` for dashboard, `just sub pinboard dev` for pinboard, `cd autoCaption && bun run src/cli.ts` for captioning
