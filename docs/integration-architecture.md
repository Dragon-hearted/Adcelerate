# Adcelerate — Integration Architecture

**Generated:** 2026-03-23 | **Scan Level:** Quick

## Overview

Adcelerate is a monorepo where parts are deliberately decoupled. There is no shared runtime code between applications. Integration happens through:

1. **Orchestration** — justfile delegates commands to submodules
2. **Observability** — Python hooks send events from any Claude Code session to the observability dashboard
3. **Library Catalog** — `library.yaml` indexes skills that can be invoked across sessions

## Integration Points

### 1. Claude Code Hooks → Observability Server

| From | To | Protocol | Description |
|------|----|----------|-------------|
| `.claude/hooks/send_event.py` | `apps/server/` | HTTP POST | Events dispatched during agent sessions |
| `.claude/hooks/session_start.py` | `apps/server/` | HTTP POST | Session start events |
| `.claude/hooks/session_end.py` | `apps/server/` | HTTP POST | Session end events |
| `.claude/hooks/pre_tool_use.py` | `apps/server/` | HTTP POST | Tool invocation events |
| `.claude/hooks/post_tool_use.py` | `apps/server/` | HTTP POST | Tool completion events |

**Data Flow:**
```
Claude Code Session
  → Python Hook fires (session_start, tool_use, etc.)
  → send_event.py formats event payload
  → HTTP POST to http://localhost:4000
  → Observability Server stores in SQLite (events.db)
  → WebSocket push to connected Vue dashboard clients
```

### 2. Observability Server ↔ Observability Client

| From | To | Protocol | Description |
|------|----|----------|-------------|
| `apps/server/` | `apps/client/` | WebSocket | Real-time event streaming |
| `apps/client/` | `apps/server/` | HTTP REST | Historical event queries |

### 3. Justfile → Submodules

| From | To | Mechanism | Description |
|------|----|-----------|-------------|
| Root `justfile` | `autoCaption/justfile` | Shell delegation (`cd && just`) | Sub-project task execution |
| Root `justfile` | `pinboard/justfile` | Shell delegation (`cd && just`) | Sub-project task execution |
| Root `justfile` | `scripts/*.sh` | Shell execution | System management |

### 4. Pinboard Client → Pinboard Server → External APIs

| From | To | Protocol | Description |
|------|----|----------|-------------|
| `pinboard/client/` | `pinboard/server/` | HTTP REST | Image generation requests, pin CRUD |
| `pinboard/server/` | fal.ai API | HTTP REST | NanoBanana Pro image generation |
| `pinboard/server/` | Google Generative AI | HTTP REST | AI-powered features |

### 5. autoCaption → External Dependencies

| From | To | Mechanism | Description |
|------|----|-----------|-------------|
| `autoCaption/src/transcribe.ts` | `whisper.cpp/` | Local binary | Speech-to-text transcription |
| `autoCaption/src/cli.ts` | FFmpeg | System binary | Audio extraction from video |
| `autoCaption/src/render.ts` | Remotion | Library | Programmatic video rendering |

### 6. Library Catalog → Skill Execution

| From | To | Mechanism | Description |
|------|----|-----------|-------------|
| `library.yaml` | `.agents/skills/*/SKILL.md` | File reference | Skill discovery and invocation |
| `.claude/hooks/library_sync.py` | `library.yaml` | File I/O | Catalog synchronization |

## Shared Dependencies

There are no shared npm dependencies across parts. Each part has its own `package.json` and `bun.lock`. Common technology choices include:

- **Bun** — runtime across all parts
- **TypeScript** — language across all parts
- **Tailwind CSS** — styling for both web frontends (pinboard client, observability client)
- **SQLite** — database for both servers (pinboard, observability)
- **Vite** — build tool for both frontends

## Isolation Boundaries

- **autoCaption** and **pinboard** are git submodules — they can be developed, tested, and deployed independently
- **Observability** (apps/) is part of the root repo but operates independently
- No part imports code from another part
- Environment variables are scoped per-part (root `.env`, pinboard `.env`)
