# Public Release Prep — Plan & Checklist

Tracks the work to take Adcelerate public. Decisions are recorded as ADRs; this file is the executable checklist. Status: ✅ done · ⏳ pending · 🔲 needs decision.

## Distribution model (decided)
- **Systems stay independently-versioned public submodules; init is lazy** via a routing pre-flight — ADR-0021.
- **Updates propagate by SHA-pin** in the parent repo; the Console surfaces a two-tier **freshness signal** (soft "update available" / hard "too old — update required") — ADR-0022.
- **Emitter events carry a versioned envelope**; drift is rejected loudly at ingest with a compat window, and copies are kept in sync by a local sha256 recipe — ADR-0020.

## Security guard change ✅
- **rm-guard re-keyed to target reachability, not the `-rf` flag** — ADR-0023. Blocks absolute / `~` / `$`,backtick / glob / `..`-escape / `.git` targets; allows project-relative deletes. Verified 18/18 (`/tmp/test_rm_guard.py`). Done in `.claude/hooks/pre_tool_use.py`.

## Licensing ✅
- **MIT** — `LICENSE` added. Copyright line currently `Devanshu Rana`; change to a brand entity (e.g. Dragonhearted Labs) if preferred.

## Repository cleanup ✅ (executed 2026-06-21)
Source: cruft audit 2026-06-21. Guard (ADR-0023) permitted the project-local deletes.

**Tier 1 — pure local clutter ✅ deleted:**
`logs/`¹ · `systems/logs/` · `.claude/hooks/*.log` (4) · `.claude/data/sessions/` · `graphify-out/` (68 MB) · `scripts/brand-asset-cutouts/.venv` (490 MB) · `scripts/brand-asset-cutouts/logs/` · `systems/post-board/tmp/` · `trees/` · `.DS_Store` (4 project-level)
¹ `logs/` reappears live — the session's log-rotation hook writes to it; gitignored + regenerable, so left in place.

**Tier 2 — internal/vendor cruft ✅ deleted:**
`app_docs/` · `specs/` · `QilinAI/` (11 MB) · `adcelerate/` (Obsidian vault, 4.4 MB). (`docs/impeccable-audit.md`, `docs/project-scan-report.json`, `docs/project-parts.json` were already absent.)

**Tier 3 — TRACKED ✅ `git rm`'d (recoverable from history):**
`ai_docs/` (14 files) removed; `ai_docs/` added to `.gitignore`; `docs/index.md` link re-pointed to `/load_ai_docs`.
- ⚠️ **Premise correction:** `ai_docs/` was NOT all regenerable. The 9 `claude-code-*.md` are (README scrape list); the **4 `wisgate-*.md` API docs are not** and prompt-writer cites `ai_docs/wisgate-nanobanana-api.md` as its "Full API reference." User chose **delete all** (2026-06-21); the WisGate docs remain recoverable from git history.
- 🔲 **Follow-up:** prompt-writer submodule has 3 now-dangling refs to `ai_docs/wisgate-*.md` (`knowledge/scope.md`, `models/image/nanobanana-flash.md:191`, `nanobanana-pro.md:512`). Re-source WisGate API docs into prompt-writer's own `knowledge/` or restore from history before its next public submodule push.

## Decisions still open 🔲
- **`client/` (1.2 GB, never committed, already gitignored)** — keep locally (recommended, it's not a publish risk) vs delete vs move to a private repo.

## Already-clean (verified, no action)
- `.gitignore` already anchors `**/.claude/data/` + `**/.claude/scheduled_tasks*` (audit's "leak" was a misread).
- No secrets in tracked tree or history (ADR-0013); `client/` never committed.

## ADR-0013 open-source checklist (remaining)
- 🔲 example `.obsidian/` template + example client (working reference vault for cloners)
- ⏳ update setup docs for the clone-light / lazy-init path (ADR-0021)
- ⏳ `docs/index.md` cross-link to the ADR log + CONTEXT glossary (one entry point)

## Pre-push final gate
1. Execute cleanup (Tiers 1–3) · 2. resolve `client/` decision · 3. `git status` clean of private paths · 4. `git log --oneline` spot-check · 5. push public.
