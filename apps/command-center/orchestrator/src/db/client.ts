// ─────────────────────────────────────────────────────────────────────────────
// Drizzle client — bun-sqlite driver (built-in `bun:sqlite`).
//
// Driver decision: we use Bun's native `bun:sqlite` via drizzle-orm/bun-sqlite
// (not better-sqlite3). Rationale:
//   • Parity with the existing monorepo (apps/server uses `bun:sqlite`).
//   • Zero native-compilation step (better-sqlite3 needs node-gyp/prebuilds).
//   • The orchestrator targets the Bun runtime anyway.
// drizzle-kit `generate` is driver-agnostic, so migrations stay portable.
// ─────────────────────────────────────────────────────────────────────────────

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { resolve } from 'node:path';
import { config } from '../config';
import * as schema from './schema';

// Resolve relative DB paths against the orchestrator package root.
const dbPath =
  config.CC_DB_PATH.startsWith('/') || config.CC_DB_PATH === ':memory:'
    ? config.CC_DB_PATH
    : resolve(import.meta.dir, '..', '..', config.CC_DB_PATH);

export const sqlite = new Database(dbPath, { create: true });

// WAL + NORMAL synchronous — matches the legacy apps/server tuning.
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA synchronous = NORMAL');
sqlite.exec('PRAGMA foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
export { schema };
