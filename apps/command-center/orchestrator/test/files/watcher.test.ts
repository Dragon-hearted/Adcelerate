// End-to-end file watcher test: a real temp git repo, a simulated agent
// Write tool_use, then a real file write — asserting the broadcast
// `file:changed` carries the git diff AND the correct agent attribution.
import { describe, it, expect, beforeAll } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runMigrations } from '../../src/db/migrate';
import { eventBus } from '../../src/bus/event-bus';
import { startFileWatcher } from '../../src/files/watcher';
import { run } from '../../src/util/exec';

beforeAll(() => {
  runMigrations();
});

async function gitInit(dir: string): Promise<void> {
  await run('git', ['-C', dir, 'init']);
  await run('git', ['-C', dir, 'config', 'user.email', 'test@example.com']);
  await run('git', ['-C', dir, 'config', 'user.name', 'Test']);
  await run('git', ['-C', dir, 'config', 'commit.gpgsign', 'false']);
}

function waitForFileChange(predicate: (c: any) => boolean, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      off();
      reject(new Error('timed out waiting for file:changed'));
    }, timeoutMs);
    const off = eventBus.onFileChanged((c) => {
      if (predicate(c)) {
        clearTimeout(timer);
        off();
        resolve(c);
      }
    });
  });
}

describe('startFileWatcher — attribution + diff', () => {
  it('emits file:changed with the git diff and credits the agent that wrote the file', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cc-files-'));
    await gitInit(dir);
    // Commit a base version so a later edit produces a HEAD diff.
    await writeFile(path.join(dir, 'a.txt'), 'line one\n');
    await run('git', ['-C', dir, 'add', '.']);
    await run('git', ['-C', dir, 'commit', '-m', 'base']);

    const stop = await startFileWatcher({ repoRoot: dir });
    try {
      const pending = waitForFileChange((c) => c.path === 'a.txt' && c.changeType === 'modify', 20_000);

      // Simulate the agent's Write tool_use (PreToolUse) BEFORE the write so the
      // attribution map is seeded.
      eventBus.emit({
        session_id: 'sess-files',
        agent_name: 'backend',
        hook_event_type: 'PreToolUse',
        tool_name: 'Write',
        payload: { tool_input: { file_path: path.join(dir, 'a.txt') } },
      });

      await writeFile(path.join(dir, 'a.txt'), 'line one\nline two\n');

      const change = await pending;
      expect(change.path).toBe('a.txt');
      expect(change.changeType).toBe('modify');
      expect(change.agentName).toBe('backend');
      expect(change.sessionId).toBe('sess-files');
      expect(change.additions).toBeGreaterThanOrEqual(1);
      expect(change.diff).toContain('line two');
    } finally {
      await stop();
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  // Regression: an agent's own Write reported an ABSOLUTE tool_input.file_path
  // (e.g. /private/tmp/repo/h.ts) while chokidar emits the /tmp form — on macOS
  // /tmp → /private/tmp, so the old absolute-keyed map never matched and
  // attribution was silently lost. canonicalRel() realpaths both sides.
  it('attributes an agent Write when tool_input.file_path is absolute under a symlinked tmp root', async () => {
    // Create the repo under /tmp specifically to exercise the symlink divergence.
    const dir = await mkdtemp(path.join('/tmp', 'cc-files-sym-'));
    await gitInit(dir);
    await writeFile(path.join(dir, 'h.ts'), 'alpha\n');
    await run('git', ['-C', dir, 'add', '.']);
    await run('git', ['-C', dir, 'commit', '-m', 'base']);

    const stop = await startFileWatcher({ repoRoot: dir });
    try {
      const pending = waitForFileChange((c) => c.path === 'h.ts' && c.changeType === 'modify', 20_000);
      // The tool path is the /tmp (un-realpath'd) absolute form — the exact
      // shape the frontend saw produce agentName=undefined before the fix.
      eventBus.emit({
        session_id: 'sess-sym',
        agent_name: 'frontend',
        hook_event_type: 'PreToolUse',
        tool_name: 'Write',
        payload: { tool_input: { file_path: path.join(dir, 'h.ts') } },
      });
      await writeFile(path.join(dir, 'h.ts'), 'alpha\nbeta\n');

      const change = await pending;
      expect(change.path).toBe('h.ts');
      expect(change.agentName).toBe('frontend');
      expect(change.sessionId).toBe('sess-sym');
    } finally {
      await stop();
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
