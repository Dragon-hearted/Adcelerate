// ─────────────────────────────────────────────────────────────────────────────
// Drizzle schema — Claude Command Center.
//
// `events`, `sessions`, `approvals` are new tables (Phase 1/2). `token_events`
// and `transcript_offsets` are ported VERBATIM-IN-MEANING from the legacy
// apps/server/src/db.ts — identical columns, indexes, and the (transcript_file,
// inode, transcript_line_offset) dedupe constraint that defends against `.jsonl`
// truncate-and-recreate at the same path. Keep them byte-compatible so the
// legacy events.db can be migrated and the ported transcript-ingest works
// unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  unique,
} from 'drizzle-orm/sqlite-core';

// ── events ──────────────────────────────────────────────────────────────────
// Normalized CCEvent log. `seq` is a per-session monotonic ordinal (event
// sourcing / deterministic replay). `payload` is JSON; convenience columns are
// forwarded for cheap filtering (mirrors send_event.py).
export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seq: integer('seq').notNull(),
    sourceApp: text('source_app').notNull(),
    sessionId: text('session_id').notNull(),
    agentName: text('agent_name'),
    hookEventType: text('hook_event_type').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    toolName: text('tool_name'),
    toolUseId: text('tool_use_id'),
    // #35: spawning Task's tool_use id (nullable) — mirrors toolUseId so the
    // Spawn-Tree fold can nest sub-agent tool-calls under their parent on replay.
    parentToolUseId: text('parent_tool_use_id'),
    summary: text('summary'),
    modelName: text('model_name'),
    costUsd: real('cost_usd'),
    timestamp: integer('timestamp').notNull(),
  },
  (t) => ({
    bySession: index('idx_events_session').on(t.sessionId),
    bySeq: index('idx_events_session_seq').on(t.sessionId, t.seq),
    byType: index('idx_events_type').on(t.hookEventType),
    byTs: index('idx_events_ts').on(t.timestamp),
  }),
);

// ── sessions ────────────────────────────────────────────────────────────────
// One row per named agent session (its AgentDescriptor, persisted).
export const sessions = sqliteTable('sessions', {
  sessionId: text('session_id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  model: text('model').notNull(),
  state: text('state').notNull(),
  cwd: text('cwd').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
});

// ── approvals ───────────────────────────────────────────────────────────────
// Approval / question lifecycle: pending → (approve|deny|modify|answer|timeout).
export const approvals = sqliteTable(
  'approvals',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    kind: text('kind').notNull(),
    toolName: text('tool_name'),
    toolInput: text('tool_input', { mode: 'json' }),
    question: text('question'),
    choices: text('choices', { mode: 'json' }),
    status: text('status').notNull(), // pending|approved|denied|modified|answered|timeout
    decision: text('decision', { mode: 'json' }),
    createdAt: integer('created_at').notNull(),
    respondedAt: integer('responded_at'),
  },
  (t) => ({
    bySession: index('idx_approvals_session').on(t.sessionId),
    byStatus: index('idx_approvals_status').on(t.status),
  }),
);

// ── boards ────────────────────────────────────────────────────────────────────
// A Board is the unit of persistence (#36, ADR-0010/0025): a grouping over
// already-persisted Runs. The table is intentionally minimal — Run membership
// lives in `board_runs`, so a Board "holds many Runs" naturally (v1 defaults to
// one-Run-per-board, not enforced into the schema).
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull(), // epoch ms
});

// ── board_runs ──────────────────────────────────────────────────────────────
// Join over already-persisted Runs. Slot Identity `(producerSystem, slotId)` is
// captured here at open-into-Board time; the read-side `projectBoard` fold groups
// memberships by that composite so re-generating the same slot stacks in one
// Board position. UNIQUE(boardId, runId) makes open-into-Board idempotent.
export const boardRuns = sqliteTable(
  'board_runs',
  {
    boardId: text('board_id').notNull(),
    runId: text('run_id').notNull(),
    producerSystem: text('producer_system').notNull(),
    slotId: text('slot_id').notNull(),
    joinedAt: integer('joined_at').notNull(), // epoch ms
  },
  (t) => ({
    uniqueMembership: unique('uq_board_runs_board_run').on(t.boardId, t.runId),
    byBoard: index('idx_board_runs_board').on(t.boardId),
  }),
);

// ── token_events ────────────────────────────────────────────────────────────
// PORTED VERBATIM from apps/server/src/db.ts. One row per assistant turn,
// populated by the ported transcript-ingest watching ~/.claude/projects/**/*.jsonl.
//
// Dedupe: UNIQUE(transcript_file, inode, transcript_line_offset). `inode` is
// nullable for pre-migration rows; NULL falls back to path-only dedupe (legacy
// semantics). This defends against a `.jsonl` truncated + recreated at the same
// path looking identical at offset N.
export const tokenEvents = sqliteTable(
  'token_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ts: integer('ts').notNull(),
    sessionId: text('session_id').notNull(),
    cwd: text('cwd'),
    gitBranch: text('git_branch'),
    model: text('model').notNull(),
    input: integer('input').notNull().default(0),
    cacheRead: integer('cache_read').notNull().default(0),
    cacheWrite5m: integer('cache_write_5m').notNull().default(0),
    cacheWrite1h: integer('cache_write_1h').notNull().default(0),
    output: integer('output').notNull().default(0),
    costUsd: real('cost_usd'),
    requestId: text('request_id'),
    transcriptFile: text('transcript_file').notNull(),
    transcriptLineOffset: integer('transcript_line_offset').notNull(),
    inode: integer('inode'),
  },
  (t) => ({
    dedupe: unique('uq_token_events_dedupe').on(
      t.transcriptFile,
      t.inode,
      t.transcriptLineOffset,
    ),
    byTs: index('idx_token_events_ts').on(t.ts),
    bySession: index('idx_token_events_session').on(t.sessionId),
    byModel: index('idx_token_events_model').on(t.model),
    byCwd: index('idx_token_events_cwd').on(t.cwd),
  }),
);

// ── transcript_offsets ──────────────────────────────────────────────────────
// PORTED VERBATIM from apps/server/src/db.ts. Tracks the last-ingested byte
// offset per transcript file + the (dev,ino) hash at the time. On startup, an
// inode mismatch resets the offset to 0 so a rotated file re-ingests from the top.
export const transcriptOffsets = sqliteTable('transcript_offsets', {
  file: text('file').primaryKey(),
  offset: integer('offset').notNull(),
  updatedAt: integer('updated_at').notNull(),
  inode: integer('inode'),
});

// ── github_commits ───────────────────────────────────────────────────────────
// Read-only snapshot of `git log`, upserted by the github poller (Phase 7).
// Keyed by full SHA so re-polls are idempotent.
export const githubCommits = sqliteTable(
  'github_commits',
  {
    sha: text('sha').primaryKey(),
    shortSha: text('short_sha').notNull(),
    message: text('message').notNull(),
    author: text('author').notNull(),
    authorEmail: text('author_email'),
    date: integer('date').notNull(), // epoch ms
    branch: text('branch'),
  },
  (t) => ({
    byDate: index('idx_github_commits_date').on(t.date),
  }),
);

// ── github_branches ──────────────────────────────────────────────────────────
// Read-only snapshot of local branches (`git for-each-ref`), keyed by name.
export const githubBranches = sqliteTable('github_branches', {
  name: text('name').primaryKey(),
  current: integer('current', { mode: 'boolean' }).notNull().default(false),
  upstream: text('upstream'),
  ahead: integer('ahead'),
  behind: integer('behind'),
  lastCommitSha: text('last_commit_sha'),
  lastCommitDate: integer('last_commit_date'), // epoch ms
});

// ── github_prs ───────────────────────────────────────────────────────────────
// Read-only snapshot of `gh pr list`, keyed by PR number.
export const githubPrs = sqliteTable(
  'github_prs',
  {
    number: integer('number').primaryKey(),
    title: text('title').notNull(),
    state: text('state').notNull(), // open|closed|merged
    author: text('author').notNull(),
    url: text('url').notNull(),
    headRef: text('head_ref').notNull(),
    baseRef: text('base_ref').notNull(),
    isDraft: integer('is_draft', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(), // epoch ms
    updatedAt: integer('updated_at').notNull(), // epoch ms
  },
  (t) => ({
    byState: index('idx_github_prs_state').on(t.state),
    byUpdated: index('idx_github_prs_updated').on(t.updatedAt),
  }),
);

// ── Inferred row types (re-exported for the orchestrator) ────────────────────
export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type ApprovalRow = typeof approvals.$inferSelect;
export type NewApprovalRow = typeof approvals.$inferInsert;
export type BoardRow = typeof boards.$inferSelect;
export type NewBoardRow = typeof boards.$inferInsert;
export type BoardRunRow = typeof boardRuns.$inferSelect;
export type NewBoardRunRow = typeof boardRuns.$inferInsert;
export type TokenEventRow = typeof tokenEvents.$inferSelect;
export type NewTokenEventRow = typeof tokenEvents.$inferInsert;
export type TranscriptOffsetRow = typeof transcriptOffsets.$inferSelect;
export type NewTranscriptOffsetRow = typeof transcriptOffsets.$inferInsert;
export type GithubCommitRow = typeof githubCommits.$inferSelect;
export type NewGithubCommitRow = typeof githubCommits.$inferInsert;
export type GithubBranchRow = typeof githubBranches.$inferSelect;
export type NewGithubBranchRow = typeof githubBranches.$inferInsert;
export type GithubPrRow = typeof githubPrs.$inferSelect;
export type NewGithubPrRow = typeof githubPrs.$inferInsert;
