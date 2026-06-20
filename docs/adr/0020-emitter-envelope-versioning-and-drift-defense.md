# Emitter events carry a versioned envelope; drift is defended loudly at ingest and synced locally

The Emitter is **copied** into each isolated submodule, not imported (ADR-0008 — submodules can't reach the workspace). Copies drift: a system can emit an event shape the orchestrator no longer understands, or fall behind a sharpened canonical Emitter. Once Adcelerate is public and systems are independently-versioned, SHA-pinned submodules a cloner lazy-inits (ADR-0021/0022), this drift stops being internal hygiene and becomes a **public contract** between an arbitrary-version system copy and the orchestrator. We make the event envelope explicitly versioned, validate it loudly at ingest, and keep the copies in sync with a local recipe.

**Grounding (Explore, 2026-06-20):**
- `@command-center/packages/shared` exists with a canonical `CCEvent` **TS interface only — no zod** (`events.ts:23-38`).
- zod is already a dep in the orchestrator (`^3.24.1`) and 5/8 systems (NOT image-engine/scene-board).
- Root `justfile` has `sub-init`/`sub-update`/`sub <proj> <recipe>` only — **no sync recipe**. `library_sync.py` is an existing sha256 + `write_if_changed` precedent.
- 8 independent submodules; **no root CI** (only auto-editor has per-submodule CI). The Emitter is entirely net-new.

**Decision:**

1. **Canonical Emitter source-of-truth in `@command-center/packages/shared`**, copied (not imported) into each submodule — ADR-0008 stands. The copy is mechanical, the source is one.

2. **Every event carries an `envelopeVersion` (SemVer).** The orchestrator declares `minVersion` and `currentVersion`. The band `[minVersion, currentVersion]` is the **compat window**.

3. **Ingest validates against a versioned zod schema** (net-new — the shared package has only a TS interface today). Known-but-old versions (`≥ minVersion`) are carried to current shape by a small **upcaster** (a v1→v2→… function chain). Versions **outside** the compat window — unknown-future, below-floor, or unparseable — are **rejected loudly (4xx)**.

4. **Loud-reject is deliberately distinct from ADR-0019's silent dedupe.** A duplicate is harmless (the fold already holds that state) → swallow it. An unknown-version event is a **contract break** → it must surface, never vanish, because the Substrate is the canonical durable record (ADR-0011) and must not silently accumulate shapes the Canvas can't render. Better a visible gap with an alarm than quiet corruption.

5. **Enforced at two layers** (see ADR-0022 for the UX): **pre-flight** on routing (block a too-old system *before* a Run, with the `git submodule update` fix) and **ingest** as the defensive backstop (4xx if a too-old event arrives anyway). Pre-flight is for UX; ingest is for safety. Never trust, always validate.

6. **Copy-sync is a local recipe, not CI.** `just emitter-sync` reuses `library_sync.py`'s sha256/`write_if_changed`; drift = sha256 ≠ canonical. A pre-commit/push hook blocks a divergent commit so copies are in sync *before* a system SHA is blessed (ADR-0022). No net-new root CI — none exists today; promote the same sha256 check into CI if the repo ever grows one. Optional per-submodule contract test deferred.

**Considered and rejected:**
- **Lenient accept-and-log at ingest** — keeps events flowing but lets malformed shapes into the canonical store; the failure is discovered weeks later when the Canvas renders wrong. Loses the alarm exactly when you need it.
- **Stand up root GitHub Actions now** — net-new CI infra for a problem `library_sync.py` already solves locally; the repo has no root CI to extend.
- **Import the shared Emitter instead of copying** — impossible across isolated submodules (ADR-0008).
- **No version field, validate structurally** — can't tell "old-but-valid" from "broken," so can't upcast; every shape change becomes a hard break.

**Consequence:** net-new versioned zod schema + upcaster in `@command-center/packages/shared`; `envelopeVersion` stamped on every Emitter event (the M1 image-engine Emitter included); ingest gains version-validation atop the ADR-0019 dedupe/fold; a `just emitter-sync` recipe + git hook; image-engine and scene-board gain zod. The Emitter glossary term gains `envelopeVersion`. The hard-skew freshness signal (ADR-0022) consumes this version as its trigger.
