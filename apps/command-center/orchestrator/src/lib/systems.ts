// ─────────────────────────────────────────────────────────────────────────────
// Systems freshness + lazy-init (slice #40 / ADR-0021, ADR-0022).
//
//   listSystemFreshness() — one `git submodule status` (cwd = repo root), parse
//                           each line's leading flag into SystemFreshness facts.
//   ensureSystem(name)    — gated `git submodule update --init systems/<name>`;
//                           no-op when already populated; reject unknown names.
//
// `git submodule status` IS the delivery registry — we parse git's own status
// rather than inventing a version field in systems.yaml.            // ponytail: git-status-is-the-registry
// The lazy-init is a gated `--init` over git's own submodule machinery — git IS
// the downloader (ADR-0021), not a net-new fetcher.       // ponytail: gated-init-not-a-net-new-downloader
// ─────────────────────────────────────────────────────────────────────────────

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config';
import type { SystemFreshness } from '@command-center/shared';

// Injectable exec — defaults to promisified execFile (args array, NEVER a shell
// string, so a submodule name can never be interpolated into a command). The
// test overrides this to feed a fixed `git submodule status` fixture without
// shelling out.
export type ExecFn = (file: string, args: string[], opts: { cwd: string }) => Promise<{ stdout: string }>;

const execFileAsync = promisify(execFile);
const defaultExec: ExecFn = (file, args, opts) =>
  execFileAsync(file, args, opts).then((r) => ({ stdout: r.stdout.toString() }));

// The known module set — the only names we will ever pass to `git submodule
// update`. Derived statically from .gitmodules (8 systems); guards ensureSystem
// against interpolating an unsanitized path into git.
export const KNOWN_SYSTEMS = [
  'auto-editor',
  'pinboard',
  'scene-board',
  'instagram-scrapper',
  'image-engine',
  'readme-engine',
  'prompt-writer',
  'MoodBoarder',
] as const;

// Parse `git submodule status` output → SystemFreshness[]. Each line is:
//   "<flag><40-char-sha> <path> (<describe>)"   flag ∈ { ' ', '+', '-', 'U' }
//     ' ' → in-sync with the pin   → populated, no drift
//     '+' → checked-out ≠ pin      → populated, drift
//     '-' → not initialized        → not populated
// (a leading ' ' is dropped by line-trimming, so detect drift/missing by the
// first non-space char and fall back to in-sync.)
export function parseSubmoduleStatus(stdout: string): SystemFreshness[] {
  const rows: SystemFreshness[] = [];
  for (const raw of stdout.split('\n')) {
    if (raw.trim() === '') continue;
    // The flag is the first char; ' ' (in-sync) lines may have it stripped by
    // upstream trimming, so test the raw first char explicitly.
    const flag = raw[0];
    const hasFlag = flag === '+' || flag === '-' || flag === 'U';
    const body = hasFlag ? raw.slice(1) : raw.replace(/^ /, '');
    const parts = body.trim().split(/\s+/);
    const pinnedSha = parts[0] ?? '';
    const submodulePath = parts[1] ?? '';
    const name = submodulePath.split('/').pop() ?? submodulePath;
    rows.push({
      name,
      pinnedSha,
      populated: flag !== '-',
      drift: flag === '+',
    });
  }
  return rows;
}

// One shell call → delivery facts for every submodule.
export async function listSystemFreshness(exec: ExecFn = defaultExec): Promise<SystemFreshness[]> {
  const { stdout } = await exec('git', ['submodule', 'status'], { cwd: config.REPO_ROOT });
  return parseSubmoduleStatus(stdout);
}

// Gated lazy-init: no-op if already populated; else `git submodule update --init
// systems/<name>`. Rejects any name outside the known set BEFORE shelling.
export async function ensureSystem(
  name: string,
  exec: ExecFn = defaultExec,
): Promise<{ populated: boolean }> {
  if (!(KNOWN_SYSTEMS as readonly string[]).includes(name)) {
    throw new Error(`unknown system: ${name}`);
  }
  const freshness = await listSystemFreshness(exec);
  const current = freshness.find((s) => s.name === name);
  if (current?.populated) {
    return { populated: true }; // already on disk — gated no-op.
  }
  await exec('git', ['submodule', 'update', '--init', `systems/${name}`], { cwd: config.REPO_ROOT });
  return { populated: true };
}
