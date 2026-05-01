# Plan: Full Security & Housekeeping Review of Adcelerate + All Systems

## Task Description

Conduct an end-to-end audit of the Adcelerate monorepo and all 9 submodule systems (`autoCaption`, `gif-kit`, `image-engine`, `instagram-scrapper`, `pdf-kit`, `pinboard`, `prompt-writer`, `readme-engine`, `scene-board`). The audit covers six concurrent workstreams:

1. **Security review** — scan for leaked secrets, exposed credentials, vulnerable dependencies, unsafe shell exec, hardcoded API keys, public-repo leakage risks across the monorepo and every submodule.
2. **Branch hygiene** — enumerate every local + remote branch on the parent repo and each submodule, classify (merged / stale / active / orphaned), produce a deletion proposal for engineer approval.
3. **PR triage** — pull GitHub PR state for parent + every submodule, surface stale/blocked/ready-to-merge PRs with action recommendations.
4. **Log rotation automation** — `logs/` is at 105 MB / 245 files (flagged WARN by maintenance hook). Implement auto-prune (configurable retention window) wired into `SessionStart` so old logs purge automatically; do the same for any per-system `logs/` dirs.
5. **Spec/plan cleanup** — review `specs/`, `specs/inbox/`, and any `<system>/specs/` dirs; archive or delete completed/superseded plan files; produce a "tasks-left" summary from open specs + TODO/FIXME scan.
6. **Open task surface** — grep TODO/FIXME/HACK/XXX across parent + submodules, cross-reference open spec files, surface unfinished work.

Output: a single consolidated report plus concrete pruning/cleanup actions executed only after engineer approval (destructive ops gated).

## Objective

Produce one consolidated **security & housekeeping report** at `specs/reports/security-housekeeping-<date>.md` covering all six workstreams, plus apply approved cleanup actions:
- Auto log-rotation hook installed and verified
- Stale branches deleted (after explicit approval)
- Superseded plan/spec files archived to `specs/archive/` (after explicit approval)
- Security findings triaged with severity + remediation owner
- PR + open-task ledger ready for the engineer's next planning session

## Problem Statement

The repo is accumulating entropy:
- `logs/` already at 105 MB (245 files) and growing every session — maintenance hook warns but doesn't act.
- 6 active local branches on parent + 25+ branches across submodules; many likely merged or abandoned (e.g. `claude/refine-local-plan-d5Iox` exists in 7 of 9 submodules).
- 2 open PRs (#7 design-system tokens since 2026-04-25, #9 pinboard UI overhaul since 2026-04-29) — status unknown.
- 8 spec files in `specs/` plus inbox; some likely shipped (e.g. `pinboard-vision-gallery-keyrotate.md` matches commit `9f6f7a4`) — clutter masks live work.
- No systematic security review has been run across the submodules. `.env` exists at root; `image-engine` rotates API keys (per memory); risk of leaked credentials in submodule histories is unaudited.
- No central inventory of open work — TODOs sit unindexed in 9 separate codebases.

## Solution Approach

Six parallel agent workstreams feeding into a single consolidation step, then a gated cleanup phase. Read-only audits run in parallel (no conflicts); the log-rotation hook implementation runs in parallel with audits (touches different files); destructive cleanup (branch deletion, file archival) runs **sequentially after engineer approval** of the consolidated report.

Architecture:
```
[Phase 1: Parallel Audits]
  ├── Security scan (read-only)
  ├── Branch enumeration (read-only)
  ├── PR triage (read-only, gh CLI)
  ├── Log-rotation hook (write, isolated to .claude/hooks/)
  ├── Spec/plan inventory (read-only)
  └── TODO/open-task scan (read-only)
        ↓
[Phase 2: Consolidation]
  └── Merge findings → specs/reports/security-housekeeping-<date>.md
        ↓
[Phase 3: Engineer Approval Gate]  ← STOP HERE, await approval
        ↓
[Phase 4: Sequential Cleanup]
  ├── Delete approved branches (parent + per submodule)
  ├── Archive approved spec files → specs/archive/
  └── Run log-rotation once to validate
        ↓
[Phase 5: Validation]
  └── Validator confirms all acceptance criteria met
```

## Relevant Files

Use these files to complete the task:

- `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/setup_maintenance.py` — existing maintenance hook; reference for log-size check pattern; do NOT replace, augment.
- `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/setup_init.py` — session-start init; log-rotation hook will register here or as separate hook.
- `/Users/dragonhearted/Desktop/Adcelerate/.claude/settings.json` — `SessionStart` hook chain; new log-rotation hook gets wired in here.
- `/Users/dragonhearted/Desktop/Adcelerate/logs/` — 105 MB / 245 files; primary rotation target.
- `/Users/dragonhearted/Desktop/Adcelerate/.gitignore` — verify it excludes `.env`, secrets, build artifacts; reference for security audit.
- `/Users/dragonhearted/Desktop/Adcelerate/.env` — root env file; security audit must verify it's gitignored and not committed in any submodule.
- `/Users/dragonhearted/Desktop/Adcelerate/.gitmodules` — submodule registry; defines audit scope.
- `/Users/dragonhearted/Desktop/Adcelerate/systems/*/` — 9 submodules; each gets full security + branch audit.
- `/Users/dragonhearted/Desktop/Adcelerate/specs/*.md` — existing spec files to inventory + classify (active / shipped / abandoned).
- `/Users/dragonhearted/Desktop/Adcelerate/specs/inbox/` — `pinboard-overhaul.md`, `pinboard-tidy-toast.md`; classify alongside specs root.
- `/Users/dragonhearted/Desktop/Adcelerate/library.yaml` + `systems.yaml` — system catalog; cross-ref against submodule list.
- `/Users/dragonhearted/Desktop/Adcelerate/.claude/agents/team/builder.md` + `validator.md` — team member definitions.

### New Files

- `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py` — new hook script. Prunes `logs/` files older than `LOG_RETENTION_DAYS` (default 7) on `SessionStart`. Also walks `systems/*/logs/` if present. Reports bytes freed.
- `/Users/dragonhearted/Desktop/Adcelerate/specs/reports/security-housekeeping-2026-05-01.md` — consolidated report (date in filename).
- `/Users/dragonhearted/Desktop/Adcelerate/specs/archive/` — directory for archived/shipped specs (created on first archival).

## Implementation Phases

### Phase 1: Foundation (parallel audits, read-only)

Six audit agents run concurrently. Each writes its findings to a dedicated section file under `specs/reports/_partials/`:
- `security.md`
- `branches.md`
- `prs.md`
- `specs-inventory.md`
- `open-tasks.md`

Log-rotation hook implementation runs in parallel with audits (no file conflicts; touches `.claude/hooks/` and `.claude/settings.json` only).

### Phase 2: Core Implementation (consolidation + approval gate)

Team lead merges all `_partials/*.md` into the final consolidated report `specs/reports/security-housekeeping-2026-05-01.md` with structured sections:
- Executive summary (counts: secrets-found, stale-branches, open-prs, archivable-specs, open-todos)
- Per-workstream findings with severity tags
- **Action proposal** — explicit list of branches to delete, specs to archive, security fixes to apply, with per-item engineer checkbox

**STOP and present report to engineer for approval before Phase 4.**

### Phase 3: Integration & Polish (gated cleanup + validation)

Only after engineer approves the action proposal:
- Delete approved branches (parent + per submodule, local + remote with explicit `gh` calls)
- Archive approved spec files (`git mv` to `specs/archive/`, never `rm`)
- Run log-rotation hook once manually to confirm it prunes correctly
- Validator confirms acceptance criteria, hook is wired and non-broken, all logs older than retention purged.

## Team Orchestration

- Team lead orchestrates only; never edits code directly.
- Six audit agents in Phase 1 run in parallel via `run_in_background: true`.
- Log-rotation hook builder runs in parallel with audits (no file overlap).
- Consolidation, approval gate, cleanup, and validation are sequential.

### Team Members

- Builder
  - Name: `security-auditor`
  - Role: Scan parent repo + every submodule for committed secrets, hardcoded API keys, vulnerable deps (`npm audit`, `pip-audit` / `uv pip list --outdated` if Python), unsafe shell exec patterns, `.env` leakage, public-visibility risks. Output: `specs/reports/_partials/security.md` with findings tagged Critical/High/Medium/Low + remediation.
  - Agent Type: `scout-report-suggest`
  - Resume: false

- Builder
  - Name: `branch-auditor`
  - Role: Enumerate all local + remote branches on parent and each of 9 submodules. Classify each: merged-into-default, stale-no-activity-30d+, active, orphan. Produce explicit deletion proposal table (one row per branch with reason). Output: `specs/reports/_partials/branches.md`.
  - Agent Type: `general-purpose`
  - Resume: false

- Builder
  - Name: `pr-auditor`
  - Role: For parent repo + every submodule with a GitHub remote, run `gh pr list --state all --limit 30` and `gh pr status`. Surface open / draft / blocked / ready-to-merge / stale (>14d no activity) PRs. Per PR: title, age, CI status, review status, recommended action. Output: `specs/reports/_partials/prs.md`.
  - Agent Type: `general-purpose`
  - Resume: false

- Builder
  - Name: `log-rotation-builder`
  - Role: Implement `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py` (uv inline-script header matching siblings). Default retention 7 days, configurable via `LOG_RETENTION_DAYS` env var. Prune `logs/` and `systems/*/logs/` and `.claude/hooks/logs/`. Wire into `.claude/settings.json` `SessionStart` hooks array (after `setup_init.py`, before `library_sync.py`). Print bytes freed. Idempotent and safe (skips if dir missing; protects last 24h of files even if retention is 0).
  - Agent Type: `builder`
  - Resume: false

- Builder
  - Name: `spec-inventory-auditor`
  - Role: Read every `*.md` in `specs/`, `specs/inbox/`, and any `systems/*/specs/`. For each: classify as Active / Shipped (cross-ref against `git log` for matching feature commit) / Superseded / Abandoned. Produce archival proposal table. Output: `specs/reports/_partials/specs-inventory.md`.
  - Agent Type: `general-purpose`
  - Resume: false

- Builder
  - Name: `open-task-scanner`
  - Role: Grep `TODO|FIXME|HACK|XXX` across parent + every submodule (exclude `node_modules`, `.git`, build artifacts, `logs/`). Cross-reference against active spec files. Surface top 25 oldest/highest-priority items. Output: `specs/reports/_partials/open-tasks.md`.
  - Agent Type: `scout-report-suggest-fast`
  - Resume: false

- Builder
  - Name: `report-consolidator`
  - Role: Merge the six `_partials/*.md` files into `specs/reports/security-housekeeping-2026-05-01.md`. Add executive summary header with counts. Add explicit action-proposal section with per-item checkboxes for engineer approval.
  - Agent Type: `general-purpose`
  - Resume: false

- Builder
  - Name: `cleanup-executor`
  - Role: After engineer approves the action proposal, execute approved branch deletions (parent + per submodule, local with `git branch -D` and remote with `git push origin --delete`), archive approved specs (`git mv` to `specs/archive/`), and run log-rotation hook once to validate. Confirm `gh` auth before remote deletes. Refuse to delete `master`, `main`, or any currently-checked-out branch.
  - Agent Type: `builder`
  - Resume: false

- Validator
  - Name: `final-validator`
  - Role: Verify all acceptance criteria. Confirm: report file exists and covers all six workstreams; log-rotation hook is wired in `settings.json` and runs without error; approved branches are gone (locally + remotely); approved specs are in `specs/archive/`; no secrets are still committed; final report has sign-off section.
  - Agent Type: `validator`
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Bootstrap report scaffolding
- **Task ID**: bootstrap-report-dirs
- **Depends On**: none
- **Assigned To**: log-rotation-builder
- **Agent Type**: builder
- **Parallel**: false
- Create `specs/reports/` and `specs/reports/_partials/` directories.
- Create empty placeholder files for each partial so parallel agents have stable write paths.
- Confirm `specs/archive/` does not yet exist (created later only on demand).

### 2. Security audit
- **Task ID**: audit-security
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: security-auditor
- **Agent Type**: scout-report-suggest
- **Parallel**: true
- Scope: parent repo + all 9 submodules.
- Scan for: committed secrets (regex for API key patterns, AWS/GCP/Anthropic/OpenAI/Gemini/Replicate keys, JWT tokens, private keys, `.env*` tracked in git), hardcoded credentials in source, unsafe `eval`/`exec`/shell-injection patterns, `.gitignore` completeness for env files, dependencies with known CVEs (run available linters: `npm audit`, `uv pip list --outdated`, `bun audit` per system), public/private visibility check on each submodule (`gh repo view`).
- Cross-check `git log -p -S 'sk-' -S 'AIza' -S 'gho_' -S 'ANTHROPIC_API_KEY'` etc. across history for ever-committed secrets.
- Cross-reference memory note re: `image-engine` rotating-key behavior — verify rotation logic doesn't log keys.
- Verify `.env` files at every level are in `.gitignore` and not tracked.
- Output: `specs/reports/_partials/security.md` with severity-tagged findings + remediation steps.

### 3. Branch audit
- **Task ID**: audit-branches
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: branch-auditor
- **Agent Type**: general-purpose
- **Parallel**: true
- Run `git branch -a`, `git for-each-ref --format='%(refname:short) %(committerdate:iso) %(authorname)' refs/heads refs/remotes` for parent + each submodule.
- Classify each branch: merged-into-default (test with `git branch --merged`), stale (no commits in 30d+), active (commits in last 30d), orphan (no remote tracking).
- Produce a deletion proposal table: branch, repo, last commit date, last author, classification, recommended action (DELETE / KEEP / NEEDS-REVIEW).
- Special attention to `claude/refine-local-plan-d5Iox` (appears in 7 submodules) and `feat/pinboard-ui-overhaul` (active in parent + gif-kit + pdf-kit, suggests pinboard work bled into wrong submodules).
- Never propose deletion of `master` / `main` / currently-checked-out branches.
- Output: `specs/reports/_partials/branches.md`.

### 4. PR triage
- **Task ID**: audit-prs
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: pr-auditor
- **Agent Type**: general-purpose
- **Parallel**: true
- Confirm `gh auth status` first.
- For parent + each submodule: `gh pr list --state open --limit 30 --json number,title,author,createdAt,updatedAt,isDraft,reviewDecision,statusCheckRollup,headRefName,baseRefName`.
- Also fetch closed-but-unmerged PRs from last 30 days to catch abandoned work.
- For each open PR: report title, age, draft status, CI status, review state, mergeability, recommended action (MERGE / REBASE / CLOSE / NUDGE-AUTHOR / WAITING-ON-REVIEW).
- Known PRs to triage explicitly: parent #9 (`feat/pinboard-ui-overhaul`, opened 2026-04-29), parent #7 (`claude/refine-local-plan-d5Iox`, opened 2026-04-25).
- Output: `specs/reports/_partials/prs.md`.

### 5. Build log-rotation hook
- **Task ID**: build-log-rotation
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: log-rotation-builder
- **Agent Type**: builder
- **Parallel**: true
- Create `/Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py` with `uv run --script` shebang matching `setup_maintenance.py` style.
- Required behavior:
  - Read `LOG_RETENTION_DAYS` env (default `7`).
  - Read `LOG_RETENTION_MAX_MB` env (default `50`) — secondary cap; if total dir exceeds, also prune oldest until under cap.
  - Always preserve files modified within last 24 hours regardless of retention setting (safety floor).
  - Prune target dirs: `<project>/logs/`, `<project>/.claude/hooks/logs/`, every `<project>/systems/*/logs/` if present.
  - Print `[log-rotation] freed N MB across M files` summary line.
  - Never recurse outside the listed dirs. Never touch `.git`. Never delete dirs themselves.
  - Idempotent + crash-safe (catch+log per-file errors, continue).
- Wire into `.claude/settings.json` `SessionStart` hooks array — insert after `setup_init.py`, before `library_sync.py`, with `timeout: 30`.
- Run the hook once locally to verify it prunes the existing 105 MB / 245-file backlog.
- Document the env vars in the hook's docstring header.

### 6. Spec/plan inventory
- **Task ID**: audit-specs
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: spec-inventory-auditor
- **Agent Type**: general-purpose
- **Parallel**: true
- List every `*.md` in `specs/`, `specs/inbox/`, and any `systems/*/specs/`.
- For each spec, classify:
  - **Shipped** — find a corresponding feature commit in `git log` (e.g. `pinboard-vision-gallery-keyrotate.md` ↔ commit `9f6f7a4`).
  - **Active** — referenced by an open PR or open branch.
  - **Superseded** — replaced by a newer spec on the same topic.
  - **Abandoned** — no commits, no branch, no PR, > 30 days old.
- Produce archival proposal table: file path, classification, evidence (commit SHA / PR # / "no activity"), recommended action (ARCHIVE / KEEP / DELETE-ONLY-WITH-APPROVAL).
- Never propose deleting this very plan file.
- Output: `specs/reports/_partials/specs-inventory.md`.

### 7. Open-task scan
- **Task ID**: audit-open-tasks
- **Depends On**: bootstrap-report-dirs
- **Assigned To**: open-task-scanner
- **Agent Type**: scout-report-suggest-fast
- **Parallel**: true
- Grep `TODO|FIXME|HACK|XXX` across parent + every submodule.
- Exclude: `node_modules`, `.git`, `dist`, `build`, `.next`, `logs/`, `__pycache__`, `*.lock`, `*.min.*`.
- For each hit: file:line, marker type, surrounding line, age (via `git blame`).
- Cross-reference top 25 against active spec files; flag orphan TODOs (no covering spec).
- Output: `specs/reports/_partials/open-tasks.md` with prioritized list.

### 8. Consolidate report
- **Task ID**: consolidate-report
- **Depends On**: audit-security, audit-branches, audit-prs, build-log-rotation, audit-specs, audit-open-tasks
- **Assigned To**: report-consolidator
- **Agent Type**: general-purpose
- **Parallel**: false
- Merge all `_partials/*.md` into `specs/reports/security-housekeeping-2026-05-01.md`.
- Header includes executive summary with counts: # critical security findings, # stale branches proposed for deletion, # open PRs needing action, # specs proposed for archival, # high-priority TODOs.
- Final section is "Action Proposal" with per-item engineer checkboxes — this is the gate that controls Phase 4.
- Final section also lists what was done autonomously (log-rotation hook) for transparency.

### 9. ENGINEER APPROVAL GATE
- **Task ID**: engineer-approval-gate
- **Depends On**: consolidate-report
- **Assigned To**: team lead
- **Agent Type**: (none — manual)
- **Parallel**: false
- Team lead presents `specs/reports/security-housekeeping-2026-05-01.md` to the engineer.
- Engineer reviews the action proposal, marks items approved/rejected.
- **No Phase 4 task may run until this approval is captured in the report.**

### 10. Execute approved cleanup
- **Task ID**: execute-cleanup
- **Depends On**: engineer-approval-gate
- **Assigned To**: cleanup-executor
- **Agent Type**: builder
- **Parallel**: false
- Read approved items from the action-proposal section.
- For approved branches: `git branch -D <branch>` locally, then `git push origin --delete <branch>` remotely; per parent + each submodule. Skip any branch that is currently checked out.
- For approved spec archival: `mkdir -p specs/archive && git mv <spec> specs/archive/` (preserves git history).
- For approved security fixes that are non-destructive (e.g. add entry to `.gitignore`): apply.
- For destructive security fixes (rewriting history with `git-filter-repo` to scrub committed secrets): STOP and ask engineer again — never run autonomously.
- Run log-rotation hook once manually to confirm clean prune.
- Commit cleanup changes with message: `chore: housekeeping sweep — branches/specs/log-rotation`.

### 11. Validate everything
- **Task ID**: validate-all
- **Depends On**: execute-cleanup
- **Assigned To**: final-validator
- **Agent Type**: validator
- **Parallel**: false
- Confirm `specs/reports/security-housekeeping-2026-05-01.md` exists and covers all 6 workstreams.
- Confirm `.claude/hooks/log_rotation.py` exists, is executable, registered in `settings.json` `SessionStart`, and runs cleanly (`uv run .claude/hooks/log_rotation.py`).
- Confirm `logs/` is now under retention threshold.
- Confirm approved branches are absent from `git branch -a` (parent + submodules).
- Confirm approved specs are present in `specs/archive/` and absent from `specs/`.
- Confirm no secrets remain in `git ls-files` per security-auditor's scrubbing list.
- Confirm action proposal section in the report has been signed off (every item has approved/rejected status).
- Output a final pass/fail summary.

## Acceptance Criteria

- [ ] Consolidated report `specs/reports/security-housekeeping-2026-05-01.md` exists and covers all six workstreams.
- [ ] `.claude/hooks/log_rotation.py` created, idempotent, wired into `SessionStart` in `.claude/settings.json`.
- [ ] After hook runs, `logs/` size is under `LOG_RETENTION_MAX_MB` (default 50 MB) — down from current 105 MB.
- [ ] Branch deletion proposal lists every branch on parent + every submodule with classification + action.
- [ ] PR triage covers parent + every submodule with active GitHub remote; both known open parent PRs (#7, #9) have explicit recommendation.
- [ ] Spec inventory classifies every file in `specs/`, `specs/inbox/`, and any `<system>/specs/`.
- [ ] Security report flags every committed secret (if any) with severity + remediation; if none, explicitly states "0 secrets found across N files scanned across M repos".
- [ ] Open-task scan returns top 25 prioritized TODOs cross-referenced against active specs.
- [ ] Engineer-approval gate is honored — no destructive action (branch delete, file archive, history rewrite) runs without engineer sign-off captured in the report.
- [ ] Validator final report confirms pass on every above bullet.

## Validation Commands

Execute these commands to validate the task is complete:

- `ls /Users/dragonhearted/Desktop/Adcelerate/specs/reports/security-housekeeping-2026-05-01.md` — report exists.
- `uv run /Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py` — hook runs without error and prints bytes-freed summary.
- `python -c "import json; cfg=json.load(open('/Users/dragonhearted/Desktop/Adcelerate/.claude/settings.json')); names=[h['command'] for entry in cfg['hooks']['SessionStart'] for h in entry['hooks']]; assert any('log_rotation' in n for n in names), 'hook not wired'"` — hook is registered.
- `du -sh /Users/dragonhearted/Desktop/Adcelerate/logs/` — under retention cap.
- `git -C /Users/dragonhearted/Desktop/Adcelerate branch -a` — confirms approved deletions.
- `for sys in /Users/dragonhearted/Desktop/Adcelerate/systems/*/; do echo "=== $sys ==="; git -C "$sys" branch -a; done` — confirms per-submodule deletions.
- `gh pr list --state open` — confirms PR audit covers all currently-open PRs.
- `git -C /Users/dragonhearted/Desktop/Adcelerate ls-files | xargs grep -l -E '(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|gho_[a-zA-Z0-9]{36})' 2>/dev/null` — should return empty (or exact set already triaged in security report).
- `ls /Users/dragonhearted/Desktop/Adcelerate/specs/archive/` — confirms approved specs archived.

## Notes

- **Destructive ops are gated.** Phase 4 (branch delete, file archive, secret history rewrite) only runs after explicit engineer approval captured in the consolidated report. The team lead must NOT auto-approve.
- **Submodule branch deletions touch remote.** Each submodule has its own GitHub repo; verify `gh auth status` covers all of them before remote deletes. If any submodule remote auth is missing, defer that submodule's remote deletes and surface in the report.
- **Public-repo audit:** per memory note (`feedback_publish_audit_private_content.md`), if any submodule is public or being made public, audit `git ls-files` for client/secret content first; flag in security report.
- **Memory respected:** the project memory note re: image-engine `referenceImageIds` quirk should be cross-referenced by the security-auditor when reviewing image-engine's chaining/sqlite logic — verify lookups don't expose internal IDs.
- **No new dependencies needed** — the log-rotation hook uses stdlib only (`pathlib`, `time`, `os`). All audit agents use `git`, `gh`, `grep` already on system.
- **Date stamping:** today is 2026-05-01 per the auto-memory `currentDate` note; the consolidated-report filename should embed this date.
- **Caveman-mode interaction:** team lead's user-facing updates stay terse per active session mode; agent prompts and the report content itself are written normally.
