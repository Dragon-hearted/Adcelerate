// ─────────────────────────────────────────────────────────────────────────────
// GitHub insight types — populated by the read-only `gh` CLI + `git` poller.
// No remote writes; the poller only ever reads (commits / branches / PRs).
// ─────────────────────────────────────────────────────────────────────────────

export interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorEmail?: string;
  date: number;                // epoch ms
  branch?: string;
}

export interface Branch {
  name: string;
  current: boolean;            // checked-out branch
  upstream?: string;           // e.g. 'origin/master'
  ahead?: number;
  behind?: number;
  lastCommitSha?: string;
  lastCommitDate?: number;     // epoch ms
}

export type PullRequestState = 'open' | 'closed' | 'merged';

export interface PullRequest {
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  url: string;
  headRef: string;             // source branch
  baseRef: string;             // target branch
  isDraft: boolean;
  createdAt: number;           // epoch ms
  updatedAt: number;           // epoch ms
}

export interface GitHubActivity {
  commits: Commit[];
  branches: Branch[];
  pullRequests: PullRequest[];
  repoRoot?: string;
  fetchedAt: number;           // epoch ms — last poll completion
}
