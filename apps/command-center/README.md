# Claude Command Center

A localhost-first, browser-based orchestration & observability dashboard that
**replaces the Claude Code terminal**. Drive Claude Code from the browser:
submit prompts, watch a live event timeline, approve/deny tool calls, answer the
agent's questions, track token spend, view GitHub activity, run multiple
concurrent agents, and replay sessions event-by-event.

```
Browser UI  ⇄(Socket.IO)⇄  Local Orchestrator (Fastify)  ⇄(Claude Agent SDK)⇄  Claude Code process(es)
```

> **Status:** Phase 1 foundation. This package is scaffolded by a team build;
> see `specs/claude-command-center.md` for the full plan and phase breakdown.

## Workspace layout

This is a **Bun workspace** with three packages:

```
apps/command-center/
├── packages/shared/   # @command-center/shared — single source of truth for contracts
├── orchestrator/      # @command-center/orchestrator — Fastify + Socket.IO + Agent SDK + Drizzle
└── web/               # @command-center/web — Next.js 15 dashboard (Phase 6)
```

### `@command-center/shared` — the contract package

Both the orchestrator and web import contracts from a single source of truth.

**Import path:** `@command-center/shared` (barrel export).

```ts
import type {
  CCEvent, EventType, FileChange,           // events.ts
  ApprovalRequest, ApprovalDecision,        // approvals.ts
  AgentDescriptor, AgentRole, AgentState,   // agents.ts
  ServerToClient, ClientToServer,           // ws-contract.ts
  PeriodTotals, SummaryResponse,            // tokens.ts
  Commit, Branch, PullRequest, GitHubActivity, // github.ts
} from '@command-center/shared';
```

Resolution is via Bun/TS workspace symlinks; the package's `exports` point at
the TypeScript source (`src/index.ts`) — no build step required. Next.js must
list `@command-center/shared` in `transpilePackages` (handled in Phase 6).

## Getting started

```bash
# from apps/command-center/
bun install                 # install all workspace deps
cp .env.sample .env         # then edit (see Auth below)

bun run --filter '*' typecheck        # typecheck shared + orchestrator + web
bun run --filter @command-center/orchestrator drizzle:generate   # generate migration SQL
bun run --filter @command-center/orchestrator migrate            # apply migrations
```

> **Note on env files:** the repo's pre-tool hook blocks `.env.example`, so the
> template ships as **`.env.sample`**. Copy it to `.env`.

## Database & migrations

**SQLite driver decision: Bun's native `bun:sqlite` via the Drizzle
`bun-sqlite` driver** (`drizzle-orm/bun-sqlite`), **not** `better-sqlite3`.

Why:

- **Parity** with the existing monorepo — `apps/server` already uses `bun:sqlite`.
- **No native build step** — `better-sqlite3` needs `node-gyp`/prebuilds; the
  Bun driver is built in.
- The orchestrator targets the **Bun runtime** regardless.

`drizzle-kit generate` only reads the schema + dialect (`sqlite`) and never
connects, so migration generation is **driver-agnostic** and stays portable if
the driver is ever swapped.

- Schema: `orchestrator/src/db/schema.ts`
- Client (runtime): `orchestrator/src/db/client.ts`
- Migration runner: `orchestrator/src/db/migrate.ts`
- Generated SQL: `orchestrator/src/db/migrations/`
- Config path: `CC_DB_PATH` (default `./command-center.db`, relative to `orchestrator/`)

### Ported tables

`token_events` and `transcript_offsets` are ported **verbatim-in-meaning** from
`apps/server/src/db.ts` — identical columns, indexes, and the
`UNIQUE(transcript_file, inode, transcript_line_offset)` dedupe constraint that
defends against a `.jsonl` truncated and recreated at the same path. This keeps
the ported transcript-ingest pipeline working unchanged and lets the legacy
`events.db` token data migrate in.

## Auth

The Agent SDK authenticates one of two ways (documented in `.env.sample`):

1. `ANTHROPIC_API_KEY` — a raw API key.
2. **Local Claude CLI / subscription session (default)** — if you already run
   Claude Code and are logged in, leave `ANTHROPIC_API_KEY` unset and the SDK
   reuses that session. No key required.

> **Gotcha:** a stale `ANTHROPIC_API_KEY` in your shell can trigger
> "Credit balance too low". Strip it for the run:
> `env -u ANTHROPIC_API_KEY bun run dev`.

## Security

- Bind orchestrator + web to `127.0.0.1` only.
- Localhost-only CORS/WS allowlist (`localhost`, `127.0.0.1`, `::1`; origin `:3000`)
  — see `allowedOrigins()` in `orchestrator/src/config.ts`.
- The approval engine (`canUseTool`) is the safety boundary: risky tools
  (`Bash`, `Write`, `Edit`, network) default to **require approval**.
