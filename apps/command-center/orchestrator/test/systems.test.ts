// ─────────────────────────────────────────────────────────────────────────────
// systems lib — `git submodule status` parser + gated lazy-init (slice #40).
//
// The shell is MOCKED (an injected exec stub feeds a fixed `git submodule status`
// fixture) — no real submodule is ever initialized and git is never run here.
// Asserts: the leading-flag parse (' ' in-sync / '+' drift / '-' not-populated),
// ensureSystem no-ops when populated, and an unknown name is rejected.
// Run against an in-memory DB (CC_DB_PATH=:memory:, see package.json "test").
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, describe } from 'bun:test';
import {
  parseSubmoduleStatus,
  listSystemFreshness,
  ensureSystem,
  type ExecFn,
} from '../src/lib/systems';

// A fixed `git submodule status` fixture covering all three flags:
//   ' ' in-sync (image-engine), '+' drift (pinboard), '-' not-populated (MoodBoarder).
const STATUS_FIXTURE = [
  ' 8524a43f576ecc0fd9b22eea4ac598468d9aabd0 systems/image-engine (heads/main)',
  '+369854645d42fb50a517e5e41268d987a67d844f systems/pinboard (heads/feat/x)',
  '-b2aa71a4dcfab7251bb5e389fd43c32fbe401e11 systems/MoodBoarder',
  '',
].join('\n');

// Build an exec stub that returns the fixture and records every call.
function stubExec(calls: { file: string; args: string[] }[] = []): ExecFn {
  return async (file, args) => {
    calls.push({ file, args });
    return { stdout: STATUS_FIXTURE };
  };
}

describe('parseSubmoduleStatus — leading flag → SystemFreshness', () => {
  test('maps " " / "+" / "-" to populated + drift correctly', () => {
    const rows = parseSubmoduleStatus(STATUS_FIXTURE);
    expect(rows).toEqual([
      {
        name: 'image-engine',
        pinnedSha: '8524a43f576ecc0fd9b22eea4ac598468d9aabd0',
        populated: true,
        drift: false,
      },
      {
        name: 'pinboard',
        pinnedSha: '369854645d42fb50a517e5e41268d987a67d844f',
        populated: true,
        drift: true,
      },
      {
        name: 'MoodBoarder',
        pinnedSha: 'b2aa71a4dcfab7251bb5e389fd43c32fbe401e11',
        populated: false,
        drift: false,
      },
    ]);
  });

  test('ignores blank lines', () => {
    expect(parseSubmoduleStatus('\n\n')).toEqual([]);
  });
});

describe('listSystemFreshness — one shell call through the injected exec', () => {
  test('shells `git submodule status` once and parses the output', async () => {
    const calls: { file: string; args: string[] }[] = [];
    const rows = await listSystemFreshness(stubExec(calls));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ file: 'git', args: ['submodule', 'status'] });
    expect(rows.map((r) => r.name)).toEqual(['image-engine', 'pinboard', 'MoodBoarder']);
  });
});

describe('ensureSystem — gated lazy-init', () => {
  test('no-ops (no update) when the submodule is already populated', async () => {
    const calls: { file: string; args: string[] }[] = [];
    const result = await ensureSystem('image-engine', stubExec(calls));
    expect(result).toEqual({ populated: true });
    // Only the status read — never an `update --init`.
    expect(calls).toEqual([{ file: 'git', args: ['submodule', 'status'] }]);
  });

  test('runs `git submodule update --init systems/<name>` when not populated', async () => {
    const calls: { file: string; args: string[] }[] = [];
    const result = await ensureSystem('MoodBoarder', stubExec(calls));
    expect(result).toEqual({ populated: true });
    expect(calls).toEqual([
      { file: 'git', args: ['submodule', 'status'] },
      { file: 'git', args: ['submodule', 'update', '--init', 'systems/MoodBoarder'] },
    ]);
  });

  test('rejects an unknown name BEFORE shelling (no exec call)', async () => {
    const calls: { file: string; args: string[] }[] = [];
    await expect(ensureSystem('../../etc/passwd', stubExec(calls))).rejects.toThrow(
      /unknown system/,
    );
    expect(calls).toHaveLength(0);
  });
});
