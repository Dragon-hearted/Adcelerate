# Emitters bracket every Run with an explicit lifecycle, never inferred

The Canvas must know when a *Run* (a Flow invocation) is done, and with what outcome — to auto-save/notify on a Board (ADR-0010), to give a cascade (ADR-0003) a `cancelled` hook, and to stop a node graph from looking half-finished forever. There are three ways to *infer* completion and all three are wrong:

- **"All Steps are terminal"** is racy — the last Step's `succeeded` event and the Run's invocation actually returning are not the same instant, and a Run can legitimately finish having emitted **zero** Steps.
- **`sessions.endedAt`** only exists for Runs the orchestrator *spawned* (Drive mode). In **Reflect** mode the Run is an external CLI skill the orchestrator never launched, so there is no `endedAt` to read.
- **Socket disconnect** conflates "done" with "crashed."

**Decision:** every Emitter brackets its Run with explicit lifecycle events — `run.started` … `run.completed(status)` — emitted by the Flow's skill wrapper at invocation entry/exit, parallel to the Step lifecycle of ADR-0009. Completion is **never inferred** from Step states, `endedAt`, or transport signals. This is the only mechanism that gives Reflect-mode (external CLI) Runs honest completion, since nothing in the orchestrator's process tree observes them.

Terminal status is **non-binary**:
- `completed` — Run finished, all Steps succeeded.
- `completed-with-failures` — Run finished, but ≥1 Step is `failed`.
- `failed` — the Run itself errored/crashed (distinct from a Step failing inside an otherwise-healthy Run).
- `cancelled` — the Run was stopped before terminating (the hook Bulletproofing #3 needs for mid-cascade cancellation).

**Run-done ≠ Board-done.** A Board is the durable workspace (ADR-0010); auto-save/notify on `run.completed` is a *convenience*, not a "you are finished" signal. The two concepts stay separate so a multi-Run Board (e.g. a scene-board Run plus an image-engine batch launched off one frame) doesn't think it's "done" the moment its first Run completes.

**Cascades re-fire it.** A cascade is its own Run on the same Board (ADR-0003), so `run.completed` fires once per cascade Run — the cancel/partial-failure semantics come along for free.

**Considered and rejected:**
- **Infer from Step states** — racy, and blind to zero-Step Runs.
- **Infer from `sessions.endedAt`** — does not exist for Reflect-mode external CLI Runs; would silently never complete them.
- **Binary done/failed** — collapses "the Run crashed" with "the Run finished but a gen 402'd," which the operator needs to tell apart to decide whether to retry one node or re-launch the whole Flow.

**Consequence:** every system's Emitter copy now wraps its skill entry/exit, not just per-Step emission — more surface area copied into each isolated submodule, widening the drift problem of ADR-0008 (Bulletproofing #7). Run-lifecycle events join Step-lifecycle and artifact-pointer events as part of the **versioned envelope**, and ingest must dedupe/order them like any other event (Bulletproofing #6).
