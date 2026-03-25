# Adcelerate — Architecture Document

**Generated:** 2026-03-23 | **Scan Level:** Quick

## Executive Summary

Adcelerate is a monorepo that combines multiple independent applications and an agent tooling platform. The architecture is decoupled by design: each application (autoCaption, pinboard) lives as a git submodule with its own dependencies and build pipeline, while the root project provides shared infrastructure (observability, skill library, session hooks) and orchestration via justfile.

## Architecture Pattern

**Monorepo with Submodule Isolation**

- Applications are loosely coupled — they share no runtime code or dependencies
- Integration happens at the orchestration layer (justfile, hooks) rather than at the code level
- The observability system (apps/) is the only cross-cutting concern that monitors agent sessions across all parts

## Part: autoCaption

### Type: CLI Tool / Video Rendering Pipeline

**Stack:** Bun, TypeScript, Remotion 4, Whisper.cpp, Zod, Vitest, Biome

**Architecture Pattern:** Pipeline — linear data flow from input video through transcription to rendered output.

```
Input Video → FFmpeg (audio extraction) → Whisper.cpp (transcription)
    → Caption JSON → Remotion (video render) → Output Video
```

**Key Components:**
- `src/cli.ts` — CLI entry point, argument parsing with Zod schema validation
- `src/transcribe.ts` — Whisper.cpp integration, model download, audio processing
- `src/render.ts` — Remotion programmatic renderer
- `src/compositions/CaptionedVideo.tsx` — React composition for video + caption overlay
- `src/captions/CaptionOverlay.tsx` — TikTok-style caption sequencer
- `src/config.ts` — Caption style configuration schema (Zod)

**Testing:** Vitest with tests for CLI, transcription, caption processing, and rendering.

### Data Flow
1. CLI parses args and validates with Zod schema
2. FFmpeg extracts audio from input video
3. Whisper.cpp transcribes audio to word-level timed captions
4. Remotion renders video with caption overlay composition
5. Output video written to disk

## Part: pinboard

### Type: Full-Stack Web Application

**Stack:**
- Server: Bun, Hono, SQLite, fal.ai API, Google Generative AI
- Client: React 19, Vite, Tailwind CSS

**Architecture Pattern:** Client-Server with REST API

```
React Client (Vite) → REST API (Hono/Bun) → fal.ai API (image generation)
                                           → SQLite (persistence)
                                           → Google Generative AI
```

**Key Components:**
- `server/src/index.ts` — Hono API server entry point
- `client/src/` — React frontend with dark theme
- SQLite database (`pinboard.db`) for image/pin persistence
- File uploads stored in `server/uploads/`

**Integration Points:**
- fal.ai NanoBanana Pro model for image generation
- Google Generative AI for additional AI features
- Client communicates with server over REST (server port 3001, client port 5173)

## Part: Observability Dashboard

### Type: Full-Stack Web Application

**Stack:**
- Server: Bun native HTTP + WebSocket, SQLite
- Client: Vue 3, Vite, Tailwind CSS

**Architecture Pattern:** Real-time Event Dashboard

```
Claude Code Hooks (Python) → HTTP POST → Bun Server → SQLite (events.db)
                                                     → WebSocket → Vue Dashboard
```

**Key Components:**
- `apps/server/src/index.ts` — HTTP + WebSocket server, event ingestion
- `apps/server/src/db.ts` — SQLite database layer for event storage
- `apps/server/src/types.ts` — Event type definitions
- `apps/server/src/theme.ts` — Theme configuration
- `apps/client/src/App.vue` — Main dashboard application
- `apps/client/src/components/` — Dashboard UI components
- `apps/client/src/composables/` — Vue composables for data fetching

**Data Flow:**
1. Claude Code hooks (`.claude/hooks/*.py`) fire during agent sessions
2. Hook scripts POST events to the observability server
3. Server stores events in SQLite (`events.db`)
4. Server pushes updates to connected clients via WebSocket
5. Vue dashboard renders real-time agent activity

## Part: Platform (Root)

### Type: Agent Tooling / Library Catalog

**Key Systems:**

#### 1. Library Catalog (`library.yaml`)
- 34+ marketing/growth skills indexed with metadata
- Skills organized in `.agents/skills/` and `.claude/skills/`
- Each skill has name, description, trigger patterns, version, and cross-references
- Categories: ad creative, SEO, analytics, CRO, email, pricing, copywriting, etc.

#### 2. Claude Code Hooks (`.claude/hooks/`)
Python scripts managing the agent session lifecycle:
- `session_start.py` / `session_end.py` — Session lifecycle
- `send_event.py` — Event dispatch to observability server
- `pre_tool_use.py` / `post_tool_use.py` — Tool use interception
- `setup_init.py` / `setup_maintenance.py` — Codebase initialization and maintenance
- `library_sync.py` — Skill library synchronization
- `pre_compact.py` — Context compaction handling
- `notification.py` — Notification dispatch

#### 3. Justfile Orchestration
Top-level task runner with recipes for:
- Observability system (start/stop/install)
- Submodule management (init/update/sub-command delegation)
- Claude Code sessions (various modes)
- Cleanup (logs, databases, artifacts)

#### 4. BMAD Methodology
Extensive skill library under `.claude/skills/bmad-*` for project management, development workflows, QA, design systems, and documentation generation (100+ skills).

## Cross-Cutting Concerns

### Environment Configuration
- `.env` at root contains API keys (ANTHROPIC_API_KEY) and engineer name
- `pinboard/.env` contains fal.ai API key
- Environment loaded via justfile `set dotenv-load := true`

### Database Strategy
- SQLite used across all server components (observability events.db, pinboard pinboard.db)
- No shared database — each service owns its data

### Testing Strategy
- autoCaption: Vitest with comprehensive test suite
- pinboard: No test framework detected (quick scan)
- observability: No test framework detected (quick scan)
