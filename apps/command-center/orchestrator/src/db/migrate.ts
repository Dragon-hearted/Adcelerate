// ─────────────────────────────────────────────────────────────────────────────
// Migration runner — applies generated SQL migrations to the SQLite database.
// Run via `bun run migrate` (or call `runMigrations()` on orchestrator boot).
// ─────────────────────────────────────────────────────────────────────────────

import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { resolve } from 'node:path';
import { db, sqlite } from './client';

const migrationsFolder = resolve(import.meta.dir, 'migrations');

export function runMigrations(): void {
  migrate(db, { migrationsFolder });
}

// Allow `bun src/db/migrate.ts` as a standalone entrypoint.
if (import.meta.main) {
  try {
    runMigrations();
    // eslint-disable-next-line no-console
    console.log(`✓ migrations applied from ${migrationsFolder}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✗ migration failed:', err);
    process.exitCode = 1;
  } finally {
    sqlite.close();
  }
}
