'use client';

import { useEffect } from 'react';
import { GitBranch, GitCommit, GitPullRequest } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { relativeTime } from '@/lib/format';

/**
 * Read-only GitHub insight panel, fed by `github:update`. Renders commits /
 * branches / PRs when the poller is live; otherwise shows an idle hint. The
 * full interactive panel is fleshed out in Phase 7 (sub-stream C).
 */
export function GitHubPanel() {
  const github = useStore((s) => s.github);
  const setGithub = useStore((s) => s.setGithub);

  // Initial REST hydration; the `github:update` socket event keeps it fresh on
  // the poller's interval thereafter.
  useEffect(() => {
    let cancelled = false;
    api
      .githubActivity()
      .then((activity) => {
        if (!cancelled && activity) setGithub(activity);
      })
      .catch(() => {
        /* poller route may not be live yet (sub-stream A) — ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [setGithub]);

  return (
    <section className="flex flex-col">
      <h2 className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>GitHub</span>
        {github && <span className="font-normal">{relativeTime(github.fetchedAt)}</span>}
      </h2>

      {!github ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          Waiting for the GitHub poller…
        </p>
      ) : (
        <div className="space-y-3 p-3">
          {github.pullRequests.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <GitPullRequest className="size-3" /> Pull Requests
              </p>
              <ul className="space-y-1">
                {github.pullRequests.slice(0, 5).map((pr) => (
                  <li key={pr.number} className="flex items-center gap-2 text-xs">
                    <Badge variant={pr.state === 'open' ? 'success' : 'muted'}>#{pr.number}</Badge>
                    <span className="truncate">{pr.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {github.branches.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <GitBranch className="size-3" /> Branches
              </p>
              <ul className="space-y-1">
                {github.branches.slice(0, 5).map((b) => (
                  <li key={b.name} className="flex items-center gap-2 text-xs">
                    {b.current && <span className="text-success">●</span>}
                    <span className="truncate font-mono">{b.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {github.commits.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <GitCommit className="size-3" /> Recent Commits
              </p>
              <ul className="space-y-1">
                {github.commits.slice(0, 6).map((c) => (
                  <li key={c.sha} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{c.shortSha}</span>
                    <span className="truncate">{c.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
