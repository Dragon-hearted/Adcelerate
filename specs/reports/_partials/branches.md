# Branch Audit — 2026-05-01

## Executive Summary
- Repos audited: 8 (parent + 7 actual submodules)
- Total branches counted: 35 (21 local heads + 14 unique remote-only branches)
- Recommended DELETE: 13 (3 parent local+remote, 1 image-engine remote, 4 pinboard local+remote, 1 scene-board local+remote, 4 cross-repo claude/* once parent PR #7 lands — see notes)
- Recommended KEEP: 14 (defaults, currently-checked-out, open-PR heads, and ACTIVE branches)
- Recommended NEEDS-REVIEW: 1 cluster (cross-repo `claude/refine-local-plan-d5Iox` — KEEP individually while PR #7 is open, then bulk-delete)

> Caveat — task scope discrepancy: the brief listed `systems/gif-kit` and `systems/pdf-kit` as submodules with branches such as `feat/pinboard-ui-overhaul`, `feature/adcelerate-v1`, `pinboard-ci-fix`, `pinboard-tui-rewrite`. These directories exist on disk under `/Users/dragonhearted/Desktop/Adcelerate/systems/` but are **NOT** git submodules and **NOT** git repositories (verified via `.gitmodules`, `git ls-tree HEAD systems/`, and absence of any `.git` entry). They are plain untracked working directories containing only `knowledge/`, `node_modules/`, `out/`. There are therefore no branches to enumerate for them; the cross-pollination concern from the brief does not apply. Flagged for engineer awareness — see "Cross-Repo Patterns" below.

## Per-Repo Tables

### Parent (Adcelerate)
Default: `master` | Currently checked out: `feat/pinboard-ui-overhaul`

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes (origin/master) | n/a | DEFAULT | KEEP | Default branch, never delete. |
| `feat/pinboard-ui-overhaul` | 2026-04-29 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Open PR #9; currently checked out. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes (origin ref exists, no upstream config) | no | ACTIVE | KEEP | Open PR #7 (`feat(design-system): unified token system across all surfaces`). Local & remote SHAs match (`52bcdfe`). No upstream tracking set — engineer may want to `git branch --set-upstream-to=origin/claude/refine-local-plan-d5Iox`. |
| `feature/adcelerate-v1` | 2026-03-26 | Devanshu Rana | yes | yes (into master) | MERGED, STALE (36d) | DELETE | Fully merged; safe to delete local + `origin/feature/adcelerate-v1`. |
| `pinboard-ci-fix` | 2026-04-19 | Devanshu Rana | yes | yes | MERGED | DELETE | Fully merged; safe to delete local + remote. |
| `pinboard-tui-rewrite` | 2026-04-18 | Devanshu Rana | yes | yes | MERGED | DELETE | Fully merged; safe to delete local + remote. |

### systems/autoCaption
Default: `master` | Currently checked out: `master` | Pinned SHA: `166869b1` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default; pinned commit lives here. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not merged into master and not ancestor of master. Likely associated with parent PR #7. Bulk-delete after that PR closes. |

### systems/image-engine
Default: `master` | Currently checked out: `feat/dollar-budget-and-key-rotation` | Pinned SHA: `b9449ab4` (on `feat/dollar-budget-and-key-rotation`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-26 | Devanshu Rana | yes | n/a | DEFAULT | KEEP | Default. |
| `feat/dollar-budget-and-key-rotation` | 2026-04-26 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Currently checked out; parent has this submodule pinned to a commit on this branch. Recent commit `bc4eb33 fix(image-engine): bump submodule with rotating-key fix`. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |
| `origin/fix/inline-reference-images` (remote-only) | 2026-04-18 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |

### systems/instagram-scrapper
Default: `master` | Currently checked out: `master` | Pinned SHA: `f1601853` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Only branch. No `claude/refine-local-plan-d5Iox` here — brief overstated cluster size. |

### systems/pinboard
Default: `master` | Currently checked out: `feat/cli-ux-rubric-pass` | Pinned SHA: `a9156bda` (on `feat/cli-ux-rubric-pass`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-26 | Devanshu Rana | yes | n/a | DEFAULT | KEEP | Default. |
| `feat/cli-ux-rubric-pass` | 2026-04-29 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Currently checked out; pinned commit lives here. Drives parent PR #9. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |
| `feat/aspect-ratio-picker` | 2026-04-19 | Devanshu Rana | yes | yes (into master) | MERGED | DELETE | Fully merged locally and remotely. Safe to delete local + remote. |
| `origin/feat/ui-overhaul-services-editor` (remote-only) | 2026-04-26 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |
| `origin/fix/inline-references-pinboard` (remote-only) | 2026-04-18 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |

### systems/prompt-writer
Default: `master` | Currently checked out: `master` | Pinned SHA: `8b681d22` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Only branch. No `claude/refine-local-plan-d5Iox` here — brief overstated cluster size. |

### systems/readme-engine
Default: `master` | Currently checked out: `master` | Pinned SHA: `61095988` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |

### systems/scene-board
Default: `main` | Currently checked out: `main` | Pinned SHA: `2cf859bf` (on `main`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `main` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes (origin ref exists, no upstream config) | yes (into main, locally) | MERGED | DELETE | Already merged into `main`; SHA matches `origin/claude/refine-local-plan-d5Iox` (`c4804ae4`). Safe to delete local + remote. **Distinct from the rest of the cluster — this submodule's contribution has already landed on its default.** |

## Cross-Repo Patterns

### Pattern: `claude/refine-local-plan-d5Iox`
Brief said "7 of 9 submodules + parent". Verified count: present in **5 of 7 actual submodules + parent** (gif-kit/pdf-kit are not submodules at all; instagram-scrapper and prompt-writer have no such branch).

| Repo | Local? | Remote? | Date | Merged into default? | Status |
|------|--------|---------|------|---------------------|--------|
| Parent | yes | yes (no upstream) | 2026-04-25 | no | ACTIVE — open PR #7 → **KEEP** |
| autoCaption | yes | yes | 2026-04-25 | no | ACTIVE → **KEEP (review)** |
| image-engine | yes | yes | 2026-04-25 | no | ACTIVE → **KEEP (review)** |
| instagram-scrapper | n/a | n/a | n/a | n/a | branch absent |
| pinboard | yes | yes | 2026-04-25 | no | ACTIVE → **KEEP (review)** |
| prompt-writer | n/a | n/a | n/a | n/a | branch absent |
| readme-engine | yes | yes | 2026-04-25 | no | ACTIVE → **KEEP (review)** |
| scene-board | yes | yes (no upstream) | 2026-04-25 | yes (into main) | MERGED → **DELETE** |

**Bulk-action recommendation:** Hold individual deletions while parent PR #7 (`claude/refine-local-plan-d5Iox` → master) is open. The submodule-side `claude/refine-local-plan-d5Iox` branches likely contain the per-submodule diffs that the parent PR's design-system rollout depends on; deleting them now would orphan referenced commits before the parent merges. After PR #7 is merged (or closed), perform one sweep to delete `claude/refine-local-plan-d5Iox` (local + remote) in: parent, autoCaption, image-engine, pinboard, readme-engine. Scene-board's copy is already merged and can be deleted now. Two repos (instagram-scrapper, prompt-writer) need no action.

> **Tracking nit:** Parent's local `claude/refine-local-plan-d5Iox` and scene-board's local `claude/refine-local-plan-d5Iox` have no upstream configured even though `origin/claude/refine-local-plan-d5Iox` exists at the same SHA. Optional housekeeping: `git branch --set-upstream-to=origin/claude/refine-local-plan-d5Iox claude/refine-local-plan-d5Iox` in each.

### Pattern: gif-kit / pdf-kit cross-pollination (claim from brief)
The brief stated branches `feat/pinboard-ui-overhaul`, `feature/adcelerate-v1`, `pinboard-ci-fix`, `pinboard-tui-rewrite` exist in BOTH `systems/gif-kit` and `systems/pdf-kit`. **Verified false.** Neither directory is a git repo (no `.git` entry, not in `.gitmodules`, not present as a `gitlink`/`commit` entry in parent's tree). They are plain untracked filesystem directories containing only generated artifacts (`knowledge/`, `node_modules/`, `out/`). The original concern is moot. **Action:** none branch-wise; engineer may want to either (a) properly initialize these as submodules if they're supposed to be tracked, or (b) add them to `.gitignore` and remove the stale build output.

### Pattern: pinboard pin chain (parent ↔ pinboard ↔ image-engine)
Parent PR #9 (`feat/pinboard-ui-overhaul`) bumps the pinboard submodule to `a9156bda` (head of pinboard's `feat/cli-ux-rubric-pass`). Image-engine submodule is pinned to `b9449ab4` on its `feat/dollar-budget-and-key-rotation` branch. Both feature branches are CHECKED-OUT in their respective submodules and must remain until either (a) the submodules' work merges to their respective defaults and the parent re-pins to a `master` commit, or (b) the parent PR lands. **Do NOT delete any pinned-feature branch.**

## Action Proposal — Branches to Delete

A consolidated checklist for engineer approval. Run from the corresponding repo root.

### Safe to delete now (MERGED, not checked-out, not behind an open PR)

- [ ] `Adcelerate (parent)` — `feature/adcelerate-v1` (MERGED, last commit 2026-03-26 by Devanshu Rana) — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d feature/adcelerate-v1 && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete feature/adcelerate-v1`
- [ ] `Adcelerate (parent)` — `pinboard-ci-fix` (MERGED, last commit 2026-04-19 by Devanshu Rana) — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d pinboard-ci-fix && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete pinboard-ci-fix`
- [ ] `Adcelerate (parent)` — `pinboard-tui-rewrite` (MERGED, last commit 2026-04-18 by Devanshu Rana) — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d pinboard-tui-rewrite && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete pinboard-tui-rewrite`
- [ ] `systems/image-engine` — `origin/fix/inline-reference-images` (MERGED, last commit 2026-04-18 by Devanshu Rana) — remote only (no local tracker)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine push origin --delete fix/inline-reference-images`
- [ ] `systems/pinboard` — `feat/aspect-ratio-picker` (MERGED, last commit 2026-04-19 by Devanshu Rana) — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard branch -d feat/aspect-ratio-picker && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete feat/aspect-ratio-picker`
- [ ] `systems/pinboard` — `origin/feat/ui-overhaul-services-editor` (MERGED, last commit 2026-04-26 by Devanshu Rana) — remote only
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete feat/ui-overhaul-services-editor`
- [ ] `systems/pinboard` — `origin/fix/inline-references-pinboard` (MERGED, last commit 2026-04-18 by Devanshu Rana) — remote only
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete fix/inline-references-pinboard`
- [ ] `systems/scene-board` — `claude/refine-local-plan-d5Iox` (MERGED into main, last commit 2026-04-25 by Devanshu Rana) — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/scene-board branch -d claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/scene-board push origin --delete claude/refine-local-plan-d5Iox`

### Hold until parent PR #7 closes, then delete (`claude/refine-local-plan-d5Iox` cluster)

- [ ] `Adcelerate (parent)` — `claude/refine-local-plan-d5Iox` — local + remote, only after PR #7 is merged or closed
- [ ] `systems/autoCaption` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/image-engine` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/pinboard` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/readme-engine` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes

### Do not delete (KEEP)
- Parent: `master`, `feat/pinboard-ui-overhaul` (open PR #9, checked out)
- autoCaption: `master`
- image-engine: `master`, `feat/dollar-budget-and-key-rotation` (checked out, pinned)
- instagram-scrapper: `master`
- pinboard: `master`, `feat/cli-ux-rubric-pass` (checked out, pinned, drives PR #9)
- prompt-writer: `master`
- readme-engine: `master`
- scene-board: `main`

### Filesystem cleanup (separate from branch deletion)
- [ ] `systems/gif-kit` and `systems/pdf-kit` are untracked working directories, not submodules. Decide: register as proper submodules with `git submodule add`, or add them to `.gitignore` and remove the stale generated artifacts. Not branch-related but surfaced during this audit.
