// ─────────────────────────────────────────────────────────────────────────────
// File watcher — Chokidar over REPO_ROOT. On a working-tree change it computes
// the `git diff` for the path, attributes the change to the agent whose most
// recent Write/Edit/MultiEdit/NotebookEdit tool_use touched that path, and
// broadcasts `file:changed` (+ a persisted cc.file.changed CCEvent when the
// change is attributable to a session, so it lands in that agent's replay log).
//
// Attribution seam: we subscribe to the in-process EventBus (`eventBus.on`).
// Every PreToolUse event for a file-mutating tool records
// { absPath → (agentName, sessionId, ts) }. A subsequent chokidar change within
// ATTRIBUTION_WINDOW_MS is credited to that agent; otherwise it's unattributed
// (a manual edit, a build artifact, git ops, etc.).
//
// Diff/changes are also retained in a small in-memory ring buffer so
// GET /api/files/changes can answer without a dedicated table.
// ─────────────────────────────────────────────────────────────────────────────

import chokidar from 'chokidar';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import type { CCEvent, FileChange, FileChangeType } from '@command-center/shared';
import { config } from '../config';
import { eventBus } from '../bus/event-bus';
import { run } from '../util/exec';

// Tools whose tool_input names a file we should attribute changes to.
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Directory segments never worth watching (noise + churn).
const IGNORED_DIR_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
  'out',
]);

// File suffixes to ignore (our own sqlite WAL, logs, lockfiles).
const IGNORED_SUFFIXES = ['.db', '.db-wal', '.db-shm', '.db-journal', '.log'];

// A tool_use older than this (relative to the file change) is NOT credited —
// avoids mislabeling a much-later manual edit as the agent's work.
const ATTRIBUTION_WINDOW_MS = 60_000;

// Coalesce rapid-fire saves of the same path.
const DEBOUNCE_MS = 150;

// Cap the in-memory recent-changes buffer.
const MAX_RECENT = 200;

interface Attribution {
  agentName?: string;
  sessionId?: string;
  ts: number;
}

interface WatcherOptions {
  repoRoot?: string;
}

// ── module-level state (read by routes/files.ts) ─────────────────────────────
const recentChanges: FileChange[] = [];
let activeRepoRoot = config.REPO_ROOT;

/** Newest-first list of recent working-tree changes (for GET /api/files/changes). */
export function getRecentChanges(limit = 100): FileChange[] {
  const n = Math.max(1, Math.min(limit, MAX_RECENT));
  return recentChanges.slice(-n).reverse();
}

/** The repo root the watcher is bound to (for routes that need to run git). */
export function getRepoRoot(): string {
  return activeRepoRoot;
}

/**
 * Canonicalize a path (absolute OR relative, possibly through a symlinked root)
 * to a repo-RELATIVE key. This is the single source of truth for both sides of
 * attribution: the PreToolUse `tool_input.file_path` (commonly ABSOLUTE, e.g.
 * `/private/tmp/repo/hello.ts`) and the chokidar change path MUST canonicalize
 * to the SAME key or attribution silently fails.
 *
 * The macOS gotcha this fixes: `/tmp` is a symlink to `/private/tmp`, so a tool
 * path of `/private/tmp/repo/hello.ts` and a watcher path of `/tmp/repo/...`
 * (or vice-versa) never string-match. realpath both, then relativize.
 */
export function canonicalRel(repoRootReal: string, p: string): string {
  const abs = path.resolve(repoRootReal, p);
  let real = abs;
  try {
    real = realpathSync(abs);
  } catch {
    // File may not exist (a delete, or a pre-write lookup). Realpath the parent
    // dir — which usually exists — and rejoin the basename so a symlinked root
    // still normalizes consistently.
    try {
      real = path.join(realpathSync(path.dirname(abs)), path.basename(abs));
    } catch {
      real = abs;
    }
  }
  const rel = path.relative(repoRootReal, real);
  return rel || path.basename(real);
}

/**
 * Whether a path should be ignored — checked RELATIVE to the repo root so the
 * root's own ancestry can't disqualify the whole tree. (Same class of bug as
 * the transcript watcher's #2: a full-absolute-path segment test means a
 * REPO_ROOT under e.g. `/work/build/app` — where `build` is an IGNORED segment
 * in the ancestry — would ignore every file. Relativizing scopes the check to
 * segments INSIDE the tree.)
 */
function isIgnoredRepoPath(repoRootReal: string, p: string): boolean {
  const rel = path.relative(repoRootReal, p);
  if (rel.startsWith('..')) return false; // outside the root — not ours to ignore
  if (rel !== '') {
    const segments = rel.split(path.sep);
    if (segments.some((seg) => IGNORED_DIR_SEGMENTS.has(seg))) return true;
  }
  if (IGNORED_SUFFIXES.some((suf) => p.endsWith(suf))) return true;
  return false;
}

function filePathFromToolInput(toolName: string, input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  const raw = toolName === 'NotebookEdit' ? obj.notebook_path : obj.file_path;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function countDiff(diff: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { additions, deletions };
}

/**
 * Compute the unified diff for a repo-relative path. Working-tree vs HEAD
 * captures tracked modify/delete; an untracked add (empty HEAD diff) falls back
 * to a `--no-index` diff against /dev/null so new files still render.
 */
export async function computeDiff(
  repoRoot: string,
  relPath: string,
  changeType: FileChangeType,
): Promise<string> {
  let diff = '';
  try {
    const r = await run('git', ['-C', repoRoot, 'diff', 'HEAD', '--', relPath]);
    diff = r.stdout;
  } catch {
    // git missing / not a repo — best-effort, return empty.
    return '';
  }
  if (!diff.trim() && changeType !== 'delete') {
    try {
      const r = await run('git', ['-C', repoRoot, 'diff', '--no-index', '--', '/dev/null', relPath]);
      diff = r.stdout;
    } catch {
      /* ignore — leave diff empty */
    }
  }
  return diff;
}

export async function startFileWatcher(opts: WatcherOptions = {}): Promise<() => Promise<void>> {
  const repoRootInput = path.resolve(opts.repoRoot ?? config.REPO_ROOT);
  // Realpath the root ONCE so the symlinked-tmp case normalizes for every
  // subsequent canonicalRel() call (both attribution + change paths).
  let repoRoot = repoRootInput;
  try {
    repoRoot = realpathSync(repoRootInput);
  } catch {
    /* root may not exist yet — fall back to the resolved input */
  }
  activeRepoRoot = repoRoot;

  // canonical repo-relative path → last file-mutating tool_use that touched it.
  const attribution = new Map<string, Attribution>();

  const unsubscribe = eventBus.on((evt: CCEvent) => {
    if (evt.hook_event_type !== 'PreToolUse') return;
    const toolName = evt.tool_name;
    if (!toolName || !FILE_TOOLS.has(toolName)) return;
    const toolInput = (evt.payload as { tool_input?: unknown })?.tool_input;
    const fp = filePathFromToolInput(toolName, toolInput);
    if (!fp) return;
    // Key by the SAME canonical relative form the change handler looks up by.
    attribution.set(canonicalRel(repoRoot, fp), {
      agentName: evt.agent_name,
      sessionId: evt.session_id,
      ts: evt.timestamp,
    });
  });

  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  let stopping = false;

  const handle = async (abs: string, changeType: FileChangeType): Promise<void> => {
    if (stopping) return;
    // Canonicalize to the SAME repo-relative key the attribution map is keyed by.
    const relPath = canonicalRel(repoRoot, abs);

    let diff = '';
    try {
      diff = await computeDiff(repoRoot, relPath, changeType);
    } catch {
      /* best-effort */
    }
    const { additions, deletions } = countDiff(diff);

    // Attribution: most-recent file-mutating tool_use within the window.
    const attr = attribution.get(relPath);
    const attributed = attr && Date.now() - attr.ts <= ATTRIBUTION_WINDOW_MS ? attr : undefined;

    const change: FileChange = {
      path: relPath,
      changeType,
      agentName: attributed?.agentName,
      sessionId: attributed?.sessionId,
      additions,
      deletions,
      diff,
      timestamp: Date.now(),
    };

    recentChanges.push(change);
    if (recentChanges.length > MAX_RECENT) recentChanges.shift();

    // Live broadcast (drives FileChangePanel).
    eventBus.emitFileChanged(change);

    // Persist a replayable CCEvent only when we can attribute it to a session —
    // an unattributed build/git churn shouldn't fabricate a per-session seq.
    if (attributed?.sessionId) {
      eventBus.emit({
        session_id: attributed.sessionId,
        agent_name: attributed.agentName,
        hook_event_type: 'cc.file.changed',
        summary: `${changeType} ${relPath}`,
        payload: { change },
      });
    }
  };

  const schedule = (abs: string, changeType: FileChangeType) => {
    if (stopping) return;
    if (isIgnoredRepoPath(repoRoot, abs)) return;
    const existing = pending.get(abs);
    if (existing) clearTimeout(existing);
    pending.set(
      abs,
      setTimeout(() => {
        pending.delete(abs);
        if (stopping) return;
        void handle(abs, changeType);
      }, DEBOUNCE_MS),
    );
  };

  const watcher = chokidar.watch(repoRoot, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 40 },
    followSymlinks: false,
    ignored: (p: string) => isIgnoredRepoPath(repoRoot, p),
  });

  watcher.on('add', (p: string) => schedule(p, 'add'));
  watcher.on('change', (p: string) => schedule(p, 'modify'));
  watcher.on('unlink', (p: string) => schedule(p, 'delete'));

  // Bounded wait for the initial scan so a stuck watcher can't wedge boot.
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      readyTimer = setTimeout(() => reject(new Error('file watcher ready timeout (30s)')), 30_000);
      watcher.once('ready', () => {
        if (readyTimer) clearTimeout(readyTimer);
        readyTimer = null;
        resolve();
      });
    });
  } catch (err) {
    if (readyTimer) clearTimeout(readyTimer);
    unsubscribe();
    try {
      await watcher.close();
    } catch {
      /* swallow */
    }
    throw err;
  }

  console.log(`[files] watching ${repoRoot}`);

  return async () => {
    stopping = true;
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
    unsubscribe();
    await watcher.close();
  };
}
