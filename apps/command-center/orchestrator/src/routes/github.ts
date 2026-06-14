// ─────────────────────────────────────────────────────────────────────────────
// /api/github — read-only insights persisted by the github poller.
//
//   GET /api/github/commits?limit=  → recent commits (newest first)
//   GET /api/github/branches        → local branches
//   GET /api/github/prs?state=      → pull requests (optional open|closed|merged)
//   GET /api/github/activity        → the full GitHubActivity snapshot
//
// Lists read from the github_* tables (so they survive a restart before the
// first poll); /activity prefers the poller's in-memory last snapshot (carries
// a real fetchedAt) and falls back to composing one from the tables.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import type { GitHubActivity, PullRequestState } from '@command-center/shared';
import { config } from '../config';
import { readCommits, readBranches, readPrs, getLastActivity } from '../github/poller';

interface GithubQuery {
  limit?: string;
  state?: string;
}

const ALLOWED_STATES: PullRequestState[] = ['open', 'closed', 'merged'];

export async function githubRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: GithubQuery }>('/api/github/commits', async (req) => {
    const limit = clampLimit(req.query.limit, 50, 200);
    return readCommits(limit);
  });

  app.get('/api/github/branches', async () => {
    return readBranches();
  });

  app.get<{ Querystring: GithubQuery }>('/api/github/prs', async (req) => {
    const stateParam = req.query.state as PullRequestState | undefined;
    const prs = readPrs();
    if (stateParam && ALLOWED_STATES.includes(stateParam)) {
      return prs.filter((p) => p.state === stateParam);
    }
    return prs;
  });

  app.get('/api/github/activity', async (): Promise<GitHubActivity> => {
    const last = getLastActivity();
    if (last) return last;
    // No poll has completed yet — compose from whatever is persisted.
    return {
      commits: readCommits(),
      branches: readBranches(),
      pullRequests: readPrs(),
      repoRoot: config.REPO_ROOT,
      fetchedAt: 0,
    };
  });
}

function clampLimit(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
