# Cleanup Sweep — 2026-05-01

_Executor: cleanup-executor (this run). Scope: Section A (branch deletions), Section C (spec archives), Section E non-destructive .gitignore alignment only. Sections B, D, E-deps, F NOT executed (out of approved scope)._

## Section A — Branches deleted

| Repo | Branch | Local | Remote | Notes |
|------|--------|-------|--------|-------|
| Adcelerate (parent) | `feature/adcelerate-v1` | DELETED (was `b7f7312`) | DELETED | Local + remote successful. |
| Adcelerate (parent) | `pinboard-ci-fix` | DELETED (was `9a06cdb`) | DELETED | Local + remote successful. |
| Adcelerate (parent) | `pinboard-tui-rewrite` | DELETED (was `b5f9e74`) | DELETED | Local + remote successful. |
| systems/image-engine | `fix/inline-reference-images` | n/a (remote-only) | DELETED | Successful. |
| systems/pinboard | `feat/aspect-ratio-picker` | DELETED (was `b940ecd`) | already gone (stale tracker) | Local deleted; remote returned `remote ref does not exist` — likely pruned previously. Pruned local stale ref via `git fetch --prune origin`. |
| systems/pinboard | `feat/ui-overhaul-services-editor` | n/a (remote-only) | already gone (stale tracker) | Remote returned `remote ref does not exist`. Pruned via `git fetch --prune origin`. |
| systems/pinboard | `fix/inline-references-pinboard` | n/a (remote-only) | DELETED | Successful. |
| systems/scene-board | `claude/refine-local-plan-d5Iox` | **SKIPPED** | **SKIPPED** | Sandbox permission shim refused the `branch -D` command, classifying any reference to `claude/refine-local-plan-d5Iox` as Section-B forbidden — even though the audit (line 148) explicitly placed scene-board's instance in Section A as already MERGED into `main`, distinct from the PR-#7 cluster. **Engineer must run manually** if approved: `git -C systems/scene-board branch -D claude/refine-local-plan-d5Iox && git -C systems/scene-board push origin --delete claude/refine-local-plan-d5Iox`. |

**Net branch count after sweep:**
- parent: 3 local (`master`, `feat/pinboard-ui-overhaul`, `claude/refine-local-plan-d5Iox`); 3 remote (same names).
- systems/image-engine: 3 local refs visible (`master`, `feat/dollar-budget-and-key-rotation`, `claude/refine-local-plan-d5Iox`); 3 remote.
- systems/pinboard: 3 local (`master`, `feat/cli-ux-rubric-pass`, `claude/refine-local-plan-d5Iox`); 3 remote.
- systems/scene-board: 2 local (`main`, `claude/refine-local-plan-d5Iox`); 2 remote. (scene-board claude branch NOT removed — see SKIPPED row above.)

## Section C — Specs archived

`specs/archive/` directory created. The following 8 specs were moved with `git mv` (all exited 0):

| Source | Destination | Reason |
|--------|-------------|--------|
| `specs/pinboard-vision-gallery-keyrotate.md` | `specs/archive/pinboard-vision-gallery-keyrotate.md` | SHIPPED (`9f6f7a4` + `bc4eb33`) |
| `specs/inbox/pinboard-tidy-toast.md` | `specs/archive/pinboard-tidy-toast.md` | SHIPPED (`a60ddc7`) |
| `specs/pinboard-terminal-rewrite.md` | `specs/archive/pinboard-terminal-rewrite.md` | SUPERSEDED by `pinboard-ui-overhaul.md` |
| `specs/pinboard-image-generation-app.md` | `specs/archive/pinboard-image-generation-app.md` | SHIPPED (`41de197` + `0f44554`) |
| `specs/nanobanana-image-engine-and-sceneboard-integration.md` | `specs/archive/nanobanana-image-engine-and-sceneboard-integration.md` | SHIPPED (`8b52f29`, `20c4e16`, `b129dbd`, `bc4eb33`) |
| `specs/prompt-writer-system.md` | `specs/archive/prompt-writer-system.md` | SHIPPED (`3e70ee2` + `1f52c9a`) |
| `specs/autocaption-terminal-app.md` | `specs/archive/autocaption-terminal-app.md` | SHIPPED (`89700ef`) |
| `specs/adcelerate-v1-platform-upgrade.md` | `specs/archive/adcelerate-v1-platform-upgrade.md` | SHIPPED (`b7f7312`) |

**Final `specs/` top-level state:**
- Files: `full-security-and-housekeeping-review.md` (AUDIT, kept), `pinboard-ui-overhaul.md` (ACTIVE, kept) — 2 files.
- Subdirs: `archive/` (8 files), `inbox/` (1 file: `pinboard-overhaul.md` — ACTIVE, kept), `reports/` (audit outputs).

## Section E — `.gitignore` alignment

| File | Change | Status |
|------|--------|--------|
| `systems/pinboard/.gitignore` | Inserted `.env.*` and `!.env.sample` immediately after existing `.env` line | Applied; committed inside submodule (commit `30cae8f`). NOT pushed. |
| `systems/image-engine/.gitignore` | Inserted `.env.*` and `!.env.sample` immediately after existing `.env` line | Applied; committed inside submodule (commit `ac75315`). NOT pushed. |

Submodule pointer bumps in the parent are intentionally **NOT** staged — the parent commit references the previous submodule SHAs. Engineer can push submodule branches and bump pointers in a follow-up commit.

Section E dep upgrades (`bun update` etc.) and `xmldom → @xmldom/xmldom` swap in pinboard were **NOT** run — out of approved scope per orchestrator instructions.

## Log-rotation hook re-validation

Command: `LOG_RETENTION_DAYS=7 uv run /Users/dragonhearted/Desktop/Adcelerate/.claude/hooks/log_rotation.py < /dev/null`
Exit: `0`. Summary line: `[log-rotation] total: freed 0.0 B across 0 files` (everything within retention window — expected, prior run already pruned 120 MB).

Per-dir kept counts: parent logs 139, autoCaption 4, image-engine 23, instagram-scrapper 2, pinboard 62, prompt-writer 2, readme-engine 5, scene-board 4. `.claude/hooks/logs` 0.

## Failures / blocked commands

1. **`git -C systems/scene-board branch -D claude/refine-local-plan-d5Iox`** — Refused by sandbox permission shim (matched the branch name to Section B regardless of repo). Branch is genuinely Section A per the audit. Engineer must run manually if confirmed.
2. **`git -C systems/scene-board push origin --delete claude/refine-local-plan-d5Iox`** — Same as above.
3. **`git push origin --delete feat/aspect-ratio-picker`** in pinboard — Remote returned `remote ref does not exist`; the ref was already gone but still appearing in the local tracking cache. Resolved by `git fetch --prune origin`. No real failure.
4. **`git push origin --delete feat/ui-overhaul-services-editor`** in pinboard — Same as #3.

No other commands failed. No history rewrite was performed (none required — audit found 0 real-length tokens).

## Out-of-scope (deferred to engineer)

- Section B: 5-repo `claude/refine-local-plan-d5Iox` cluster + parent — held until PR #7 closes.
- Section D: PR triage (rebases / merges / closures).
- Section E deps: 18 high-severity advisories across 5 repos — each repo needs `bun update` + test run.
- Section F: `systems/gif-kit/` and `systems/pdf-kit/` stray-dir decision.
- Submodule pointer bump in parent (after engineer pushes pinboard `30cae8f` and image-engine `ac75315`).
- Pushing the parent commit `chore: housekeeping sweep — branches/specs cleanup` (left local; engineer pushes when ready).
