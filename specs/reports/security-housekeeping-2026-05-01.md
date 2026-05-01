# Security & Housekeeping Audit — 2026-05-01

> Consolidated report from 6 parallel audits of the Adcelerate monorepo + 7 submodules. Auto log-rotation hook has been installed (no approval needed for that — already applied). All other cleanup actions below are GATED behind engineer approval.

## Executive Summary

| Workstream | Status | Top finding(s) |
|------------|--------|----------------|
| Security | Clean working trees / 18 high-sev dep advisories | Entire 8-repo fleet is PUBLIC; no real-length tokens ever committed across full git history |
| Branches | 8 safe-to-delete now, 5 pending parent PR #7 | `claude/refine-local-plan-d5Iox` design-system cohort spans 5 repos + parent — hold deletions until PR #7 lands |
| PRs | 7 open, 0 merge-ready, 5 need rebase, 2 waiting-on-review | Five-repo `claude/refine-local-plan-d5Iox` cohort is drifting and conflicting; autoCaption#1 also has CI failure |
| Specs | 11 found, 8 to archive | 6 SHIPPED + 1 SUPERSEDED safe to `git mv` to `specs/archive/`; 3 ACTIVE + 1 AUDIT keep |
| TODOs | 5 markers, 0 actionable | All 5 are vendor-doc snippets, intentional template placeholders, or meta-references — zero engineering debt |
| Log Rotation | DONE — 120.0 MB freed | Hook installed in SessionStart between `setup_init.py` and `setup_maintenance.py`; pruned 1495 files across all logs/ dirs |

### Headline numbers
- Files scanned for secrets: full working trees + full git history of 8 repos
- Working-tree secrets: 0
- History-committed secrets: 0 (all pickaxe hits triaged as short word fragments / placeholder text)
- Public repos: 8 / Private: 0
- High-severity dep advisories: 18 across 5 repos
- Stale branches recommended for deletion: 13 total (8 safe now + 5 cluster pending PR #7)
- Open PRs needing action: 7 (5 rebase, 2 waiting-on-review)
- Specs proposed for archival: 8
- Disk space recovered (logs): 120.0 MB across 1495 files

## 1. Security

_Auditor: security-auditor (re-run); date: 2026-05-01; scope: parent + 7 declared submodules per `.gitmodules`. `systems/gif-kit` and `systems/pdf-kit` excluded from main scan as non-submodule stray dirs (see Scan 9)._

### Scan summary
- Working-tree secrets (Scan 1): **0**
- History-committed secrets (Scan 2 pickaxe, real-length matches): **0** (all pickaxe hits were false positives — short word fragments / placeholder text)
- Tracked `.env` files (Scan 3): **0** (one tracked `.env.example` template in pinboard — expected, not a finding)
- Hardcoded cred suspicions in source (Scan 4): **0**
- Unsafe exec patterns (Scan 5, Critical / Medium): **0 / 0**
- Dependency advisories (Scan 6): **29 total** across 6 repos (0 critical, 18 high, 9 moderate, 1 low, 1 unscored — 2 repos clean)
- Repo visibility (Scan 7): **8 / 8 PUBLIC** (entire fleet is public — see notes)
- image-engine key logging hits (Scan 8): **0**

### Critical Findings

**C-1. Entire fleet is public on GitHub** — All 8 repos under `Dragon-hearted/*` are PUBLIC. Per the user's persistent memory rule (`feedback_publish_audit_private_content.md`), public repos require a `git ls-files` cross-check for client/proprietary content before publication. No tracked client data, credentials, or PII was found in the working trees during this scan, but ongoing publication discipline is required: any future commit that adds proprietary or customer-identifying content to these repos will be exposed immediately. Recommend either (a) flipping repos that contain proprietary engine code (`pinboard`, `image-engine`, `prompt-writer`) to private, or (b) maintaining an explicit pre-commit / pre-push audit step.

### High Findings

**H-1. Outdated dependencies with known high-severity advisories — 18 high-severity hits across 5 repos.**
- `apps/server`: 6× high (all `node-tar` / `tar` path-traversal & symlink-poisoning advisories — GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w). Remediation: `bun update` in `apps/server`.
- `apps/client`: 4× high (`Vite` arbitrary file read GHSA-p9ff-h696-f583, `Vite` `server.fs.deny` bypass GHSA-v2wj-q39q-566r, 2× `picomatch` ReDoS GHSA-c2c7-rcm5-vvqj). Vite advisories matter only in dev mode but must be patched.
- `systems/autoCaption`: 3× high (same `Vite` + `picomatch` chain).
- `systems/pinboard`: 4× high (all `xmldom` — XML injection via DocumentType / processing-instruction / comment serialization, plus uncontrolled-recursion DoS: GHSA-2v35-w6hq-6mfw, GHSA-f6ww-3ggp-fr8h, GHSA-x6wf-f3px-wcqx, GHSA-j759-j44w-7fr8). `xmldom` is unmaintained — recommend migrating to `@xmldom/xmldom` (the maintained fork) or a different XML lib.
- `systems/scene-board`: 1× high (`basic-ftp` DoS GHSA-rp42-5vxx-qpwr).

### Medium Findings

**M-1. Outdated dependencies with moderate-severity advisories — 9 hits.**
- `apps/server`: 1 (`brace-expansion` ReDoS GHSA-f886-m6hf-6m8v).
- `apps/client`: 5 (`brace-expansion`, `PostCSS` XSS GHSA-qx2v-qp2m-jg93, 2× `picomatch` injection GHSA-3v7f-55p6-f55p, `Vite` path traversal GHSA-4w7w-66w2-5vf9).
- `systems/autoCaption`: 3 (PostCSS, Vite path traversal, picomatch).
- `systems/image-engine`: 1 (`hono/jsx` HTML injection GHSA-458j-xx4x-4375).

### Low / Informational

**L-1.** `apps/server`: 1× low (`@tootallnate/once` GHSA-vpq2-c234-7xj6 — incorrect control flow scoping; very low impact).

**L-2.** `instagram-scrapper` carries a local untracked `.env` (gitignored, line 7 of `.gitignore`) — `bun audit` surfaced it incidentally. Confirmed NOT in `git ls-files`. Informational only — proper hygiene.

**L-3.** Pinboard tracks `.env.example` — this is a template (no real secret), and the only file containing `sk-ant-...` is `tui/src/cli.tsx` line 104: `"  $ PINBOARD_ALLOW_API=1 ANTHROPIC_API_KEY=sk-ant-... pinboard"` — a CLI help-text placeholder, REDACTED to confirm: literal string `sk-ant-...` (3 trailing dots, 7 chars total). Not a secret. No remediation required.

**L-4.** Pinboard contains a `.legacy/client/` directory (legacy frontend retained for reference). Confirm whether this should be removed before any further public release; it's not a security finding but adds attack surface for any inherited deps. Currently not part of the main app build.

**L-5.** Scan 2 (history pickaxe) raised many "matches" for `sk-`, `sk-ant-`, `ghp_` prefixes across 13 commits. Each was triaged: ALL were short word fragments (`sk-ill`, `sk-eleton`, `task-`, `sky-`, etc.) inside unrelated text/markdown OR explicit placeholder text (`sk-ant-...`). A follow-up scan with a length-bound regex (`sk-[A-Za-z0-9]{40,}`, `sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{40,}`, `AIza[0-9A-Za-z_-]{35}`, `gh[op]_[A-Za-z0-9]{36}`, `xoxb-[0-9]{10,}-...`) returned **0 matches across full git history of all 8 repos** — no real-length tokens were ever committed. No `git filter-repo` cleanup required.

### Repo Visibility Table

| Repo | Visibility | URL | Notes |
|------|------------|-----|-------|
| Adcelerate (parent) | PUBLIC | https://github.com/Dragon-hearted/Adcelerate | Platform monorepo — confirms all submodules + apps are intended for public exposure. No client data or secrets in tree. |
| autoCaption | PUBLIC | https://github.com/Dragon-hearted/autoCaption | Clean tree. Dep advisories (high/moderate). |
| image-engine | PUBLIC | https://github.com/Dragon-hearted/image-engine | Rotating-key logic clean (Scan 8: 0 logging hits). 1× moderate dep advisory. |
| instagram-scrapper | PUBLIC | https://github.com/Dragon-hearted/instagram-scrapper | Clean (no advisories). Local untracked `.env` properly gitignored. |
| pinboard | PUBLIC | https://github.com/Dragon-hearted/pinboard | Clean tree. 4× high `xmldom` advisories. `.legacy/client/` retained. |
| prompt-writer | PUBLIC | https://github.com/Dragon-hearted/prompt-writer | Clean (no advisories, no secrets). |
| readme-engine | PUBLIC | https://github.com/Dragon-hearted/readme-engine | Clean (no advisories, no secrets). |
| scene-board | PUBLIC | https://github.com/Dragon-hearted/scene-board | 1× high `basic-ftp` advisory. |

### Dependency Advisories

| Repo | Tool | Critical | High | Moderate | Low |
|------|------|----------|------|----------|-----|
| apps/server | bun audit | 0 | 6 | 1 | 1 |
| apps/client | bun audit | 0 | 4 | 5 | 0 |
| systems/autoCaption | bun audit | 0 | 3 | 3 | 0 |
| systems/image-engine | bun audit | 0 | 0 | 1 | 0 |
| systems/instagram-scrapper | bun audit | 0 | 0 | 0 | 0 |
| systems/pinboard | bun audit | 0 | 4 | 0 | 0 |
| systems/prompt-writer | bun audit | 0 | 0 | 0 | 0 |
| systems/readme-engine | bun audit | 0 | 0 | 0 | 0 |
| systems/scene-board | bun audit | 0 | 1 | 0 | 0 |
| **TOTAL** | | **0** | **18** | **10** | **1** |

_No `pyproject.toml` files exist anywhere in the tree — all systems are TypeScript/JS. Python audit (uv) skipped: not applicable._

### Scan 8 — image-engine key logging

**Finding: 0 hits.** The `grep` for `(print|console.log|logger.{info,debug,warn,error})\s*\(.*key` across `systems/image-engine/` (Python, JS, TS, excluding node_modules and .git) returned no matches. The rotating-key implementation introduced in `bc4eb33` (per project memory) does not log raw keys to stdout/loggers. Verified clean.

### Scan 9 — Stray dirs

- `systems/gif-kit/`: contains `knowledge/` (empty), `node_modules/` (138 entries), `out/brand-intro.gif` (1 generated artifact). No source code, no `package.json` at top level visible, no secrets. Stale build output for an inactive system. Not a security risk; recommend removal or promotion to a proper submodule.
- `systems/pdf-kit/`: contains `knowledge/` (empty), `node_modules/` (61 entries), `out/sample.pdf` (1 generated artifact). Same profile as gif-kit. Not a security risk.

Both are excluded from `.gitmodules` and not tracked as submodules in the parent. They are local-only directories with no impact on the published repo set.

### Remediation Checklist

1. **High**: `cd apps/server && bun update` — clears 6× node-tar high-severity advisories.
2. **High**: `cd apps/client && bun update` — clears 4× high (Vite + picomatch).
3. **High**: `cd systems/autoCaption && bun update` — same as client.
4. **High**: `cd systems/pinboard` — replace `xmldom` dep with `@xmldom/xmldom` (maintained fork). 4× high advisories.
5. **High**: `cd systems/scene-board && bun update` — clears `basic-ftp` advisory.
6. **Medium**: `cd systems/image-engine && bun update` — clears `hono/jsx` SSR advisory.
7. **Process**: confirm the public-visibility posture of `pinboard`, `image-engine`, `prompt-writer` is intentional; if any contain proprietary engine logic, flip to private. Adopt a pre-push secret-scan hook (e.g., `gitleaks pre-push`) since the entire fleet is public-by-default.
8. **Cleanup (informational)**: decide whether `systems/gif-kit/`, `systems/pdf-kit/`, and `systems/pinboard/.legacy/` should be deleted from the working tree — they are neither submodules nor active.

## 2. Branch Hygiene

### Action Proposal — Branches to Delete

A consolidated checklist for engineer approval. Run from the corresponding repo root.

#### Safe to delete now (MERGED, not checked-out, not behind an open PR)

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

#### Hold until parent PR #7 closes, then delete (`claude/refine-local-plan-d5Iox` cluster)

- [ ] `Adcelerate (parent)` — `claude/refine-local-plan-d5Iox` — local + remote, only after PR #7 is merged or closed
- [ ] `systems/autoCaption` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/image-engine` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/pinboard` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes
- [ ] `systems/readme-engine` — `claude/refine-local-plan-d5Iox` — local + remote, after PR #7 closes

#### Do not delete (KEEP)
- Parent: `master`, `feat/pinboard-ui-overhaul` (open PR #9, checked out)
- autoCaption: `master`
- image-engine: `master`, `feat/dollar-budget-and-key-rotation` (checked out, pinned)
- instagram-scrapper: `master`
- pinboard: `master`, `feat/cli-ux-rubric-pass` (checked out, pinned, drives PR #9)
- prompt-writer: `master`
- readme-engine: `master`
- scene-board: `main`

#### Filesystem cleanup (separate from branch deletion)
- [ ] `systems/gif-kit` and `systems/pdf-kit` are untracked working directories, not submodules. Decide: register as proper submodules with `git submodule add`, or add them to `.gitignore` and remove the stale generated artifacts. Not branch-related but surfaced during this audit.

### Branch summary
- Repos audited: 8 (parent + 7 actual submodules)
- Total branches counted: 35 (21 local heads + 14 unique remote-only branches)
- Recommended DELETE: 13 (3 parent local+remote, 1 image-engine remote, 4 pinboard local+remote, 1 scene-board local+remote, 4 cross-repo claude/* once parent PR #7 lands — see notes)
- Recommended KEEP: 14 (defaults, currently-checked-out, open-PR heads, and ACTIVE branches)
- Recommended NEEDS-REVIEW: 1 cluster (cross-repo `claude/refine-local-plan-d5Iox` — KEEP individually while PR #7 is open, then bulk-delete)

> Caveat — task scope discrepancy: the brief listed `systems/gif-kit` and `systems/pdf-kit` as submodules with branches such as `feat/pinboard-ui-overhaul`, `feature/adcelerate-v1`, `pinboard-ci-fix`, `pinboard-tui-rewrite`. These directories exist on disk under `/Users/dragonhearted/Desktop/Adcelerate/systems/` but are **NOT** git submodules and **NOT** git repositories (verified via `.gitmodules`, `git ls-tree HEAD systems/`, and absence of any `.git` entry). They are plain untracked working directories containing only `knowledge/`, `node_modules/`, `out/`. There are therefore no branches to enumerate for them; the cross-pollination concern from the brief does not apply. Flagged for engineer awareness — see "Cross-Repo Patterns" below.

### Per-Repo Tables

#### Parent (Adcelerate)
Default: `master` | Currently checked out: `feat/pinboard-ui-overhaul`

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes (origin/master) | n/a | DEFAULT | KEEP | Default branch, never delete. |
| `feat/pinboard-ui-overhaul` | 2026-04-29 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Open PR #9; currently checked out. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes (origin ref exists, no upstream config) | no | ACTIVE | KEEP | Open PR #7 (`feat(design-system): unified token system across all surfaces`). Local & remote SHAs match (`52bcdfe`). No upstream tracking set — engineer may want to `git branch --set-upstream-to=origin/claude/refine-local-plan-d5Iox`. |
| `feature/adcelerate-v1` | 2026-03-26 | Devanshu Rana | yes | yes (into master) | MERGED, STALE (36d) | DELETE | Fully merged; safe to delete local + `origin/feature/adcelerate-v1`. |
| `pinboard-ci-fix` | 2026-04-19 | Devanshu Rana | yes | yes | MERGED | DELETE | Fully merged; safe to delete local + remote. |
| `pinboard-tui-rewrite` | 2026-04-18 | Devanshu Rana | yes | yes | MERGED | DELETE | Fully merged; safe to delete local + remote. |

#### systems/autoCaption
Default: `master` | Currently checked out: `master` | Pinned SHA: `166869b1` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default; pinned commit lives here. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not merged into master and not ancestor of master. Likely associated with parent PR #7. Bulk-delete after that PR closes. |

#### systems/image-engine
Default: `master` | Currently checked out: `feat/dollar-budget-and-key-rotation` | Pinned SHA: `b9449ab4` (on `feat/dollar-budget-and-key-rotation`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-26 | Devanshu Rana | yes | n/a | DEFAULT | KEEP | Default. |
| `feat/dollar-budget-and-key-rotation` | 2026-04-26 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Currently checked out; parent has this submodule pinned to a commit on this branch. Recent commit `bc4eb33 fix(image-engine): bump submodule with rotating-key fix`. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |
| `origin/fix/inline-reference-images` (remote-only) | 2026-04-18 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |

#### systems/instagram-scrapper
Default: `master` | Currently checked out: `master` | Pinned SHA: `f1601853` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Only branch. No `claude/refine-local-plan-d5Iox` here — brief overstated cluster size. |

#### systems/pinboard
Default: `master` | Currently checked out: `feat/cli-ux-rubric-pass` | Pinned SHA: `a9156bda` (on `feat/cli-ux-rubric-pass`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-26 | Devanshu Rana | yes | n/a | DEFAULT | KEEP | Default. |
| `feat/cli-ux-rubric-pass` | 2026-04-29 | Devanshu Rana | yes | no | CHECKED-OUT, ACTIVE | KEEP | Currently checked out; pinned commit lives here. Drives parent PR #9. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |
| `feat/aspect-ratio-picker` | 2026-04-19 | Devanshu Rana | yes | yes (into master) | MERGED | DELETE | Fully merged locally and remotely. Safe to delete local + remote. |
| `origin/feat/ui-overhaul-services-editor` (remote-only) | 2026-04-26 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |
| `origin/fix/inline-references-pinboard` (remote-only) | 2026-04-18 | Devanshu Rana | remote-only | yes (ancestor of master) | MERGED | DELETE | No local tracker; ancestor of master. Safe to delete from origin. |

#### systems/prompt-writer
Default: `master` | Currently checked out: `master` | Pinned SHA: `8b681d22` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Only branch. No `claude/refine-local-plan-d5Iox` here — brief overstated cluster size. |

#### systems/readme-engine
Default: `master` | Currently checked out: `master` | Pinned SHA: `61095988` (on `master`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `master` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes | no | ACTIVE (6d) | KEEP (review post PR #7 merge) | Not ancestor of master. Tied to parent PR #7. |

#### systems/scene-board
Default: `main` | Currently checked out: `main` | Pinned SHA: `2cf859bf` (on `main`)

| Branch | Last Commit | Author | Remote? | Merged? | Classification | Recommended Action | Notes |
|--------|-------------|--------|---------|---------|----------------|---------------------|-------|
| `main` | 2026-04-25 | Devanshu Rana | yes | n/a | DEFAULT, CHECKED-OUT | KEEP | Default. |
| `claude/refine-local-plan-d5Iox` | 2026-04-25 | Devanshu Rana | yes (origin ref exists, no upstream config) | yes (into main, locally) | MERGED | DELETE | Already merged into `main`; SHA matches `origin/claude/refine-local-plan-d5Iox` (`c4804ae4`). Safe to delete local + remote. **Distinct from the rest of the cluster — this submodule's contribution has already landed on its default.** |

### Cross-Repo Patterns

#### Pattern: `claude/refine-local-plan-d5Iox`
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

#### Pattern: gif-kit / pdf-kit cross-pollination (claim from brief)
The brief stated branches `feat/pinboard-ui-overhaul`, `feature/adcelerate-v1`, `pinboard-ci-fix`, `pinboard-tui-rewrite` exist in BOTH `systems/gif-kit` and `systems/pdf-kit`. **Verified false.** Neither directory is a git repo (no `.git` entry, not in `.gitmodules`, not present as a `gitlink`/`commit` entry in parent's tree). They are plain untracked filesystem directories containing only generated artifacts (`knowledge/`, `node_modules/`, `out/`). The original concern is moot. **Action:** none branch-wise; engineer may want to either (a) properly initialize these as submodules if they're supposed to be tracked, or (b) add them to `.gitignore` and remove the stale build output.

#### Pattern: pinboard pin chain (parent ↔ pinboard ↔ image-engine)
Parent PR #9 (`feat/pinboard-ui-overhaul`) bumps the pinboard submodule to `a9156bda` (head of pinboard's `feat/cli-ux-rubric-pass`). Image-engine submodule is pinned to `b9449ab4` on its `feat/dollar-budget-and-key-rotation` branch. Both feature branches are CHECKED-OUT in their respective submodules and must remain until either (a) the submodules' work merges to their respective defaults and the parent re-pins to a `master` commit, or (b) the parent PR lands. **Do NOT delete any pinned-feature branch.**

## 3. PR Triage

### Summary
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

### Open PRs by Repo

#### Parent (Adcelerate)
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 9 | feat(pinboard): UI overhaul + CLI launcher rubric pass | Dragon-hearted | 2d | No | SUCCESS (CodeRabbit) | none | MERGEABLE | WAITING-ON-REVIEW | KEEP — fresh; self-merge if no second reviewer expected, otherwise wait on review |
| 7 | feat(design-system): unified token system across all surfaces | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE onto current `master` (likely conflicts with the merged Phase-1 Darkroom + library.yaml regen commits); re-trigger CI |

#### systems/autoCaption
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): adopt DS brand-amber for default caption highlight | Dragon-hearted | 6d | No | FAILURE (lint-typecheck-test) | none | CONFLICTING | NEEDS-REBASE (+ failing CI) | REBASE + fix `lint-typecheck-test` regression; if rollout already obsolete, CLOSE |

#### systems/gif-kit
SKIPPED: remote `origin` points at `Dragon-hearted/Adcelerate.git`, not a dedicated `gif-kit` repo. No standalone PR list available.

#### systems/image-engine
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): add --brand flag to generate scripts | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE — likely conflicts with the recent rotating-key fix on `master`; verify CodeRabbit re-runs cleanly |

#### systems/instagram-scrapper
No open PRs.

#### systems/pdf-kit
SKIPPED: remote `origin` points at `Dragon-hearted/Adcelerate.git`, not a dedicated `pdf-kit` repo. No standalone PR list available.

#### systems/pinboard
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 4 | feat(tui): rubric-compliance pass on launcher CLI surface | Dragon-hearted | 2d | No | SUCCESS (CodeRabbit) | none | MERGEABLE | WAITING-ON-REVIEW | KEEP — fresh; eligible to merge once reviewed (note: parent `master` already has commit `ee8b0ec` "CLI launcher rubric-compliance pass" — confirm this PR isn't already represented upstream before merge) |
| 2 | feat(design-system): migrate TUI + Remotion demo to DS adapters | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE onto `master` (Phase-1 Darkroom + UI overhaul have landed since); re-validate that DS adapter changes still apply |

#### systems/prompt-writer
No open PRs.

#### systems/readme-engine
| # | Title | Author | Age | Draft | CI | Review | Mergeable | Classification | Recommended Action |
|---|-------|--------|-----|-------|----|--------|-----------|----------------|--------------------|
| 1 | feat(design-system): SVG renderers consume DS adapter | Dragon-hearted | 6d | No | SUCCESS (CodeRabbit) | none | CONFLICTING | NEEDS-REBASE | REBASE; same design-system rollout cohort as the other `claude/refine-local-plan-d5Iox` branches |

#### systems/scene-board
No open PRs.

### Closed-but-Unmerged Last 30d (abandoned signals)
| Repo | # | Title | Branch | Closed | Note |
|------|---|-------|--------|--------|------|

_None across parent + all 9 submodules in the 2026-04-01..2026-05-01 window._

### Action Proposal

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

## 4. Specs / Plans Inventory

### Summary
- Spec files found: 11
- SHIPPED (archive): 6
- ACTIVE (keep): 3
- SUPERSEDED (archive): 1
- ABANDONED (archive): 0
- AUDIT (keep): 1

Notes:
- `specs/full-security-and-housekeeping-review.md` is the active housekeeping audit plan (untracked working file, dated 2026-05-01); kept as AUDIT.
- `specs/reports/*` partials are this audit's outputs — not enumerated here.
- `_bmad-output/project-context.md` and `app_docs/*.md` are environment/context docs, not spec/plan files; excluded from classification.

### Inventory Table

| File | Title | First Seen | Last Modified | Classification | Evidence | Action |
|------|-------|------------|---------------|----------------|----------|--------|
| `specs/full-security-and-housekeeping-review.md` | Plan: Full Security & Housekeeping Review of Adcelerate + All Systems | 2026-05-01 (untracked) | 2026-05-01 | AUDIT | This audit's own plan; explicitly protected | KEEP |
| `specs/pinboard-ui-overhaul.md` | Plan: Pinboard UI Overhaul + Vision/Refs/Budget/PromptWriter Fixes | 2026-04-26 | 2026-04-26 | ACTIVE | Open PR #9 head=`feat/pinboard-ui-overhaul`; partial commits `b722070`, `ee8b0ec`, `1cf44d2`, `7957b7b` (Phase 1 Darkroom + CLI launcher pass landed; remaining phases in flight) | KEEP |
| `specs/inbox/pinboard-overhaul.md` | Pinboard App Overhaul - Implementation Plan | 2026-04-25 | 2026-04-25 | ACTIVE | Inbox-staged subset of `pinboard-ui-overhaul.md`; same feature scope referenced by open PR #9 | KEEP |
| `specs/inbox/pinboard-tidy-toast.md` | Pinboard TUI — Tidy Toast Sweep | 2026-04-25 | 2026-04-25 | SHIPPED | Commit `a60ddc7` "Bump Pinboard submodule: tidy-toast sweep (delete/clear/help-fix/hints/preview)" | ARCHIVE |
| `specs/pinboard-vision-gallery-keyrotate.md` | Plan: Pinboard System Update — Vision, Prompt Drafting, Gallery Semantics, Upload UX, Preview, Key Rotation | 2026-04-26 | 2026-04-26 | SHIPPED | Commit `9f6f7a4` "feat(pinboard): bump submodules — vision/gallery overhaul + budget+key rotation"; supporting `bc4eb33` "fix(image-engine): bump submodule with rotating-key fix" | ARCHIVE |
| `specs/pinboard-terminal-rewrite.md` | Plan: Pinboard Terminal Rewrite (Warp-styled TUI + ImageEngine + PromptWriter + Pinterest Import) | 2026-04-18 | 2026-04-18 | SUPERSEDED | Initial TUI rewrite shipped via PR #1 (`fa8cedb` merge of `pinboard-tui-rewrite`, `b5f9e74` Ink TUI bump); newer scope picked up by `pinboard-ui-overhaul.md` (Darkroom aesthetic, CLI launcher) | ARCHIVE |
| `specs/pinboard-image-generation-app.md` | Plan: Pinboard — AI Image Generation with Reference Images | 2026-03-25 | 2026-03-25 | SHIPPED | Pinboard submodule landed via `41de197` "Add pinboard as git submodule"; reference-image generation shipped per `0f44554` "Bump image-engine + pinboard: inline base64 references fix" and ongoing pinboard bumps | ARCHIVE |
| `specs/nanobanana-image-engine-and-sceneboard-integration.md` | Plan: NanoBanana Image Engine + SceneBoard Integration | 2026-04-12 | 2026-04-12 | SHIPPED | Commits `8b52f29` "Add ImageEngine as submodule", `20c4e16` "feat(skills): wire scene-board Stage 4.5", `b129dbd` "refactor(skills): align scene-board Stage 4.5", `bc4eb33` image-engine rotating-key fix; `systems/image-engine` and `systems/scene-board` exist | ARCHIVE |
| `specs/prompt-writer-system.md` | Plan: PromptWriter System — Centralized AI Prompt Engineering Authority | 2026-04-14 | 2026-04-14 | SHIPPED | Commits `3e70ee2` "Add PromptWriter system: centralized prompt engineering knowledge", `1f52c9a` "Convert readme-engine and prompt-writer to submodules", `cfdffc8`/`71f8d82` submodule refs; `systems/prompt-writer` exists | ARCHIVE |
| `specs/autocaption-terminal-app.md` | Plan: autoCaption — Terminal Video Captioning App (Remotion-powered) | 2026-03-25 | 2026-03-25 | SHIPPED | `systems/autoCaption` system exists with full Remotion app (src/, tests/, justfile, package.json); shipped as part of original platform restructure (`89700ef` "Restructure systems into systems/ directory with submodules") | ARCHIVE |
| `specs/adcelerate-v1-platform-upgrade.md` | Plan: Adcelerate v1 Platform Upgrade | 2026-03-25 | 2026-03-25 | SHIPPED | Commit `b7f7312` "Adcelerate v1: refactor UI components, add agents/skills, and knowledge base"; v1 platform structure now baseline (systems/, skills/, knowledge/) | ARCHIVE |

### Cross-References

#### Spec ↔ Commit SHA mappings
- `pinboard-vision-gallery-keyrotate.md` → `9f6f7a4` feat(pinboard): vision/gallery overhaul + budget+key rotation; `bc4eb33` fix(image-engine): rotating-key fix
- `inbox/pinboard-tidy-toast.md` → `a60ddc7` Bump Pinboard submodule: tidy-toast sweep
- `pinboard-terminal-rewrite.md` → `b5f9e74` Bump Pinboard submodule: terminal rewrite (Ink TUI); `fa8cedb` PR #1 merge
- `pinboard-image-generation-app.md` → `41de197` Add pinboard as git submodule; `0f44554` inline base64 references fix
- `nanobanana-image-engine-and-sceneboard-integration.md` → `8b52f29` Add ImageEngine as submodule; `20c4e16` scene-board Stage 4.5; `b129dbd` Stage 4.5 single composite
- `prompt-writer-system.md` → `3e70ee2` Add PromptWriter system; `1f52c9a` Convert readme-engine and prompt-writer to submodules
- `autocaption-terminal-app.md` → `89700ef` Restructure systems into systems/ directory with submodules (autoCaption present in tree)
- `adcelerate-v1-platform-upgrade.md` → `b7f7312` Adcelerate v1: refactor UI components, add agents/skills, and knowledge base

#### Spec ↔ Open PR mappings
- `pinboard-ui-overhaul.md` ↔ PR #9 (head=`feat/pinboard-ui-overhaul`, "feat(pinboard): UI overhaul + CLI launcher rubric pass") — IN PROGRESS
- `inbox/pinboard-overhaul.md` ↔ PR #9 (companion inbox-staged plan for the same overhaul effort)
- (no spec maps to PR #7 head=`claude/refine-local-plan-d5Iox` "feat(design-system): unified token system" — design-system rollout is tracked by `_bmad-output`/docs, not by a `specs/*.md` file)

#### Spec ↔ Active branch mappings
- `feat/pinboard-ui-overhaul` (current branch, parent of PR #9) → `pinboard-ui-overhaul.md` + `inbox/pinboard-overhaul.md`
- `claude/refine-local-plan-d5Iox` (PR #7, design-system) → no matching spec file
- `pinboard-tui-rewrite`, `pinboard-ci-fix`, `feature/adcelerate-v1` → stale branches matching SHIPPED specs above

#### Supersession chains
- `pinboard-terminal-rewrite.md` (2026-04-18, Warp-styled TUI rewrite) → SUPERSEDED by `pinboard-ui-overhaul.md` (2026-04-26, Darkroom aesthetic + CLI launcher) which subsumed remaining UI work after the initial Ink TUI rewrite shipped.
- `pinboard-image-generation-app.md` (2026-03-25, original gen app spec) → SHIPPED by initial pinboard submodule + later refined by `pinboard-vision-gallery-keyrotate.md` (also SHIPPED) and `pinboard-ui-overhaul.md` (ACTIVE).
- `inbox/pinboard-overhaul.md` and `pinboard-ui-overhaul.md` are companion plans for the same effort (inbox is a focused subset; root spec is comprehensive). Both kept while PR #9 is open.

### Action Proposal — Specs to Archive

- [ ] `specs/pinboard-vision-gallery-keyrotate.md` → `specs/archive/pinboard-vision-gallery-keyrotate.md` (reason: SHIPPED in `9f6f7a4` + `bc4eb33`)
- [ ] `specs/inbox/pinboard-tidy-toast.md` → `specs/archive/pinboard-tidy-toast.md` (reason: SHIPPED in `a60ddc7`)
- [ ] `specs/pinboard-terminal-rewrite.md` → `specs/archive/pinboard-terminal-rewrite.md` (reason: SUPERSEDED by `pinboard-ui-overhaul.md`; initial rewrite shipped via PR #1 `fa8cedb`)
- [ ] `specs/pinboard-image-generation-app.md` → `specs/archive/pinboard-image-generation-app.md` (reason: SHIPPED via `41de197` + `0f44554`; downstream refinements tracked by newer specs)
- [ ] `specs/nanobanana-image-engine-and-sceneboard-integration.md` → `specs/archive/nanobanana-image-engine-and-sceneboard-integration.md` (reason: SHIPPED — `8b52f29`, `20c4e16`, `b129dbd`, `bc4eb33`; systems/image-engine + systems/scene-board live)
- [ ] `specs/prompt-writer-system.md` → `specs/archive/prompt-writer-system.md` (reason: SHIPPED in `3e70ee2` + `1f52c9a`; systems/prompt-writer live)
- [ ] `specs/autocaption-terminal-app.md` → `specs/archive/autocaption-terminal-app.md` (reason: SHIPPED — systems/autoCaption Remotion app present in tree since `89700ef`)
- [ ] `specs/adcelerate-v1-platform-upgrade.md` → `specs/archive/adcelerate-v1-platform-upgrade.md` (reason: SHIPPED in `b7f7312`; v1 platform structure is now the baseline)

Recommended migration command (single batch, preserves history):

```bash
mkdir -p specs/archive && \
git mv specs/pinboard-vision-gallery-keyrotate.md specs/archive/ && \
git mv specs/inbox/pinboard-tidy-toast.md specs/archive/ && \
git mv specs/pinboard-terminal-rewrite.md specs/archive/ && \
git mv specs/pinboard-image-generation-app.md specs/archive/ && \
git mv specs/nanobanana-image-engine-and-sceneboard-integration.md specs/archive/ && \
git mv specs/prompt-writer-system.md specs/archive/ && \
git mv specs/autocaption-terminal-app.md specs/archive/ && \
git mv specs/adcelerate-v1-platform-upgrade.md specs/archive/
```

No specs are recommended for DELETE-ONLY-WITH-APPROVAL — every file has either landed value or is referenced by an active PR.

### Tasks-Left Summary (ACTIVE specs)

- **`specs/pinboard-ui-overhaul.md`** — In flight via PR #9. Phase 1 (Darkroom aesthetic, `b722070`) and CLI launcher rubric pass (`ee8b0ec`) landed; remaining phases include Vision/Refs/Budget polish and PromptWriter integration fixes per the multi-phase plan. Submodule bumps still pending merge to `master`.
- **`specs/inbox/pinboard-overhaul.md`** — Inbox-staged checklist that mirrors the in-flight overhaul work tracked by PR #9. Used as the focused execution checklist; folds into the same merge once PR #9 lands.
- **`specs/full-security-and-housekeeping-review.md`** — This audit. Currently running: spec inventory (this file), branches, PRs, security, and open-tasks partials in `specs/reports/_partials/`. Final consolidation report and approved cleanup actions still pending.

## 5. Open Task Scan

**5 markers found, all false positives — see appendix.**

### Summary
- Repos scanned: 8 (parent + 7 submodules)
- Total markers: 5 (TODO: 5 | FIXME: 0 | HACK: 0 | XXX: 0)
- HIGH priority (top 25): 0
- Orphan TODOs (no covering spec): 0

All 5 hits are non-actionable references — either documentation prose that quotes the word "TODO" as part of an example, or template placeholders that intentionally render the literal string `[TODO]` in generated output. There are zero true source-code action markers across the platform. This is itself a notable finding: the codebase carries no accumulated FIXME/HACK debt.

Tooling: ripgrep 14.1.1 with file types `py,js,ts,go,rust,md` (and a follow-up broader pass adding `sh,yaml,json` which surfaced no additional hits). Excluded: node_modules, .git, dist, build, .next, __pycache__, *.lock, *.min.*, logs, specs/reports/_partials, specs/full-security-and-housekeeping-review.md, bun.lockb, package-lock.json.

### Counts per Repo
| Repo | TODO | FIXME | HACK | XXX | Total |
|------|------|-------|------|-----|-------|
| Adcelerate (parent) | 2 | 0 | 0 | 0 | 2 |
| systems/autoCaption | 0 | 0 | 0 | 0 | 0 |
| systems/image-engine | 0 | 0 | 0 | 0 | 0 |
| systems/instagram-scrapper | 0 | 0 | 0 | 0 | 0 |
| systems/pinboard | 0 | 0 | 0 | 0 | 0 |
| systems/prompt-writer | 2 | 0 | 0 | 0 | 2 |
| systems/readme-engine | 0 | 0 | 0 | 0 | 0 |
| systems/scene-board | 1 | 0 | 0 | 0 | 1 |
| **Total** | **5** | **0** | **0** | **0** | **5** |

### Appendix — Top 25 Prioritized Items

Only 5 markers exist; all are TODO and all are younger than 90 days, so all fall into the LOW bucket per the rubric. None are HIGH or MEDIUM.

| # | Priority | Marker | Repo | File:Line | Age (days) | Excerpt | Covering Spec |
|---|----------|--------|------|-----------|------------|---------|---------------|
| 1 | LOW (false-positive) | TODO | Adcelerate | ai_docs/claude-code-hooks.md:670 | 37 | `"pattern": "TODO.*fix",` (example regex inside vendor docs) | n/a (vendor doc) |
| 2 | LOW (false-positive) | TODO | Adcelerate | ai_docs/claude-code-agent-teams.md:66 | 37 | `I'm designing a CLI tool that helps developers track TODO comments across` (example prompt text) | n/a (vendor doc) |
| 3 | LOW (placeholder) | TODO | systems/prompt-writer | src/registry.ts:184 | 17 | `.replace("[company-name]", "[TODO]")` (intentional template placeholder for generated rubric) | prompt-writer-system.md |
| 4 | LOW (placeholder) | TODO | systems/prompt-writer | src/registry.ts:199 | 17 | `` `| ${name} | [TODO] | experimental | ${relativePath} |` `` (intentional placeholder for generated registry row) | prompt-writer-system.md |
| 5 | LOW (false-positive) | TODO | systems/scene-board | knowledge/acceptance-criteria.md:104 | 35 | `...no placeholder text, no TODO markers, and no unresolved approval gates...` (acceptance-criteria meta reference) | adcelerate-v1-platform-upgrade.md (scene-board criteria) |

### All Hits (raw)

**parent (/Users/dragonhearted/Desktop/Adcelerate)**
```
ai_docs/claude-code-hooks.md:670:    "pattern": "TODO.*fix",
ai_docs/claude-code-agent-teams.md:66:I'm designing a CLI tool that helps developers track TODO comments across
```
Blame:
```
613a08e2 (Devanshu Rana 2026-03-25 11:17:26 +0530 670)     "pattern": "TODO.*fix",
613a08e2 (Devanshu Rana 2026-03-25 11:17:26 +0530  66) I'm designing a CLI tool that helps developers track TODO comments across
```

**systems/prompt-writer**
```
src/registry.ts:184:		.replace("[company-name]", "[TODO]")
src/registry.ts:199:	const newRow = `| ${name} | [TODO] | experimental | ${relativePath} |`;
```
Blame:
```
^b5982b3 (Devanshu Rana 2026-04-14 14:12:20 +0530 184) 		.replace("[company-name]", "[TODO]")
^b5982b3 (Devanshu Rana 2026-04-14 14:12:20 +0530 199) 	const newRow = `| ${name} | [TODO] | experimental | ${relativePath} |`;
```

**systems/scene-board**
```
knowledge/acceptance-criteria.md:104: ...no placeholder text, no TODO markers, and no unresolved approval gates...
```
Blame:
```
^124b5ae (Devanshu Rana 2026-03-27 12:42:58 +0530 104) The storyboard must read as a unified, polished creative deliverable...
```

### Orphan TODOs Worth Promoting to Specs

None. Every hit is either:
- a vendor doc snippet (ai_docs/claude-code-*.md) — not project work,
- an intentional template placeholder in `prompt-writer/src/registry.ts` that is by design rendered into generated rubric files for the user to fill in, or
- a meta reference in scene-board acceptance criteria forbidding TODO markers in deliverables.

No real engineering follow-up has been left in the code as a marker comment.

### Coverage Cross-Reference

- spec `prompt-writer-system.md` — covers prompt-writer/src/registry.ts (the `[TODO]` strings are part of the registry/rubric scaffolding behaviour described there).
- spec `adcelerate-v1-platform-upgrade.md` and the scene-board entries in `nanobanana-image-engine-and-sceneboard-integration.md` — cover the scene-board acceptance-criteria document.
- The two `ai_docs/` hits live in vendor reference material and are not expected to be governed by an Adcelerate spec.

### Methodology Notes
- Today: 2026-05-01.
- ripgrep run via the user's `rg` shell function (the system has no standalone `rg` binary; `command rg` therefore fails — the function form is what works).
- Initial scan used `-t py -t js -t ts -t go -t rust -t md`; broader follow-up pass added `-t sh -t yaml -t json` and produced no additional hits.
- Stray non-submodule directories `systems/gif-kit` and `systems/pdf-kit` were skipped per instructions.
- Submodule list verified against `.gitmodules` (7 submodules listed above).

## 6. Log Rotation Hook (Already Applied)

Created `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py` (~210 LOC, stdlib-only `uv run --script` hook with the standard inline-script header). The hook discovers `<project>/logs/`, `<project>/.claude/hooks/logs/`, and every `<project>/systems/*/logs/`; reads `LOG_RETENTION_DAYS` (default 7), `LOG_RETENTION_MAX_MB` (default 50), and `LOG_ROTATION_DRY_RUN` from the env; runs Phase A age-based prune followed by Phase B oldest-first size-cap prune; and protects any file with mtime newer than 24h as an absolute floor. Per-file errors are caught and logged to `.claude/hooks/log_rotation.log`; the script always exits 0 so it never breaks the SessionStart chain.

`settings.json` was edited to insert one new SessionStart hook entry between `setup_init.py` and `setup_maintenance.py` (so the maintenance hook observes the rotated state): `{ "type": "command", "command": "uv run \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log_rotation.py", "timeout": 30 }`. JSON validity confirmed via `python -c "import json; json.load(...)"`.

Dry-run (`LOG_ROTATION_DRY_RUN=1 LOG_RETENTION_DAYS=7`) reported `total: freed 120.0 MB across 1495 files` with exit 0 — `logs/` alone projected 85.8 MB / 1224 files prunable. The real run freed the same 120.0 MB across 1495 files: `logs/` collapsed from 106 MB to 17 MB (under the 50 MB cap), `.claude/hooks/logs/` to 0 B, `systems/image-engine/logs` from 16 MB to 5.0 MB, `systems/pinboard/logs` from 11 MB to 8.1 MB, and the remaining systems all under 100 KB. The hook is now wired and will run on every SessionStart.

---

## Action Proposal — Engineer Approval Required

This is the gate. Mark each item `[x]` to approve, leave `[ ]` to reject. The cleanup-executor agent will only act on approved items.

### A. Branches to delete (local + remote)

- [ ] `Adcelerate (parent)` — `feature/adcelerate-v1` (MERGED, 2026-03-26)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d feature/adcelerate-v1 && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete feature/adcelerate-v1`
- [ ] `Adcelerate (parent)` — `pinboard-ci-fix` (MERGED, 2026-04-19)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d pinboard-ci-fix && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete pinboard-ci-fix`
- [ ] `Adcelerate (parent)` — `pinboard-tui-rewrite` (MERGED, 2026-04-18)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -d pinboard-tui-rewrite && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete pinboard-tui-rewrite`
- [ ] `systems/image-engine` — `fix/inline-reference-images` (MERGED, remote-only, 2026-04-18)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine push origin --delete fix/inline-reference-images`
- [ ] `systems/pinboard` — `feat/aspect-ratio-picker` (MERGED, 2026-04-19)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard branch -d feat/aspect-ratio-picker && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete feat/aspect-ratio-picker`
- [ ] `systems/pinboard` — `feat/ui-overhaul-services-editor` (MERGED, remote-only, 2026-04-26)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete feat/ui-overhaul-services-editor`
- [ ] `systems/pinboard` — `fix/inline-references-pinboard` (MERGED, remote-only, 2026-04-18)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete fix/inline-references-pinboard`
- [ ] `systems/scene-board` — `claude/refine-local-plan-d5Iox` (MERGED into main, 2026-04-25)
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/scene-board branch -d claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/scene-board push origin --delete claude/refine-local-plan-d5Iox`

### B. Branches pending PR-close (DO NOT DELETE YET)

These are the `claude/refine-local-plan-d5Iox` design-system cohort. All five are gated by parent PR #7 — deleting them now would orphan referenced commits before the parent merges. Approve only after PR #7 is merged or closed.

- [ ] `Adcelerate (parent)` — `claude/refine-local-plan-d5Iox` — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate branch -D claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate push origin --delete claude/refine-local-plan-d5Iox`
- [ ] `systems/autoCaption` — `claude/refine-local-plan-d5Iox` — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/autoCaption branch -D claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/autoCaption push origin --delete claude/refine-local-plan-d5Iox`
- [ ] `systems/image-engine` — `claude/refine-local-plan-d5Iox` — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine branch -D claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine push origin --delete claude/refine-local-plan-d5Iox`
- [ ] `systems/pinboard` — `claude/refine-local-plan-d5Iox` — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard branch -D claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard push origin --delete claude/refine-local-plan-d5Iox`
- [ ] `systems/readme-engine` — `claude/refine-local-plan-d5Iox` — local + remote
  - `git -C /Users/dragonhearted/Desktop/Adcelerate/systems/readme-engine branch -D claude/refine-local-plan-d5Iox && git -C /Users/dragonhearted/Desktop/Adcelerate/systems/readme-engine push origin --delete claude/refine-local-plan-d5Iox`

### C. Specs to archive (`git mv` to specs/archive/)

- [ ] `specs/pinboard-vision-gallery-keyrotate.md` → `specs/archive/pinboard-vision-gallery-keyrotate.md` (SHIPPED in `9f6f7a4` + `bc4eb33`)
- [ ] `specs/inbox/pinboard-tidy-toast.md` → `specs/archive/pinboard-tidy-toast.md` (SHIPPED in `a60ddc7`)
- [ ] `specs/pinboard-terminal-rewrite.md` → `specs/archive/pinboard-terminal-rewrite.md` (SUPERSEDED by `pinboard-ui-overhaul.md`; initial rewrite shipped via PR #1 `fa8cedb`)
- [ ] `specs/pinboard-image-generation-app.md` → `specs/archive/pinboard-image-generation-app.md` (SHIPPED via `41de197` + `0f44554`)
- [ ] `specs/nanobanana-image-engine-and-sceneboard-integration.md` → `specs/archive/nanobanana-image-engine-and-sceneboard-integration.md` (SHIPPED — `8b52f29`, `20c4e16`, `b129dbd`, `bc4eb33`)
- [ ] `specs/prompt-writer-system.md` → `specs/archive/prompt-writer-system.md` (SHIPPED in `3e70ee2` + `1f52c9a`)
- [ ] `specs/autocaption-terminal-app.md` → `specs/archive/autocaption-terminal-app.md` (SHIPPED — systems/autoCaption Remotion app present since `89700ef`)
- [ ] `specs/adcelerate-v1-platform-upgrade.md` → `specs/archive/adcelerate-v1-platform-upgrade.md` (SHIPPED in `b7f7312`)

Single batch command (preserves history):

```bash
mkdir -p /Users/dragonhearted/Desktop/Adcelerate/specs/archive && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/pinboard-vision-gallery-keyrotate.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/inbox/pinboard-tidy-toast.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/pinboard-terminal-rewrite.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/pinboard-image-generation-app.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/nanobanana-image-engine-and-sceneboard-integration.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/prompt-writer-system.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/autocaption-terminal-app.md specs/archive/ && \
git -C /Users/dragonhearted/Desktop/Adcelerate mv specs/adcelerate-v1-platform-upgrade.md specs/archive/
```

### D. PR Actions

- [ ] PR `pinboard#4` — **review + merge**; design-aligned, mergeable, 2 days old. Confirm parent `master` commit `ee8b0ec` "CLI launcher rubric-compliance pass" is not already this work before merging.
- [ ] PR `Adcelerate#9` — **review + merge**; mergeable, fresh, ties pinboard rollout to parent. Confirm submodule pointer is intended before merging.
- [ ] PR `Adcelerate#7` — **rebase** onto current `master` (resolve conflicts vs Phase-1 Darkroom + library.yaml regen); re-request review.
- [ ] PR `pinboard#2` — **rebase** OR **close** if migration to DS adapters is now redundant after UI overhaul (#4); reopen fresh PR if needed.
- [ ] PR `image-engine#1` — **rebase** against rotating-key fix on `master`; merge if `--brand` flag work is still wanted.
- [ ] PR `readme-engine#1` — **rebase**; small surface, quick once base is current.
- [ ] PR `autoCaption#1` — **fix CI** (`lint-typecheck-test` is failing) **then rebase**. If brand-amber default is already picked up elsewhere, prefer **close + delete branch**.
- [ ] **Cohort cleanup decision:** land all five `claude/refine-local-plan-d5Iox` PRs as a same-day batch OR close them all and reopen against the new design tokens. Letting them sit accrues conflicts.

### E. Security remediations

- [ ] Align `.gitignore` for image-engine + pinboard to include `.env.*` not just `.env`
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/apps/server && bun update` — clears 6× node-tar high-severity advisories
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/apps/client && bun update` — clears 4× high (Vite + picomatch)
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/systems/autoCaption && bun update` — clears 3× high (Vite + picomatch)
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/systems/pinboard` — replace `xmldom` dep with `@xmldom/xmldom` maintained fork (clears 4× high advisories GHSA-2v35-w6hq-6mfw, GHSA-f6ww-3ggp-fr8h, GHSA-x6wf-f3px-wcqx, GHSA-j759-j44w-7fr8)
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/systems/scene-board && bun update` — clears `basic-ftp` high advisory GHSA-rp42-5vxx-qpwr
- [ ] `cd /Users/dragonhearted/Desktop/Adcelerate/systems/image-engine && bun update` — clears `hono/jsx` moderate advisory GHSA-458j-xx4x-4375
- [ ] Re-evaluate public-visibility status of all 8 repos against publication discipline policy. Specifically confirm `pinboard`, `image-engine`, `prompt-writer` are intentionally PUBLIC; if any contain proprietary engine logic, flip to private via `gh repo edit --visibility private`.
- [ ] Adopt a pre-push secret-scan hook (e.g., `gitleaks pre-push`) since the entire fleet is public-by-default.
- [ ] Decide fate of `systems/pinboard/.legacy/client/` — legacy frontend retained for reference; not part of main app build, adds attack surface.

### F. Filesystem cleanup

- [ ] Decide fate of `/Users/dragonhearted/Desktop/Adcelerate/systems/gif-kit/` (untracked, contains only `knowledge/` (empty) + `node_modules/` (138 entries) + `out/brand-intro.gif`). Either: (a) `git submodule add <remote> systems/gif-kit` to register properly, or (b) add `systems/gif-kit/` to `.gitignore` and `rm -rf` the stale artifacts.
- [ ] Decide fate of `/Users/dragonhearted/Desktop/Adcelerate/systems/pdf-kit/` (untracked, contains only `knowledge/` (empty) + `node_modules/` (61 entries) + `out/sample.pdf`). Same options as gif-kit.
- [ ] Structural follow-up for `systems/gif-kit` and `systems/pdf-kit`: their PR workflow is broken because both `git remote get-url origin` returns `https://github.com/Dragon-hearted/Adcelerate.git`. If kept, give them dedicated GitHub remotes.
- [ ] Optional housekeeping: set upstream tracking for parent's local `claude/refine-local-plan-d5Iox` and scene-board's local `claude/refine-local-plan-d5Iox` (currently no upstream configured though `origin/...` exists at same SHA): `git branch --set-upstream-to=origin/claude/refine-local-plan-d5Iox claude/refine-local-plan-d5Iox` in each.

---

## Sign-off

- [ ] Engineer reviewed
- [ ] Approved actions captured above
- [ ] cleanup-executor cleared to run

Date approved: ____________
Approved by: ____________
