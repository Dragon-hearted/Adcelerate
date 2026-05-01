
---

## Run 2 — Full Scan (Bash-enabled)

_Auditor: security-auditor (re-run); date: 2026-05-01; scope: parent + 7 declared submodules per `.gitmodules`. `systems/gif-kit` and `systems/pdf-kit` excluded from main scan as non-submodule stray dirs (see Scan 9)._

### Scan 2 Executive Summary
- Working-tree secrets (Scan 1): **0**
- History-committed secrets (Scan 2 pickaxe, real-length matches): **0** (all pickaxe hits were false positives — short word fragments / placeholder text)
- Tracked `.env` files (Scan 3): **0** (one tracked `.env.example` template in pinboard — expected, not a finding)
- Hardcoded cred suspicions in source (Scan 4): **0**
- Unsafe exec patterns (Scan 5, Critical / Medium): **0 / 0**
- Dependency advisories (Scan 6): **29 total** across 6 repos (0 critical, 18 high, 9 moderate, 1 low, 1 unscored — 2 repos clean)
- Repo visibility (Scan 7): **8 / 8 PUBLIC** (entire fleet is public — see notes)
- image-engine key logging hits (Scan 8): **0**

### Critical Findings (Run 2)

**C-1. Entire fleet is public on GitHub** — All 8 repos under `Dragon-hearted/*` are PUBLIC. Per the user's persistent memory rule (`feedback_publish_audit_private_content.md`), public repos require a `git ls-files` cross-check for client/proprietary content before publication. No tracked client data, credentials, or PII was found in the working trees during this scan, but ongoing publication discipline is required: any future commit that adds proprietary or customer-identifying content to these repos will be exposed immediately. Recommend either (a) flipping repos that contain proprietary engine code (`pinboard`, `image-engine`, `prompt-writer`) to private, or (b) maintaining an explicit pre-commit / pre-push audit step.

### High Findings (Run 2)

**H-1. Outdated dependencies with known high-severity advisories — 18 high-severity hits across 5 repos.**
- `apps/server`: 6× high (all `node-tar` / `tar` path-traversal & symlink-poisoning advisories — GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w). Remediation: `bun update` in `apps/server`.
- `apps/client`: 4× high (`Vite` arbitrary file read GHSA-p9ff-h696-f583, `Vite` `server.fs.deny` bypass GHSA-v2wj-q39q-566r, 2× `picomatch` ReDoS GHSA-c2c7-rcm5-vvqj). Vite advisories matter only in dev mode but must be patched.
- `systems/autoCaption`: 3× high (same `Vite` + `picomatch` chain).
- `systems/pinboard`: 4× high (all `xmldom` — XML injection via DocumentType / processing-instruction / comment serialization, plus uncontrolled-recursion DoS: GHSA-2v35-w6hq-6mfw, GHSA-f6ww-3ggp-fr8h, GHSA-x6wf-f3px-wcqx, GHSA-j759-j44w-7fr8). `xmldom` is unmaintained — recommend migrating to `@xmldom/xmldom` (the maintained fork) or a different XML lib.
- `systems/scene-board`: 1× high (`basic-ftp` DoS GHSA-rp42-5vxx-qpwr).

### Medium Findings (Run 2)

**M-1. Outdated dependencies with moderate-severity advisories — 9 hits.**
- `apps/server`: 1 (`brace-expansion` ReDoS GHSA-f886-m6hf-6m8v).
- `apps/client`: 5 (`brace-expansion`, `PostCSS` XSS GHSA-qx2v-qp2m-jg93, 2× `picomatch` injection GHSA-3v7f-55p6-f55p, `Vite` path traversal GHSA-4w7w-66w2-5vf9).
- `systems/autoCaption`: 3 (PostCSS, Vite path traversal, picomatch).
- `systems/image-engine`: 1 (`hono/jsx` HTML injection GHSA-458j-xx4x-4375).

### Low / Informational (Run 2)

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

### Remediation Checklist (Run 2)

1. **High**: `cd apps/server && bun update` — clears 6× node-tar high-severity advisories.
2. **High**: `cd apps/client && bun update` — clears 4× high (Vite + picomatch).
3. **High**: `cd systems/autoCaption && bun update` — same as client.
4. **High**: `cd systems/pinboard` — replace `xmldom` dep with `@xmldom/xmldom` (maintained fork). 4× high advisories.
5. **High**: `cd systems/scene-board && bun update` — clears `basic-ftp` advisory.
6. **Medium**: `cd systems/image-engine && bun update` — clears `hono/jsx` SSR advisory.
7. **Process**: confirm the public-visibility posture of `pinboard`, `image-engine`, `prompt-writer` is intentional; if any contain proprietary engine logic, flip to private. Adopt a pre-push secret-scan hook (e.g., `gitleaks pre-push`) since the entire fleet is public-by-default.
8. **Cleanup (informational)**: decide whether `systems/gif-kit/`, `systems/pdf-kit/`, and `systems/pinboard/.legacy/` should be deleted from the working tree — they are neither submodules nor active.
