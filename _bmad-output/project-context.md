---
project_name: 'Adcelerate'
user_name: 'Dragonhearted'
date: '2026-03-23'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Runtime:** Bun (all sub-projects use Bun as the runtime and package manager)

**Monorepo Structure:**
- `apps/server` -- Multi-Agent Observability server (Bun + SQLite + WebSocket)
- `apps/client` -- Observability dashboard (Vue 3 + Vite + Tailwind CSS)
- `autoCaption` -- Video captioning tool (Remotion + React 19 + Whisper)
- `pinboard` -- Collaborative pinboard app (Hono server + React 19 client)
- `autoCaption` and `pinboard` are **git submodules** with their own repos

**Core Dependencies by Sub-project:**

| Sub-project | Key Dependencies | Versions |
|---|---|---|
| apps/server | Bun runtime, sqlite/sqlite3, TypeScript | TS ~5.8, sqlite3 5.1.7 |
| apps/client | Vue 3.5, Vite 7, Tailwind CSS 3.4, vue-tsc | TS ~5.8, PostCSS 8.5 |
| autoCaption | Remotion 4.0.438, React 19.2, Zod 4.3, Biome 2.4 | TS ~5.9, Vitest 4.1 |
| pinboard/server | Hono 4.7, @google/generative-ai 0.21 | TS ~5.8 |
| pinboard/client | React 19.1, Vite 6.3, Tailwind CSS 3.4 | TS ~5.8 |

**Build/Dev Tooling:**
- **Task runner:** `just` (justfile at project root)
- **Hooks system:** Python scripts in `.claude/hooks/` using `uv run --script`
- **Linting/Formatting:** Biome (autoCaption only); no shared linter for other sub-projects
- **Testing:** Vitest (autoCaption); no test framework configured in other sub-projects yet
- **Agent Tooling:** Extensive Claude Code hooks, skills, agents, and library catalog (`library.yaml`)

---

## Critical Implementation Rules

### Language-Specific Rules

- **All sub-projects use `"type": "module"` (ESM).** Always use `import`/`export` syntax, never `require`/`module.exports`.
- **TypeScript strict mode is enabled everywhere.** The server tsconfig has `noUncheckedIndexedAccess: true` and `verbatimModuleSyntax: true` -- always handle potentially-undefined index access and use explicit `type` imports/exports.
- **Bun-native APIs are preferred.** The server uses `Bun.serve()`, `bun:sqlite`, and Bun's native `WebSocket`. Do not use Node.js equivalents (express, better-sqlite3, ws) unless there is a specific reason.
- **The server uses `bun:sqlite` (Bun's built-in SQLite)** while `package.json` lists `sqlite3` as a fallback. Always import from `bun:sqlite` for new server code.
- **Zod is used for schema validation in autoCaption** (Zod v4). Use Zod schemas for any new configuration or input validation in that sub-project.
- **Python hooks use `uv run --script`** with inline dependency declarations. Always include the `# /// script` metadata block with required dependencies.

### Framework-Specific Rules

**Vue 3 (apps/client):**
- Uses **Composition API with `<script setup>`** exclusively. Do not use Options API.
- **Composables pattern** for reusable logic (see `src/composables/`). Follow naming convention: `use<Feature>.ts`.
- **CSS via Tailwind utility classes** plus CSS custom properties (`var(--theme-*)`) for theming. Do not add scoped CSS unless Tailwind cannot express the style.
- **Responsive design** uses custom Tailwind variants: `mobile:` and `short:` prefixes for breakpoints.
- **WebSocket composable** (`useWebSocket.ts`) manages real-time event streaming. All real-time data flows through this single composable.
- **Theme system** uses CSS custom properties set globally, with a full CRUD API on the server. New UI components must use `var(--theme-*)` variables, not hardcoded colors.

**React 19 + Remotion (autoCaption):**
- Remotion compositions live in `src/compositions/`, caption rendering in `src/captions/`.
- CLI entry point is `src/cli.ts`; rendering logic in `src/render.ts`.
- Caption styles are validated via Zod schema (`src/config.ts`). Always extend the schema when adding new style options.

**Hono (pinboard/server):**
- Hono is used as the HTTP framework (not raw `Bun.serve()` like the observability server).
- Google Generative AI SDK is a dependency for AI features.

**Observability Server (apps/server):**
- Routes are defined inline in `Bun.serve()` fetch handler, not via a router. Match URL patterns manually.
- WebSocket upgrade is handled at `/stream` path.
- All event data is stored as JSON strings in SQLite TEXT columns; parse on read with `JSON.parse()`.
- Database migrations are done inline in `initDatabase()` by checking `PRAGMA table_info` and adding columns if missing.

### Testing Rules

- **autoCaption** uses Vitest with `vitest run` for CI and `vitest` (watch mode) for dev.
- **Biome** handles linting and formatting in autoCaption: `biome check src/ tests/` and `biome format --write src/ tests/`.
- **No test framework** is configured for `apps/server`, `apps/client`, or `pinboard` sub-projects currently. When adding tests, use Vitest for consistency.
- **Type checking** is done via `tsc --noEmit` in server projects and `vue-tsc -b` for the Vue client.

### Code Quality & Style Rules

- **File naming:** TypeScript source files use camelCase (`useWebSocket.ts`, `config.ts`). Vue SFC files use PascalCase (`EventTimeline.vue`, `FilterPanel.vue`).
- **Component naming:** Vue components use PascalCase in filenames and template usage. React/Remotion components use PascalCase.
- **No shared monorepo workspace** (no root package.json, no workspace protocol). Each sub-project manages its own dependencies independently. Run `bun install` in each sub-project directory separately.
- **Justfile recipes** orchestrate cross-project commands. Add new automation as just recipes, not npm scripts.
- **Hook scripts** live in `.claude/hooks/` as Python files. The `send_event.py` script is the core observability hook that sends events to the server.
- **Library catalog** (`library.yaml`) is auto-generated by `library_sync.py`. Do not edit `library.yaml` manually.

### Development Workflow Rules

- **Start the observability system** with `just obs-start` (or `just obs-bg` for background). This launches both server (port 4000) and client (port 5173).
- **Git submodules:** `autoCaption` and `pinboard` are submodules. Use `just sub-init` to initialize, `just sub-update` to pull latest, and `just sub pinboard <recipe>` to run sub-project just recipes.
- **Environment variables:** `.env` is gitignored. Server port defaults to 4000 (`SERVER_PORT`), client port defaults to 5173 (`VITE_PORT`).
- **Database files** (`events.db`, `events.db-wal`, `events.db-shm`) are gitignored and created at runtime in `apps/server/`.
- **Claude Code integration** is deep: hooks fire on every tool use, session start/stop, subagent lifecycle, etc. The hooks are configured at `.claude/hooks/` and send telemetry to the observability server.
- **Skills and agents** are cataloged in `library.yaml` and live in `.agents/skills/` and `.claude/agents/`. Skills cover marketing/growth topics (Adcelerate is a marketing acceleration toolkit) plus BMAD method workflows.
- **BMAD method** is installed at `_bmad/` with configuration in `_bmad/bmm/config.yaml`. Output artifacts go to `_bmad-output/`.

### Critical Don't-Miss Rules

- **Never edit `library.yaml` directly.** It is auto-generated by the `library_sync.py` hook. Add or modify skills/agents via their respective directories.
- **The observability server uses raw `Bun.serve()` with manual route matching,** not a framework router. When adding endpoints, follow the existing `if (url.pathname === '...' && req.method === '...')` pattern in `apps/server/src/index.ts`.
- **CORS is handled manually** with a `headers` object in every response. Always include CORS headers in new endpoints.
- **SQLite WAL mode** is enabled for concurrent performance. Never change the journal mode.
- **All sub-projects are private** (`"private": true` in package.json). Do not publish to npm.
- **The client has no router** -- it is a single-page dashboard. All views are rendered conditionally within `App.vue`.
- **WebSocket messages use a `type` field** for discrimination: `{ type: 'event', data: ... }` for new events, `{ type: 'initial', data: [...] }` for connection replay.
- **Human-in-the-loop (HITL)** is a first-class concept in the observability system. Events can carry `humanInTheLoop` data with question/permission/choice types and a WebSocket URL for agent responses.
- **The `autoCaption` submodule** depends on Whisper CPP for transcription (`@remotion/install-whisper-cpp`). Ensure Whisper is installed before running render commands.
- **Python hooks require `uv`** (the Python package manager). If `uv` is not available, hooks will fail silently to avoid blocking Claude Code operations (hooks always `sys.exit(0)`).

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Check which sub-project you are working in -- they have different tech stacks
- Use `just` recipes for cross-project operations

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-03-23
