# Open Task Scan — 2026-05-01

## Executive Summary
- Repos scanned: 8 (parent + 7 submodules)
- Total markers: 5
- TODO: 5  |  FIXME: 0  |  HACK: 0  |  XXX: 0
- HIGH priority (top 25): 0
- Orphan TODOs (no covering spec): 0

All 5 hits are non-actionable references — either documentation prose that
quotes the word "TODO" as part of an example, or template placeholders that
intentionally render the literal string `[TODO]` in generated output. There
are zero true source-code action markers across the platform. This is itself
a notable finding: the codebase carries no accumulated FIXME/HACK debt.

Tooling: ripgrep 14.1.1 with file types `py,js,ts,go,rust,md` (and a follow-up
broader pass adding `sh,yaml,json` which surfaced no additional hits).
Excluded: node_modules, .git, dist, build, .next, __pycache__, *.lock, *.min.*,
logs, specs/reports/_partials, specs/full-security-and-housekeeping-review.md,
bun.lockb, package-lock.json.

## Counts per Repo
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

## Top 25 Prioritized Items

Only 5 markers exist; all are TODO and all are younger than 90 days, so all
fall into the LOW bucket per the rubric. None are HIGH or MEDIUM.

| # | Priority | Marker | Repo | File:Line | Age (days) | Excerpt | Covering Spec |
|---|----------|--------|------|-----------|------------|---------|---------------|
| 1 | LOW (false-positive) | TODO | Adcelerate | ai_docs/claude-code-hooks.md:670 | 37 | `"pattern": "TODO.*fix",` (example regex inside vendor docs) | n/a (vendor doc) |
| 2 | LOW (false-positive) | TODO | Adcelerate | ai_docs/claude-code-agent-teams.md:66 | 37 | `I'm designing a CLI tool that helps developers track TODO comments across` (example prompt text) | n/a (vendor doc) |
| 3 | LOW (placeholder) | TODO | systems/prompt-writer | src/registry.ts:184 | 17 | `.replace("[company-name]", "[TODO]")` (intentional template placeholder for generated rubric) | prompt-writer-system.md |
| 4 | LOW (placeholder) | TODO | systems/prompt-writer | src/registry.ts:199 | 17 | `` `| ${name} | [TODO] | experimental | ${relativePath} |` `` (intentional placeholder for generated registry row) | prompt-writer-system.md |
| 5 | LOW (false-positive) | TODO | systems/scene-board | knowledge/acceptance-criteria.md:104 | 35 | `...no placeholder text, no TODO markers, and no unresolved approval gates...` (acceptance-criteria meta reference) | adcelerate-v1-platform-upgrade.md (scene-board criteria) |

## All Hits (raw)

### parent (/Users/dragonhearted/Desktop/Adcelerate)
```
ai_docs/claude-code-hooks.md:670:    "pattern": "TODO.*fix",
ai_docs/claude-code-agent-teams.md:66:I'm designing a CLI tool that helps developers track TODO comments across
```
Blame:
```
613a08e2 (Devanshu Rana 2026-03-25 11:17:26 +0530 670)     "pattern": "TODO.*fix",
613a08e2 (Devanshu Rana 2026-03-25 11:17:26 +0530  66) I'm designing a CLI tool that helps developers track TODO comments across
```

### systems/autoCaption
No markers found.

### systems/image-engine
No markers found.

### systems/instagram-scrapper
No markers found.

### systems/pinboard
No markers found.

### systems/prompt-writer
```
src/registry.ts:184:		.replace("[company-name]", "[TODO]")
src/registry.ts:199:	const newRow = `| ${name} | [TODO] | experimental | ${relativePath} |`;
```
Blame:
```
^b5982b3 (Devanshu Rana 2026-04-14 14:12:20 +0530 184) 		.replace("[company-name]", "[TODO]")
^b5982b3 (Devanshu Rana 2026-04-14 14:12:20 +0530 199) 	const newRow = `| ${name} | [TODO] | experimental | ${relativePath} |`;
```

### systems/readme-engine
No markers found.

### systems/scene-board
```
knowledge/acceptance-criteria.md:104: ...no placeholder text, no TODO markers, and no unresolved approval gates...
```
Blame:
```
^124b5ae (Devanshu Rana 2026-03-27 12:42:58 +0530 104) The storyboard must read as a unified, polished creative deliverable...
```

## Orphan TODOs Worth Promoting to Specs

None. Every hit is either:
- a vendor doc snippet (ai_docs/claude-code-*.md) — not project work,
- an intentional template placeholder in `prompt-writer/src/registry.ts` that
  is by design rendered into generated rubric files for the user to fill in, or
- a meta reference in scene-board acceptance criteria forbidding TODO markers
  in deliverables.

No real engineering follow-up has been left in the code as a marker comment.

## Coverage Cross-Reference

- spec `prompt-writer-system.md` — covers prompt-writer/src/registry.ts (the
  `[TODO]` strings are part of the registry/rubric scaffolding behaviour
  described there).
- spec `adcelerate-v1-platform-upgrade.md` and the scene-board entries in
  `nanobanana-image-engine-and-sceneboard-integration.md` — cover the
  scene-board acceptance-criteria document.
- The two `ai_docs/` hits live in vendor reference material and are not
  expected to be governed by an Adcelerate spec.

## Methodology Notes
- Today: 2026-05-01.
- ripgrep run via the user's `rg` shell function (the system has no standalone
  `rg` binary; `command rg` therefore fails — the function form is what works).
- Initial scan used `-t py -t js -t ts -t go -t rust -t md`; broader follow-up
  pass added `-t sh -t yaml -t json` and produced no additional hits.
- Stray non-submodule directories `systems/gif-kit` and `systems/pdf-kit`
  were skipped per instructions.
- Submodule list verified against `.gitmodules` (7 submodules listed above).
