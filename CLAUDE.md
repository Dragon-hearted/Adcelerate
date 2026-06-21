# Adcelerate

A monorepo of independent AI marketing/media systems, orchestrated through Claude Code skills and agents. See `CONTEXT.md` for the domain glossary and `docs/adr/` for architectural decisions.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as **GitHub issues** on `Dragon-hearted/Adcelerate` via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) map 1:1 to GitHub labels of the same name. See `docs/agents/triage-labels.md`.

### Domain docs

**Single-context** layout: one root `CONTEXT.md` glossary + `docs/adr/`. See `docs/agents/domain.md`.
