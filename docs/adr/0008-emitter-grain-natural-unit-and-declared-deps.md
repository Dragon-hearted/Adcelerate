# Emitter grain: a Step is a system's natural work unit; edges are its own declared dependencies

Instrumenting a flow onto the Canvas requires deciding what becomes a node (a Step) and what becomes an edge of the Step Graph. The first system to instrument is image-engine (Milestone 1), whose work is either a single generation or a **batch** of generations with topologically-sorted `dependencies` (`src/lib/batch-executor.ts`). The decision here sets the precedent every later system follows.

**Decision:** each system's Emitter reports Steps at **that system's own natural unit of work**, and edges are **whatever dependencies the system already declares** — we do not impose a uniform shape across systems.

- **image-engine:** one Step per **generation** (single gen, or each batch item). step-key = `<batch>:<itemId>` (or `<gen>` for a lone generation). The batch's existing `dependencies` array becomes the Step Graph **edges** verbatim — the dependency DAG it already computes *is* the Canvas DAG, so edges come for free. Re-running an item reuses its step-key, so Branches stack onto that node (per ADR-0006).
- **scene-board (later):** one Step per **Stage**, with a second Op level only where real sub-structure exists (Stages 3, 4.5, 6-Phase1) — two-level nesting is justified there because the inner level is real.

**Considered and rejected:**
- **One Step per batch** (whole batch = one node) — too coarse: kills per-image branching (the point of the Canvas) and discards the dependency edges entirely.
- **Forced two-level everywhere** (batch = Stage, gens = Ops) for uniformity with scene-board — an image-engine generation has no meaningful sub-ops, so the outer wrapper would be empty ceremony. Uniform shape is not a goal; faithful grain is.

**Consequence:** Milestone 1 exercises the full Console loop (multiple nodes, real edges, per-node branching) on the *simplest* flow, with the Emitter reusing data image-engine already tracks. The general contract for all future systems: **node = natural work unit; edges = the system's own declared dependencies; granularity is per-system, not uniform.** Heterogeneous grain across systems is expected and correct.
