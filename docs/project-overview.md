# Adcelerate — Project Overview

**Generated:** 2026-03-23 | **Scan Level:** Quick | **Mode:** Initial Scan

## Executive Summary

Adcelerate is a monorepo serving as a growth marketing and AI content creation platform. It combines two application sub-projects (autoCaption, pinboard), an observability dashboard for multi-agent systems, a library catalog of 34+ marketing and growth skills for AI agents, and extensive Claude Code hook-based tooling for agent orchestration and session management.

## Repository Type

**Monorepo** with 4 distinct parts:

| Part | Type | Root Path | Description |
|------|------|-----------|-------------|
| **autoCaption** | CLI / Web (Remotion) | `autoCaption/` | Video captioning tool using Whisper.cpp + Remotion |
| **pinboard** | Web (Full-stack) | `pinboard/` | AI image generation app with React + Hono + fal.ai |
| **observability** | Web (Full-stack) | `apps/` | Multi-agent observability dashboard (Vue + Bun server) |
| **platform** | Library / Tooling | `.` (root) | Agent skill library, hooks, justfile orchestration |

Both `autoCaption` and `pinboard` are git submodules pointing to separate GitHub repos under `Dragon-hearted`.

## Primary Technologies

| Category | Technology | Version / Notes |
|----------|-----------|-----------------|
| Runtime | Bun | Primary JS/TS runtime across all parts |
| Language | TypeScript | Used in all parts |
| Task Runner | just (justfile) | Orchestrates all top-level commands |
| Frontend (pinboard) | React 19, Vite, Tailwind CSS | Dark theme UI |
| Frontend (observability) | Vue 3, Vite, Tailwind CSS | Dashboard interface |
| Backend (pinboard) | Hono, SQLite | REST API with fal.ai integration |
| Backend (observability) | Bun native server, SQLite | WebSocket + REST for event ingestion |
| Video Processing | Remotion 4, Whisper.cpp | autoCaption video rendering pipeline |
| AI / ML | fal.ai (NanoBanana Pro), Whisper.cpp, Google Generative AI | Image gen + transcription |
| Agent Tooling | Claude Code hooks (Python) | Session lifecycle, observability events |
| Library Catalog | library.yaml | 34+ marketing/growth skills indexed |

## Architecture Type

Monorepo with submodule-based project separation. The root project serves as:
1. An orchestration layer (justfile, hooks, scripts) for Claude Code agent sessions
2. A library catalog system for marketing/growth AI skills
3. A container for submodule applications (autoCaption, pinboard)
4. A host for the observability dashboard (apps/)

## Getting Started

```bash
# Initialize submodules
just sub-init

# Install observability dependencies
just obs-install

# Start observability dashboard
just obs-start

# Run a submodule recipe
just sub pinboard dev
just sub autoCaption test
```

## Links to Documentation

- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [Integration Architecture](./integration-architecture.md)
- [Component Inventory](./component-inventory.md)
