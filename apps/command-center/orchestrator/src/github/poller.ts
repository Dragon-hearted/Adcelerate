// ─────────────────────────────────────────────────────────────────────────────
// GitHub poller — READ-ONLY local insights from `git` + the `gh` CLI on an
// interval (GH_POLL_MS, default 30s). It shells `git log` / `git for-each-ref`
// for commits + branches and `gh pr list --json` for pull requests, upserts the
// github_* tables, and broadcasts `github:update` (GitHubActivity).
//
// Resilience contract: NOTHING here may crash the process or the interval. `gh`
// missing (ENOENT), `gh` not authenticated (non-zero exit), or a non-repo cwd
// all degrade to "keep last-known / empty" — never a throw. Each source is
// fetched independently so a `gh` outage doesn't blank out commits/branches.
// ─────────────────────────────────────────────────────────────────────────────

import { notInArray, sql } from 'drizzle-orm';
import type {
  Commit,
  Branch,
  PullRequest,
  PullRequestState,
  GitHubActivity,
} from '@command-center/shared';
import { config } from '../config';
import { db } from '../db/client';
import { githubCommits, githubBranches, githubPrs } from '../db/schema';
import { eventBus } from '../bus/event-bus';
import { run } from '../util/exec';

const US = '\x1f'; // unit separator between fields
const COMMIT_LIMIT = 50;
const PR_LIMIT = 50;

interface PollerOptions {
  repoRoot?: string;
  intervalMs?: number;
}

interface Fetched<T> {
  ok: boolean;
  rows: T[];
}

let lastActivity: GitHubActivity | null = null;

/** Last successful (or last-attempted) poll snapshot, for GET /api/github/activity. */
export function getLastActivity(): GitHubActivity | null {
  return lastActivity;
}

// ── parsing ──────────────────────────────────────────────────────────────────

async function fetchCommits(repoRoot: string): Promise<Fetched<Commit>> {
  try {
    const fmt = ['%H', '%h', '%an', '%ae', '%cI', '%s'].join(US);
    const r = await run('git', [
      '-C', repoRoot, 'log', '--no-color', `-n`, String(COMMIT_LIMIT), `--pretty=format:${fmt}`,
    ]);
    if (r.code !== 0) return { ok: false, rows: [] };
    const rows: Commit[] = [];
    for (const line of r.stdout.split('\n')) {
      if (!line) continue;
      const [sha, shortSha, author, authorEmail, dateIso, ...rest] = line.split(US);
      if (!sha) continue;
      const message = rest.join(US); // subject is single-line, but rejoin defensively
      const date = Date.parse(dateIso ?? '');
      rows.push({
        sha,
        shortSha: shortSha ?? sha.slice(0, 7),
        message: message ?? '',
        author: author ?? '',
        authorEmail: authorEmail || undefined,
        date: Number.isNaN(date) ? 0 : date,
      });
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, rows: [] };
  }
}

async function fetchBranches(repoRoot: string): Promise<Fetched<Branch>> {
  try {
    let current = '';
    try {
      const cur = await run('git', ['-C', repoRoot, 'branch', '--show-current']);
      current = cur.stdout.trim();
    } catch {
      /* detached HEAD or no repo */
    }
    const fmt = [
      '%(refname:short)', '%(upstream:short)', '%(objectname)',
      '%(committerdate:unix)', '%(upstream:track)',
    ].join(US);
    const r = await run('git', [
      '-C', repoRoot, 'for-each-ref', `--format=${fmt}`, 'refs/heads',
    ]);
    if (r.code !== 0) return { ok: false, rows: [] };
    const rows: Branch[] = [];
    for (const line of r.stdout.split('\n')) {
      if (!line) continue;
      const [name, upstream, sha, dateUnix, track] = line.split(US);
      if (!name) continue;
      const { ahead, behind } = parseTrack(track ?? '');
      const secs = Number(dateUnix);
      rows.push({
        name,
        current: name === current,
        upstream: upstream || undefined,
        ahead,
        behind,
        lastCommitSha: sha || undefined,
        lastCommitDate: Number.isFinite(secs) && secs > 0 ? secs * 1000 : undefined,
      });
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, rows: [] };
  }
}

// `%(upstream:track)` → "[ahead 2, behind 1]" | "[ahead 3]" | "[behind 4]" | "[gone]" | ""
export function parseTrack(track: string): { ahead?: number; behind?: number } {
  const ahead = /ahead (\d+)/.exec(track);
  const behind = /behind (\d+)/.exec(track);
  return {
    ahead: ahead ? Number(ahead[1]) : undefined,
    behind: behind ? Number(behind[1]) : undefined,
  };
}

interface GhPr {
  number: number;
  title: string;
  state: string;
  author?: { login?: string };
  url: string;
  headRefName: string;
  baseRefName: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchPrs(repoRoot: string): Promise<Fetched<PullRequest>> {
  try {
    const r = await run('gh', [
      'pr', 'list',
      '--state', 'all',
      '--limit', String(PR_LIMIT),
      '--json', 'number,title,state,author,url,headRefName,baseRefName,isDraft,createdAt,updatedAt',
    ], { cwd: repoRoot });
    // gh exits non-zero when not authed / no remote / not installed-but-found.
    if (r.code !== 0 || !r.stdout.trim()) return { ok: false, rows: [] };
    let parsed: GhPr[];
    try {
      parsed = JSON.parse(r.stdout) as GhPr[];
    } catch {
      return { ok: false, rows: [] };
    }
    const rows: PullRequest[] = parsed.map((p) => ({
      number: p.number,
      title: p.title ?? '',
      state: normalizePrState(p.state),
      author: p.author?.login ?? '',
      url: p.url ?? '',
      headRef: p.headRefName ?? '',
      baseRef: p.baseRefName ?? '',
      isDraft: Boolean(p.isDraft),
      createdAt: toMs(p.createdAt),
      updatedAt: toMs(p.updatedAt),
    }));
    return { ok: true, rows };
  } catch {
    // ENOENT (gh not installed) lands here — degrade quietly.
    return { ok: false, rows: [] };
  }
}

export function normalizePrState(s: string): PullRequestState {
  const v = (s ?? '').toLowerCase();
  if (v === 'merged') return 'merged';
  if (v === 'closed') return 'closed';
  return 'open';
}

export function toMs(iso: string): number {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? 0 : t;
}

// ── persistence (upsert; prune removed branches/PRs on a successful fetch) ────

function persistCommits(rows: Commit[]): void {
  if (rows.length === 0) return;
  try {
    db.insert(githubCommits)
      .values(rows.map((c) => ({
        sha: c.sha,
        shortSha: c.shortSha,
        message: c.message,
        author: c.author,
        authorEmail: c.authorEmail ?? null,
        date: c.date,
        branch: c.branch ?? null,
      })))
      .onConflictDoUpdate({
        target: githubCommits.sha,
        set: { message: sqlExcluded('message'), author: sqlExcluded('author'), date: sqlExcluded('date') },
      })
      .run();
  } catch (err) {
    console.error('[github] persist commits failed:', err);
  }
}

function persistBranches(rows: Branch[]): void {
  try {
    const names = rows.map((b) => b.name);
    if (names.length > 0) {
      db.delete(githubBranches).where(notInArray(githubBranches.name, names)).run();
    }
    if (rows.length > 0) {
      db.insert(githubBranches)
        .values(rows.map((b) => ({
          name: b.name,
          current: b.current,
          upstream: b.upstream ?? null,
          ahead: b.ahead ?? null,
          behind: b.behind ?? null,
          lastCommitSha: b.lastCommitSha ?? null,
          lastCommitDate: b.lastCommitDate ?? null,
        })))
        .onConflictDoUpdate({
          target: githubBranches.name,
          set: {
            current: sqlExcluded('current'),
            upstream: sqlExcluded('upstream'),
            ahead: sqlExcluded('ahead'),
            behind: sqlExcluded('behind'),
            lastCommitSha: sqlExcluded('last_commit_sha'),
            lastCommitDate: sqlExcluded('last_commit_date'),
          },
        })
        .run();
    }
  } catch (err) {
    console.error('[github] persist branches failed:', err);
  }
}

function persistPrs(rows: PullRequest[]): void {
  try {
    const numbers = rows.map((p) => p.number);
    if (numbers.length > 0) {
      db.delete(githubPrs).where(notInArray(githubPrs.number, numbers)).run();
    }
    if (rows.length > 0) {
      db.insert(githubPrs)
        .values(rows.map((p) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          author: p.author,
          url: p.url,
          headRef: p.headRef,
          baseRef: p.baseRef,
          isDraft: p.isDraft,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })))
        .onConflictDoUpdate({
          target: githubPrs.number,
          set: {
            title: sqlExcluded('title'),
            state: sqlExcluded('state'),
            isDraft: sqlExcluded('is_draft'),
            updatedAt: sqlExcluded('updated_at'),
          },
        })
        .run();
    }
  } catch (err) {
    console.error('[github] persist prs failed:', err);
  }
}

// Drizzle helper: reference the conflicting row's column in an upsert SET.
function sqlExcluded(col: string) {
  return sql.raw(`excluded.${col}`);
}

// ── DB readers (routes read persisted state; survives a restart pre-first-poll)─

export function readCommits(limit = 50): Commit[] {
  const rows = db.select().from(githubCommits).all();
  return rows
    .map((r) => ({
      sha: r.sha,
      shortSha: r.shortSha,
      message: r.message,
      author: r.author,
      authorEmail: r.authorEmail ?? undefined,
      date: r.date,
      branch: r.branch ?? undefined,
    }))
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}

export function readBranches(): Branch[] {
  return db.select().from(githubBranches).all().map((r) => ({
    name: r.name,
    current: r.current,
    upstream: r.upstream ?? undefined,
    ahead: r.ahead ?? undefined,
    behind: r.behind ?? undefined,
    lastCommitSha: r.lastCommitSha ?? undefined,
    lastCommitDate: r.lastCommitDate ?? undefined,
  })).sort((a, b) => (b.lastCommitDate ?? 0) - (a.lastCommitDate ?? 0));
}

export function readPrs(): PullRequest[] {
  return db.select().from(githubPrs).all().map((r) => ({
    number: r.number,
    title: r.title,
    state: r.state as PullRequestState,
    author: r.author,
    url: r.url,
    headRef: r.headRef,
    baseRef: r.baseRef,
    isDraft: r.isDraft,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })).sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── lifecycle ────────────────────────────────────────────────────────────────

export async function startGithubPoller(opts: PollerOptions = {}): Promise<() => Promise<void>> {
  const repoRoot = opts.repoRoot ?? config.REPO_ROOT;
  const intervalMs = opts.intervalMs ?? config.GH_POLL_MS;

  let polling = false;
  let stopped = false;

  async function pollOnce(): Promise<void> {
    if (polling || stopped) return; // never overlap polls
    polling = true;
    try {
      const [c, b, p] = await Promise.all([
        fetchCommits(repoRoot),
        fetchBranches(repoRoot),
        fetchPrs(repoRoot),
      ]);
      if (c.ok) persistCommits(c.rows);
      if (b.ok) persistBranches(b.rows);
      if (p.ok) persistPrs(p.rows);

      const activity: GitHubActivity = {
        commits: c.ok ? c.rows : readCommits(),
        branches: b.ok ? b.rows : readBranches(),
        pullRequests: p.ok ? p.rows : readPrs(),
        repoRoot,
        fetchedAt: Date.now(),
      };
      lastActivity = activity;
      eventBus.emitGithubUpdate(activity);
    } catch (err) {
      // Defense in depth — pollOnce must never reject.
      console.error('[github] poll error:', err);
    } finally {
      polling = false;
    }
  }

  // Kick an immediate poll so the panel has data without waiting a full interval.
  void pollOnce();
  const timer = setInterval(() => void pollOnce(), intervalMs);
  console.log(`[github] polling ${repoRoot} every ${intervalMs}ms`);

  return async () => {
    stopped = true;
    clearInterval(timer);
  };
}
