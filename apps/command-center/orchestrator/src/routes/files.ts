// ─────────────────────────────────────────────────────────────────────────────
// /api/files — working-tree change list + on-demand diff.
//
//   GET /api/files/changes?limit=  → newest-first recent FileChange[] (ring buffer)
//   GET /api/files/diff?path=      → fresh unified diff for one repo-relative path
//
// The diff path is validated to stay INSIDE the repo root (no `../` traversal,
// no absolute escape) before it's handed to `git diff`.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { getRecentChanges, getRepoRoot, computeDiff } from '../files/watcher';

interface FilesQuery {
  limit?: string;
  path?: string;
}

const PATH_MAX_LEN = 4096;

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/files/changes?limit= — recent working-tree changes (newest first).
  app.get<{ Querystring: FilesQuery }>('/api/files/changes', async (req) => {
    const limit = clampLimit(req.query.limit, 100, 200);
    return getRecentChanges(limit);
  });

  // GET /api/files/diff?path= — unified diff for a single repo-relative path.
  app.get<{ Querystring: FilesQuery }>('/api/files/diff', async (req, reply) => {
    const raw = req.query.path;
    if (!raw) {
      return reply.code(400).type('text/plain').send('path is required');
    }
    if (raw.length > PATH_MAX_LEN) {
      return reply.code(400).type('text/plain').send('path too long');
    }

    const repoRoot = getRepoRoot();
    const abs = path.resolve(repoRoot, raw);
    // Containment check — abs must be repoRoot itself or a descendant.
    const rel = path.relative(repoRoot, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return reply.code(400).type('text/plain').send('path escapes repo root');
    }

    const relPath = rel || path.basename(abs);
    const diff = await computeDiff(repoRoot, relPath, 'modify');
    let additions = 0;
    let deletions = 0;
    for (const line of diff.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }
    return { path: relPath, diff, additions, deletions };
  });
}

function clampLimit(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
