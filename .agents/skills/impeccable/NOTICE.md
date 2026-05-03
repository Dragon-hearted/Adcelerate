# Notice

Impeccable
Copyright 2025-2026 Paul Bakaus

## Anthropic frontend-design Skill

The `impeccable` skill in this project builds on Anthropic's original frontend-design skill.

**Original work:** https://github.com/anthropics/skills/tree/main/skills/frontend-design
**Original license:** Apache License 2.0
**Copyright:** 2025 Anthropic, PBC

This project extends the original with:
- 7 domain-specific reference files (typography, color-and-contrast, spatial-design, motion-design, interaction-design, responsive-design, ux-writing)
- 23 commands
- Expanded patterns and anti-patterns

## Typecraft Guide Skill

The `typography.md` reference in this project incorporates a set of tactical additions merged in from ehmo's `typecraft-guide-skill` at the author's request: dark-mode weight/tracking compensation, `font-display: optional` vs `swap`, preload-critical-weight-only guidance, variable fonts for 3+ weights, `clamp()` max-to-min ratio bound, responsive measure/container coupling, `text-wrap: balance` / `pretty`, `font-optical-sizing: auto`, ALL-CAPS tracking quantification, and the paragraph-rhythm rule (space OR indent, never both).

**Original work:** https://github.com/ehmo/typecraft-guide-skill
**Original license:** see upstream repo
**Author:** ehmo

## Local Patches

These files have been patched relative to the upstream impeccable source. Future re-vendors should perform a 3-way merge against the upstream commit pinned below.

**Upstream pin:** Run `git ls-remote https://github.com/pbakaus/impeccable HEAD` and record the SHA here when re-vendoring. Current pin: `122a82f715ffdfc6373814bcdbce96459099bd3f`.

### ADCL-2026-001: live-server.mjs — Origin/Host validation + realpath containment + body cap
- **Risk:** Drive-by file write / read via CSRF token leak (CORS allow-* with token in /live.js body); path traversal in /source; DNS rebinding.
- **Patch:** Reject requests with non-localhost Host or non-allowlisted Origin; drop wildcard CORS; realpathSync containment on /source; 1MB cap on POST bodies.

### ADCL-2026-002: live-accept.mjs — symlink escape protection
- **Risk:** Variant accept/discard writes through a symlink to a file outside the repo (supply-chain via malicious dep).
- **Patch:** realpathSync check on every candidate file in findSessionFile and on writeFileSync target.

### ADCL-2026-003: design-parser.mjs — prototype pollution filter
- **Risk:** Malicious DESIGN.md frontmatter pollutes Object.prototype across the long-running live server.
- **Patch:** Filter __proto__/constructor/prototype keys; use Object.create(null) for parse roots.

### ADCL-2026-004: is-generated.mjs — git config sandboxing
- **Risk:** Hostile-clone Git RCE class (CVE-2022-24765 family).
- **Patch:** execFileSync with arg array; GIT_CONFIG_GLOBAL/SYSTEM=/dev/null.
