# The rm-guard blocks by target reachability, not by the -rf flag

The `pre_tool_use.py` rm-guard originally blocked *all* `rm -rf` and only whitelisted one directory (`trees/`). That made routine, recoverable cleanup (deleting `logs/`, `graphify-out/`, scratch dirs during release prep) impossible for the agent, while still not capturing the real hazard. We re-key the guard on the **target path**, not the flag: a delete is blocked only when a target can reach *outside the project tree* or hit an *unrecoverable* target; plain project-relative deletes are allowed.

**Decision:**

1. **Block when any `rm` target is dangerous:** an absolute path (`/…`, e.g. `/var/folders/…/Screenshot.png`), a home path (`~…`), a shell expansion (`$…`, backticks), a glob (`*`, `?`, `[`), a parent-directory escape (`../`, `/../`, trailing `/..`), or the `.git` database. (`_path_is_dangerous`.)
2. **Allow** when every target is a plain project-relative path — so `rm -rf logs/`, `rm -rf graphify-out/ QilinAI/`, `rm ai_docs/README.md`, `git rm …`, and `rmdir` all pass. (`_contains_dangerous_rm` now extracts targets and classifies each, rather than pattern-matching `-rf`.)
3. **Retained:** `.env` access block, subshell/backtick `rm -rf` detection, and quote-stripped re-scan for evasion. The `trees/` whitelist is now subsumed (it's project-relative).
4. **Verified** against an 18-case battery (`/tmp/test_rm_guard.py`, 2026-06-21): the exact `/var/folders/…/Screenshot …png` example and every external/catastrophic form block; every project-local cleanup form is allowed. All pass.

**Why this shape:** the danger was never `-rf` per se — it's *where* the delete lands. `rm -rf logs/` is recoverable; `rm -rf '/var/folders/…'` reaches outside the repo into the user's machine. Keying on the target lets the agent do real cleanup while keeping the genuinely destructive class denied.

**Considered and rejected:**
- **Keep the flag-based block + extend the `trees/` whitelist per task** — every cleanup needs a config edit to the security file; the whitelist grows unbounded and the guard's intent erodes.
- **Allow `find -delete` / route cleanup around the guard** — silently defeats the control the guard exists to enforce.
- **Block all deletes, require the human to run them** — safe but makes the agent unable to do the release-prep cleanup it's tasked with; the human's intent here is explicitly to *enable* recoverable deletes.

**Consequence:** the agent can perform project-local cleanup deletes directly; external/absolute/glob/`.git`/expansion deletes still hard-deny with a message naming why. `ALLOWED_RM_DIRECTORIES` is now effectively redundant (kept for signature compat). A future tightening could add specific protected project paths (e.g. `systems/`, `.claude/hooks/`) if accidental recursive deletion of those becomes a concern — currently they're recoverable via git/submodule re-init.
