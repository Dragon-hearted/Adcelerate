// ─────────────────────────────────────────────────────────────────────────────
// One-time legacy data migration — copies rows from the legacy
// apps/server/events.db (`events` + `token_events`) into the new Command Center
// schema. IDEMPOTENT and resumable: re-running never duplicates.
//
//   • token_events — copied column-for-column (the ported schema is identical)
//     via INSERT OR IGNORE; the UNIQUE(transcript_file, inode,
//     transcript_line_offset) dedupe makes the copy naturally idempotent.
//   • events — the legacy HookEvent shape is mapped to CCEvent. The new schema
//     requires a per-session monotonic `seq`; we backfill it by ordering each
//     session's legacy rows by (timestamp, id). A bookkeeping table
//     `legacy_import` records every copied legacy id so a second run skips them
//     and continues seq from MAX(seq) — safe to run repeatedly, even after the
//     new app has produced its own live events.
//
// Usage:
//   bun src/db/import-legacy.ts [path/to/legacy/events.db]
//   LEGACY_DB_PATH=… bun src/db/import-legacy.ts
// Default path: <repo>/apps/server/events.db. A missing legacy DB is a no-op
// (exit 0) so `just cc-migrate` is safe on a fresh clone.
// ─────────────────────────────────────────────────────────────────────────────

import { Database } from 'bun:sqlite';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { sqlite as targetDb } from './client';
import { runMigrations } from './migrate';

const DEFAULT_LEGACY = resolve(import.meta.dir, '..', '..', '..', '..', 'server', 'events.db');
const BATCH = 1000;

/**
 * Open the legacy DB for reading WITHOUT crashing on WAL journal mode and
 * WITHOUT mutating the (potentially huge) source file.
 *
 * THE BUG THIS FIXES: a plain `new Database(path, { readonly: true })` throws
 * SQLITE_CANTOPEN on a WAL-mode database when the `-shm`/`-wal` sidecars aren't
 * present/accessible for the read lock — which is exactly the shape of the real
 * 848MB apps/server/events.db. The old open crashed `cc-migrate` at the first
 * prepare(), so no legacy data was backfilled.
 *
 * STRATEGY (robust + non-destructive):
 *   • If the `-wal` is empty/absent (the source was cleanly checkpointed — the
 *     normal case after the old server stops), open with `?immutable=1`. SQLite
 *     then reads the committed main-db pages directly, skipping all locking and
 *     the `-wal`/`-shm` entirely — it can't hit the readonly-WAL crash and it
 *     never writes a byte to the source.
 *   • If the `-wal` DOES carry un-checkpointed frames, `immutable` would read
 *     STALE pages and miss them — so fall back to a normal read-write open,
 *     which attaches the `-wal` and exposes the latest committed state. We only
 *     ever issue SELECTs, so the source is not logically modified.
 */
function openLegacyForRead(legacyPath: string): Database {
  const walPath = `${legacyPath}-wal`;
  let walHasData = false;
  try {
    walHasData = existsSync(walPath) && statSync(walPath).size > 0;
  } catch {
    walHasData = false;
  }
  if (!walHasData) {
    return new Database(`file:${legacyPath}?immutable=1`, { readonly: true });
  }
  // Un-checkpointed frames present — read-write so the -wal is visible.
  return new Database(legacyPath);
}

interface LegacyEventRow {
  id: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: string | null;
  summary: string | null;
  model_name: string | null;
  timestamp: number;
}

function ensureBookkeeping(): void {
  targetDb.run(`
    CREATE TABLE IF NOT EXISTS legacy_import (
      legacy_table TEXT NOT NULL,
      legacy_id INTEGER NOT NULL,
      PRIMARY KEY (legacy_table, legacy_id)
    )
  `);
}

function tableExists(dbh: Database, name: string): boolean {
  const row = dbh
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name) as { name?: string } | undefined;
  return !!row?.name;
}

function importTokenEvents(legacy: Database): number {
  if (!tableExists(legacy, 'token_events')) {
    console.log('[import] legacy has no token_events — skipping');
    return 0;
  }
  const rows = legacy.prepare('SELECT * FROM token_events').all() as Record<string, unknown>[];
  const insert = targetDb.prepare(`
    INSERT OR IGNORE INTO token_events
      (ts, session_id, cwd, git_branch, model, input, cache_read, cache_write_5m, cache_write_1h, output, cost_usd, request_id, transcript_file, transcript_line_offset, inode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let copied = 0;
  const tx = targetDb.transaction((batch: Record<string, unknown>[]) => {
    for (const r of batch) {
      const res = insert.run(
        r.ts as number,
        r.session_id as string,
        (r.cwd as string) ?? null,
        (r.git_branch as string) ?? null,
        r.model as string,
        (r.input as number) ?? 0,
        (r.cache_read as number) ?? 0,
        (r.cache_write_5m as number) ?? 0,
        (r.cache_write_1h as number) ?? 0,
        (r.output as number) ?? 0,
        (r.cost_usd as number) ?? null,
        (r.request_id as string) ?? null,
        r.transcript_file as string,
        r.transcript_line_offset as number,
        (r.inode as number) ?? null,
      );
      if (res.changes > 0) copied++;
    }
  });
  for (let i = 0; i < rows.length; i += BATCH) tx(rows.slice(i, i + BATCH));
  console.log(`[import] token_events: ${copied} copied (${rows.length - copied} already present) of ${rows.length}`);
  return copied;
}

function importEvents(legacy: Database): number {
  if (!tableExists(legacy, 'events')) {
    console.log('[import] legacy has no events — skipping');
    return 0;
  }
  // Order globally by session then chronological so seq is assigned in time order.
  const rows = legacy
    .prepare(`
      SELECT id, source_app, session_id, hook_event_type, payload, summary, model_name, timestamp
      FROM events
      ORDER BY session_id ASC, timestamp ASC, id ASC
    `)
    .all() as LegacyEventRow[];

  const alreadyImported = targetDb.prepare(
    "SELECT 1 FROM legacy_import WHERE legacy_table = 'events' AND legacy_id = ?",
  );
  const maxSeqFor = targetDb.prepare(
    'SELECT COALESCE(MAX(seq), 0) AS m FROM events WHERE session_id = ?',
  );
  const insertEvent = targetDb.prepare(`
    INSERT INTO events
      (seq, source_app, session_id, agent_name, hook_event_type, payload, tool_name, tool_use_id, summary, model_name, cost_usd, timestamp)
    VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, NULL, ?)
  `);
  const mark = targetDb.prepare(
    "INSERT OR IGNORE INTO legacy_import (legacy_table, legacy_id) VALUES ('events', ?)",
  );

  // Per-session running seq, seeded from the new DB's current MAX(seq).
  const seqBySession = new Map<string, number>();
  let copied = 0;

  const tx = targetDb.transaction((batch: LegacyEventRow[]) => {
    for (const r of batch) {
      // Idempotent skip: this legacy id was copied on a prior run.
      if (alreadyImported.get(r.id)) continue;

      let seq = seqBySession.get(r.session_id);
      if (seq === undefined) {
        const m = maxSeqFor.get(r.session_id) as { m: number } | undefined;
        seq = Number(m?.m ?? 0);
      }
      seq += 1;
      seqBySession.set(r.session_id, seq);

      // payload is stored as JSON TEXT in both schemas; keep it as-is when it
      // already parses, else wrap the raw string so nothing is lost.
      let payloadText = r.payload ?? '{}';
      try {
        JSON.parse(payloadText);
      } catch {
        payloadText = JSON.stringify({ raw: r.payload });
      }

      insertEvent.run(
        seq,
        r.source_app ?? 'legacy',
        r.session_id,
        r.hook_event_type,
        payloadText,
        r.summary ?? null,
        r.model_name ?? null,
        r.timestamp,
      );
      mark.run(r.id);
      copied++;
    }
  });
  for (let i = 0; i < rows.length; i += BATCH) tx(rows.slice(i, i + BATCH));
  console.log(`[import] events: ${copied} copied (${rows.length - copied} already present) of ${rows.length}`);
  return copied;
}

export function importLegacy(legacyPath: string): void {
  if (!existsSync(legacyPath)) {
    console.log(`[import] no legacy DB at ${legacyPath} — nothing to migrate (ok).`);
    return;
  }
  console.log(`[import] migrating from ${legacyPath}`);
  // Make sure the destination schema exists before we write.
  runMigrations();
  ensureBookkeeping();

  const legacy = openLegacyForRead(legacyPath);
  try {
    const t = importTokenEvents(legacy);
    const e = importEvents(legacy);
    console.log(`[import] done — ${t} token_events + ${e} events newly copied.`);
  } finally {
    legacy.close();
  }
}

if (import.meta.main) {
  const legacyPath = process.argv[2] ?? process.env.LEGACY_DB_PATH ?? DEFAULT_LEGACY;
  try {
    importLegacy(legacyPath);
  } catch (err) {
    console.error('[import] failed:', err);
    process.exitCode = 1;
  }
}
