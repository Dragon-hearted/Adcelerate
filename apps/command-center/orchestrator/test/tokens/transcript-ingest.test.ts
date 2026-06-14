// Regression tests for Bug #2: the transcript watcher must NOT ignore its whole
// tree just because the watch root (~/.claude/projects) sits under a
// dot-directory. Covers the pure ignore predicate + a real ingest under a
// dot-ancestor root.
import { describe, it, expect, beforeAll } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runMigrations } from '../../src/db/migrate';
import { sqlite } from '../../src/db/client';
import { startTranscriptIngest, isIgnoredTranscriptPath } from '../../src/tokens/transcript-ingest';

beforeAll(() => {
  runMigrations();
});

describe('isIgnoredTranscriptPath — relative dot-segment ignore', () => {
  const root = '/Users/foo/.claude/projects';

  it('does NOT ignore the watch root itself (despite the .claude ancestor)', () => {
    expect(isIgnoredTranscriptPath(root, root)).toBe(false);
  });

  it('does NOT ignore a normal transcript under the root (the Bug #2 case)', () => {
    // The OLD regex /(^|[/\\])\../ matched this via the `.claude` ancestor →
    // the whole tree was ignored. It must now be watched.
    expect(isIgnoredTranscriptPath(root, `${root}/-Users-bar/abc.jsonl`)).toBe(false);
  });

  it('still ignores a dot-dir INSIDE the tree', () => {
    expect(isIgnoredTranscriptPath(root, `${root}/proj/.git/config`)).toBe(true);
  });

  it('still ignores a dot-file INSIDE the tree', () => {
    expect(isIgnoredTranscriptPath(root, `${root}/.hidden.jsonl`)).toBe(true);
  });

  it('does not ignore deep non-dot paths', () => {
    expect(isIgnoredTranscriptPath(root, `${root}/-p/sub/dir/session.jsonl`)).toBe(false);
  });
});

describe('startTranscriptIngest — ingests under a dot-ancestor root', () => {
  it('ingests a transcript even when the watch root sits under a dot-directory', async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), 'cc-ingest-'));
    // Root under a dot-directory ('.cfg') to mimic ~/.claude/projects.
    const root = path.join(base, '.cfg', 'projects');
    await mkdir(path.join(root, '-proj'), { recursive: true });
    const file = path.join(root, '-proj', 'session.jsonl');
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'ingest-sess',
      cwd: '/r',
      gitBranch: 'main',
      timestamp: '2026-01-15T12:00:00.000Z',
      requestId: 'r1',
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 100, output_tokens: 50 } },
    }) + '\n';
    await writeFile(file, line);

    let resolveRow: (r: unknown) => void = () => {};
    const got = new Promise<unknown>((res) => {
      resolveRow = res;
    });
    const stop = await startTranscriptIngest({
      rootDir: root,
      debounceMs: 50,
      onTokenEvent: (r) => resolveRow(r),
    });
    try {
      const row = (await Promise.race([
        got,
        new Promise((_, rej) => setTimeout(() => rej(new Error('no ingest within 20s')), 20_000)),
      ])) as { session_id: string };
      expect(row.session_id).toBe('ingest-sess');

      const count = (
        sqlite.prepare('SELECT COUNT(*) AS c FROM token_events WHERE session_id = ?').get('ingest-sess') as {
          c: number;
        }
      ).c;
      expect(count).toBeGreaterThanOrEqual(1);
    } finally {
      await stop();
      await rm(base, { recursive: true, force: true });
    }
  }, 30_000);
});
