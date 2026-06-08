// Tests the one-time legacy migration: correct per-session seq backfill (by
// timestamp order) + full idempotency (a second run copies nothing).
import { describe, it, expect, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runMigrations } from '../../src/db/migrate';
import { sqlite } from '../../src/db/client';
import { importLegacy } from '../../src/db/import-legacy';

beforeAll(() => {
  runMigrations();
});

async function makeLegacyDb(): Promise<{ dir: string; file: string }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cc-legacy-'));
  const file = path.join(dir, 'events.db');
  const db = new Database(file, { create: true });
  // Put the fixture in WAL journal mode — this is the shape that crashed the
  // old `new Database(path, {readonly:true})` open (SQLITE_CANTOPEN). The import
  // must open + read it without throwing.
  db.exec('PRAGMA journal_mode = WAL');
  db.run(`CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_app TEXT NOT NULL, session_id TEXT NOT NULL, hook_event_type TEXT NOT NULL,
    payload TEXT, chat TEXT, summary TEXT, timestamp INTEGER NOT NULL,
    humanInTheLoop TEXT, humanInTheLoopStatus TEXT, model_name TEXT
  )`);
  db.run(`CREATE TABLE token_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, session_id TEXT NOT NULL,
    cwd TEXT, git_branch TEXT, model TEXT NOT NULL,
    input INTEGER, cache_read INTEGER, cache_write_5m INTEGER, cache_write_1h INTEGER,
    output INTEGER, cost_usd REAL, request_id TEXT,
    transcript_file TEXT NOT NULL, transcript_line_offset INTEGER NOT NULL, inode INTEGER
  )`);
  const ev = db.prepare(
    'INSERT INTO events (source_app, session_id, hook_event_type, payload, summary, timestamp, model_name) VALUES (?,?,?,?,?,?,?)',
  );
  // Session L1: insert out of chronological order to prove seq follows timestamp.
  ev.run('legacy', 'L1', 'SessionStart', '{"a":1}', 's', 2000, 'claude-opus-4-7');
  ev.run('legacy', 'L1', 'Stop', '{"a":2}', 's', 1000, 'claude-opus-4-7');
  ev.run('legacy', 'L2', 'SessionStart', 'not-json', null, 1500, null);
  const te = db.prepare(
    'INSERT INTO token_events (ts, session_id, cwd, git_branch, model, input, cache_read, cache_write_5m, cache_write_1h, output, cost_usd, request_id, transcript_file, transcript_line_offset, inode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  );
  te.run(1000, 'L1', '/repo', 'main', 'claude-opus-4-7', 100, 0, 0, 0, 50, 0.5, null, '/t/legacy.jsonl', 0, 7);
  db.close();
  return { dir, file };
}

describe('importLegacy — seq backfill + idempotency', () => {
  it('copies events with per-session seq in timestamp order, and token_events', async () => {
    const { dir, file } = await makeLegacyDb();
    try {
      importLegacy(file);

      // L1 events: ordered by timestamp (1000 then 2000) → seq 1 = Stop, seq 2 = SessionStart.
      const l1 = sqlite
        .prepare('SELECT seq, hook_event_type, timestamp FROM events WHERE session_id = ? ORDER BY seq ASC')
        .all('L1') as { seq: number; hook_event_type: string; timestamp: number }[];
      expect(l1.map((r) => r.seq)).toEqual([1, 2]);
      expect(l1[0]!.hook_event_type).toBe('Stop'); // ts 1000 sorts first
      expect(l1[1]!.hook_event_type).toBe('SessionStart');

      // L2: single event → seq 1; non-JSON payload wrapped, not lost.
      const l2 = sqlite
        .prepare('SELECT seq, payload FROM events WHERE session_id = ?')
        .all('L2') as { seq: number; payload: string }[];
      expect(l2.length).toBe(1);
      expect(l2[0]!.seq).toBe(1);
      expect(JSON.parse(l2[0]!.payload)).toEqual({ raw: 'not-json' });

      // token_events copied verbatim.
      const te = sqlite.prepare('SELECT * FROM token_events WHERE session_id = ?').all('L1') as Record<string, unknown>[];
      expect(te.length).toBe(1);
      expect(te[0]!.input).toBe(100);
      expect(te[0]!.cost_usd).toBeCloseTo(0.5, 9);

      // ── second run is a no-op (idempotent) ──
      const eventsBefore = (sqlite.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number }).c;
      const tokensBefore = (sqlite.prepare('SELECT COUNT(*) AS c FROM token_events').get() as { c: number }).c;
      importLegacy(file);
      const eventsAfter = (sqlite.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number }).c;
      const tokensAfter = (sqlite.prepare('SELECT COUNT(*) AS c FROM token_events').get() as { c: number }).c;
      expect(eventsAfter).toBe(eventsBefore);
      expect(tokensAfter).toBe(tokensBefore);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('is a safe no-op when the legacy DB is missing', () => {
    expect(() => importLegacy('/nonexistent/path/events.db')).not.toThrow();
  });
});
