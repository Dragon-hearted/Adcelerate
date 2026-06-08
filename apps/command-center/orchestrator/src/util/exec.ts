// ─────────────────────────────────────────────────────────────────────────────
// exec — a tiny promisified `execFile` wrapper for shelling out to `git`/`gh`.
//
// Read-only by construction at the call sites (git diff/log/for-each-ref, gh pr
// list / gh api). NEVER pass user input as the command name; arguments are
// passed as an argv array (execFile, not a shell string) so there's no shell
// interpolation / injection surface.
// ─────────────────────────────────────────────────────────────────────────────

import { execFile } from 'node:child_process';

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  cwd?: string;
  /** Hard cap on captured stdout/stderr (bytes). Diffs/logs can be large. */
  maxBuffer?: number;
  /** Kill the child after this many ms (defends against a hung `gh`). */
  timeoutMs?: number;
}

const DEFAULT_MAX_BUFFER = 16 * 1024 * 1024; // 16 MB
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Run `cmd args…` and resolve with {code, stdout, stderr}. A non-zero exit is
 * NOT thrown — many of our callers treat a non-zero exit as a normal outcome
 * (`git diff` exits 1 when there are differences; `gh` exits non-zero when not
 * authenticated). Only a spawn failure (ENOENT — binary missing) rejects.
 */
export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        cwd: opts.cwd,
        maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          // Binary not found — a real failure the caller must handle (e.g. `gh`
          // not installed). Distinguish from a non-zero exit.
          reject(err);
          return;
        }
        // execFile sets err for non-zero exit / timeout; surface the code but
        // still resolve so callers can branch on it.
        const code =
          err && typeof (err as { code?: unknown }).code === 'number'
            ? ((err as { code: number }).code)
            : err
              ? 1
              : 0;
        resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
      },
    );
  });
}
