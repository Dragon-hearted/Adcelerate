# Emitters report a Step lifecycle, not a single terminal event

The Canvas must show real-time progress *within* a Step, not just its final artifact — a single image generation can take 20–30s (Higgsfield CLI `--wait --json` blocks; `downloadToBuffer` has a 30s timeout), and a node that only appears on completion leaves the Canvas blank and looks frozen. The originally-scoped Milestone 1 Emitter posted one event "as each gen completes" (terminal-only), which would have reproduced exactly that.

**Decision:** every Emitter reports the full **Step lifecycle** — `running` on dispatch, an optional `retrying(n/max)`, and a terminal `succeeded`/`failed` — instead of a single completion event. The ingest and Canvas renderer treat a Step as a state machine (`queued → running → succeeded|failed`), and the node renders each state honestly. The elapsed-time indicator ticks **client-side** once `running` arrives, so it costs no extra events.

This also makes `failed` the single, canonical failure state — there is no separate failure-rendering model (it closes the "failure rendering" robustness question).

**Considered and rejected:**
- **Terminal-only emission** (the original M1 plan) — simplest, but *is* the bug: the node only exists once the artifact is already done.
- **A real progress percentage / determinate bar** — image-engine's providers are opaque (Higgsfield blocks; WisGate is a single fetch + retry loop; neither exposes mid-render progress). Any percentage would be fabricated and would erode trust the moment a gen stalls in the 30s download window. We show honest coarse states + an elapsed timer instead.

**Consequence:** the Emitter now fires at **≥2 points** (dispatch + terminal, plus retries) rather than one, and for batches it must hook **per-item** in `executeItem()` (`src/lib/batch-executor.ts:145`) rather than per-layer — per-layer emission cannot drive a "3/8 complete" counter. This widens the Emitter↔ingest envelope that is copied into each submodule (the drift surface flagged in ADR-0008), so the lifecycle event shape is part of the versioned contract.
