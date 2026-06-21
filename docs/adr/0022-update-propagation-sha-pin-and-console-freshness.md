# System updates propagate by SHA-pin; the Console surfaces a two-tier freshness signal

Systems are independently-versioned, public, SHA-pinned submodules a cloner lazy-inits (ADR-0021). That raises two questions for a public release: when a system is updated, how does a cloner's Console get it — and how does the cloner even learn an update exists. A cloner runs whatever submodule SHA they last fetched, so version skew between an installed system and the orchestrator is the *normal* state, not an edge case. We propagate updates via the parent repo's pinned SHA (git's native model) and surface skew as a two-tier freshness signal in the Console, hard-gated by the envelope version (ADR-0020).

**Grounding:** see ADR-0021 (submodule wiring, lazy-init pre-flight, no version field in `systems.yaml`, `sub-update` = `--remote --merge`) and ADR-0020 (envelope versioning + compat window).

**Decision:**

1. **The published version of a system is the gitlink SHA the adcelerate repo pins for it** — git's native model. Shipping a fix: merge in the system repo → bump the pinned SHA in adcelerate → commit/tag adcelerate. A cloner's `git pull` on adcelerate advances the pin; their next `git submodule update` (or the ADR-0021 routing pre-flight) fetches it. **Reject runtime branch-tracking** — it makes every cloner a different version and turns ADR-0020's drift from an edge case into the default. `just sub-update`'s `--remote --merge` stays a *maintainer* convenience for deciding to bump, never the published contract.

2. **The ADR-0021 pre-flight does double duty.** It already checks "is `systems/<x>/` populated"; it also compares **checked-out SHA vs pinned SHA** to detect a pending update, and (per ADR-0020) the installed `envelopeVersion` vs the orchestrator's compat window.

3. **Freshness surfaces in the Console's left zone, never on the Canvas.** The Canvas renders a Run's artifacts; freshness is a system-catalog concern. Two soft-skew touchpoints (package-manager style): a passive *"N system updates available"* indicator, and an inline chat mention when a Flow routes to a stale system (*"scene-board v2 available; running your installed v1"*). Soft skew is **non-blocking** — a behind-but-compatible system still runs.

4. **Hard skew is gated, at two layers.** When the installed `envelopeVersion` falls outside the compat window (ADR-0020): **pre-flight** blocks the Run *before* dispatch with the fix command (*"scene-board is too old for this orchestrator — `git submodule update`"*); **ingest** rejects with 4xx as the defensive backstop if a too-old event arrives anyway. Pre-flight for UX, ingest for safety.

5. **Three roles, one signal.** Submodule SHA = *delivery*; envelope version = *contract*; the Console freshness indicator = the *surface* that fuses them. The maintainer keeps Emitter copies in sync (ADR-0020 §6) before blessing a pinned SHA; the cloner sees soft nudges and gets hard-stopped with a fix command only when genuinely incompatible.

**Considered and rejected:**
- **Runtime branch-tracking** (every run pulls latest) — non-reproducible; two cloners on the same adcelerate SHA run different system code; maximises drift.
- **Surface freshness on the Canvas** — wrong altitude; the Canvas is per-Run, freshness is per-system-in-catalog.
- **Hard-stop on any skew (no soft tier)** — punishes harmless behind-but-compatible installs; the compat window (ADR-0020) exists precisely so old-but-known versions keep working.
- **No visibility, rely on cloners running `git submodule status`** — invisible inside the Console; cloners never learn an update shipped.

**Consequence:** the ADR-0021 routing pre-flight gains SHA-compare + envelope-compare logic; the Console left zone gains a freshness indicator + inline stale-on-route mention (derived state, nothing new persisted); release/maintainer docs describe the bump-pinned-SHA flow. Reproducibility is preserved: adcelerate@<tag> always resolves to the same 8 system versions.
