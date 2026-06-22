---
description: Run setup_init hook and report installation results
argument-hint: [hil]
---

# Purpose

Execute the repository initialization hook (setup_init), then summarize and report the results to the user.

## Variables

MODE: $1 (optional - if "true", run interactive mode)

## Workflow
> Execute the following steps in order, top to bottom:

1. **First**, execute `Skill(/prime)` to understand the codebase
2. Check for interactive mode: If MODE is "true", run `Skill(/install-hil)` and ignore the remainder of this prompt
3. Read only the last 50 lines of the log file at `.claude/hooks/setup.init.log` (the hook already ran via `--init` flag). Use the Read tool with a `limit` of 50 and an appropriate `offset` (determined by checking the file length first), or use `tail -n 50` via Bash — this avoids reading the entire log history when only the latest session entry is needed.
4. Analyze for successes and failures
5. **Check Command Center status**: Run `curl -s http://localhost:4100` and `curl -s http://localhost:3000` to check if the Command Center orchestrator and web dashboard are already running. Use these results to tailor the **Next steps** section of the report.
6. Write results to `app_docs/install_results.md`
7. Report to user

## Report

Write to `app_docs/install_results.md` and respond to user:

**Status**: SUCCESS or FAILED

**What worked**:
- [completed actions]

**What failed** (if any):
- [errors with context]

**Next steps**:
- If the Command Center is already running: Report that it is active (orchestrator on :4100, web dashboard on :3000) and no action needed
- If the Command Center is NOT running: Suggest `just cc-install` (if dependencies might be missing) and `just cc-dev` to start it
- Always include: Use `/library list` to browse available skills, agents, and commands
