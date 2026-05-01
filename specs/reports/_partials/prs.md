# PR Triage — 2026-05-01

## Executive Summary
- Repos with open PRs: 5 (parent, autoCaption, image-engine, pinboard, readme-engine)
- Total open PRs: 7
- MERGE-READY: 0
- NEEDS-REBASE: 5
- WAITING-ON-REVIEW: 2
- NUDGE-AUTHOR: 0
- STALE: 0
- DRAFT: 0
- gh auth status: ok (Dragon-hearted, scopes: gist, read:org, repo, workflow)

Notes:
- `systems/gif-kit` and `systems/pdf-kit` do **not** have dedicated GitHub remotes — `git remote get-url origin` returns `https://github.com/Dragon-hearted/Adcelerate.git`. Their PRs (if any) live on the parent repo, so a separate PR list is not meaningful. Treat as SKIPPED for per-repo PR triage; flagged as a structural issue (worth giving them their own remotes if they're meant to be standalone submodules).
- All five "design-system" branches named `claude/refine-local-plan-d5Iox` were opened 2026-04-25 and four of the five are now in CONFLICTING state — they appear to be a coordinated multi-repo design-system rollout that has drifted off main. Recommend rebasing or closing as a batch.
- One CI failure detected: `autoCaption#1` — `lint-typecheck-test` job failed.
- No closed-but-unmerged PRs in the last 30d across parent + all 9 submodules.

## Open PRs by Repo

### Parent (Adcelerate)
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 9 | feat(pinboard): UI overhaul + CLI launcher rubric pass | Dragon-hearted | 2d | No | SUCCESS (CodeRabbit) | none | MERGEABLE | WAITING-ON-REVIEW | KEEP — fresh; self-merge if no second reviewer expected, otherwise wait on review |
| 7 | feat(design-system): unified token system across all surfaces | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE onto current `master` (likely conflicts with the merged Phase-1 Darkroom + library.yaml regen commits); re-trigger CI |

### systems/autoCaption
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): adopt DS brand-amber for default caption highlight | Dragon-hearted | 6d | No | FAILURE (lint-typecheck-test) | none | CONFLICTING | NEEDS-REBASE (+ failing CI) | REBASE + fix `lint-typecheck-test` regression; if rollout already obsolete, CLOSE |

### systems/gif-kit
SKIPPED: remote `origin` points at `Dragon-hearted/Adcelerate.git`, not a dedicated `gif-kit` repo. No standalone PR list available.

### systems/image-engine
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): add --brand flag to generate scripts | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE — likely conflicts with the recent rotating-key fix on `master`; verify CodeRabbit re-runs cleanly |

### systems/instagram-scrapper
No open PRs.

### systems/pdf-kit
SKIPPED: remote `origin` points at `Dragon-hearted/Adcelerate.git`, not a dedicated `pdf-kit` repo. No standalone PR list available.

### systems/pinboard
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 4 | feat(tui): rubric-compliance pass on launcher CLI surface | Dragon-hearted | 2d | No | SUCCESS (CodeRabbit) | none | MERGEABLE | WAITING-ON-REVIEW | KEEP — fresh; eligible to merge once reviewed (note: parent `master` already has commit `ee8b0ec` "CLI launcher rubric-compliance pass" — confirm this PR isn't already represented upstream before merge) |
| 2 | feat(design-system): migrate TUI + Remotion demo to DS adapters | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE onto `master` (Phase-1 Darkroom + UI overhaul have landed since); re-validate that DS adapter changes still apply |

### systems/prompt-writer
No open PRs.

### systems/readme-engine
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): SVG renderers consume DS adapter | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE; same design-system rollout cohort as the other `claude/refine-local-plan-d5Iox` branches |

### systems/scene-board
No open PRs.

## Closed-but-Unmerged Last 30d (abandoned signals)
| Repo | # | Title | Branch | Closed | Note |
|------|---|-------|--------|--------|------|

_None across parent + all 9 submodules in the 2026-04-01..2026-05-01 window._

## Action Proposal

Triage in this order (highest leverage first):

- [ ] PR pinboard#4 — **review + merge**; design-aligned, mergeable, only 2 days old. Quick win.
- [ ] PR Adcelerate#9 — **review + merge**; mergeable, fresh, ties the pinboard rollout to the parent. Confirm submodule pointer is what you actually want pinned before merging.
- [ ] PR Adcelerate#7 — **rebase** the design-system token unification onto current `master`; resolve conflicts against Phase-1 Darkroom + library.yaml regen, then re-request review.
- [ ] PR pinboard#2 — **rebase**; if the migration to DS adapters is now redundant after the UI overhaul (#4), **close** instead and reopen a fresh PR.
- [ ] PR image-engine#1 — **rebase** against the rotating-key fix, then merge if the `--brand` flag work is still wanted.
- [ ] PR readme-engine#1 — **rebase**; small surface, should be quick once base is current.
- [ ] PR autoCaption#1 — **fix CI** (`lint-typecheck-test` is failing) **then rebase**. If the brand-amber default has already been picked up elsewhere, prefer **close + delete branch**.
- [ ] **Structural follow-up:** decide whether `systems/gif-kit` and `systems/pdf-kit` should have their own GitHub remotes (currently both point at `Dragon-hearted/Adcelerate.git`); without dedicated remotes their PR workflow is broken.
- [ ] **Cohort cleanup:** the five `claude/refine-local-plan-d5Iox` branches across Adcelerate / autoCaption / image-engine / pinboard / readme-engine are a coordinated design-system rollout. Either land them as a batch (rebase all five same day) or close them all and reopen against the new design tokens — letting them sit will keep accruing conflicts.
