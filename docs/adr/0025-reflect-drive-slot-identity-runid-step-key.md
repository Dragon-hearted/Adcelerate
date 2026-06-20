# Reflect/Drive slot identity: `(runId, step-key)` at emit, Board projection for cross-Run stacking

The same Flow can be launched two ways — from the **CLI (Reflect)** and from the **Console (Drive)** — and both emit through one ingest with the same deterministic step-key scheme (`sceneId`-style slot ids). A step-key is "reused verbatim on re-run so Branches stack onto a single Step." Left unqualified, that invites a collision: two independent Runs that both mint step-key `s1` would fuse their Lineages, or two different systems that coincidentally mint the same string would cross-contaminate. This ADR fixes the identity model so the stacking we *want* happens and the fusion we *don't* want is structurally impossible.

**Decision:**

1. **Emit-time identity is `(runId, step-key)`.** A producer knows its own `runId` but not Boards (a Console concept applied after the fact), so the pair is the only thing unambiguous at the source. Two Runs' `s1` are distinct Substrate Steps `(A,s1)` / `(B,s1)`; the monotonic per-branch fold can never silently merge them. Raw collision is structurally impossible.

2. **Cross-Run Branch-stacking is a Board-projection decision, not an ingest merge.** Re-running a slot stacks a new Branch onto one logical Step *one layer up*: the Board projection maps multiple Runs' Steps onto a single logical slot. The merge is **automatic but visible** — Lineage tags each stacked Branch with its Run and provenance (agent vs human) — and gated by Board co-membership plus a matching merge key.

3. **The merge key is `(producerSystem, slot-id)`, never a bare step-key.** The Emitter already stamps each event with its system (`systems.yaml`), so the projection merges only same-system, same-slot-id Steps. A scene-board `s1` and an image-engine `s1` cannot fuse on a heterogeneous many-Runs Board; their relationship is an **edge** (cross-Run dependency), not a slot merge.

4. **A Reflect Run is born Board-less and joins a Board only by explicit operator act.** It is visible in Console history the instant it emits `run.started` (the Console lists all Runs from the event store, mode-agnostic), and gains Board membership only via "open into Board" (which creates a default one-Run Board) — adding a second Run is a further explicit action. The producer never learns Boards exist. Board co-membership *is* the operator's "these belong together" consent, which is why the §2 merge needs no per-merge confirmation.

5. **Concurrency is bounded by a soft Execution Lease.** A logical slot is "busy" while it holds a `queued`/`running`/`retrying` Branch — a *derived* read over the Step lifecycle, not a new state or a first-class lock. A Drive that targets a leased slot **blocks at the Approval Gate** ("slot busy in Run X — wait or cancel") rather than double-dispatching; the lease releases on terminal (`succeeded`/`failed`). The resolved active Branch still follows the existing human-sticky rule (ADR on Branch).

**Why this shape:** the producer (a system Emitter, often a detached CLI process) must be able to assign identity with only what it knows — its `runId` and its own slot ids. Pushing Board-awareness or global uniqueness down to the producer would couple a transient producer to a durable-consumer concept, violating "the Substrate owns the durable record; systems are transient producers." Keeping emit identity Run-local and doing all cross-Run reconciliation in the consumer-side Board projection means the dangerous operation (fusing two Lineages) only ever happens where the operator can see and gate it, and the safe operation (distinct Steps) is automatic.

**Considered and rejected:**
- **Global step-key identity** (so `s1` is always one Step everywhere) — gives "free" stacking but fuses every Run of a Flow anywhere, the exact collision this prevents, and demands global uniqueness the CLI can't guarantee.
- **Board-scoped identity at emit** — the CLI doesn't know the Board, so it can't compute this id at emit time.
- **Bare step-key as merge key** — latent cross-system fusion bug that surfaces the first time two systems mint the same slot string.
- **Per-merge confirmation** — redundant with Board co-membership + slot-id determinism; just noise.
- **CLI Runs auto-attach to a Board** — forces Board-awareness onto the producer and silently fuses unrelated terminal Runs.
- **Allow concurrent same-slot dispatch / a hard mutex** — concurrency causes double-spend and an ambiguous winner; a first-class lock adds a control-plane concept when a derived read over `running` already answers "is this slot busy."

**Consequence:** the Board projection gains a `(producerSystem, slot-id)`-keyed grouping over the Runs a Board references, surfaced in Lineage with Run + provenance tags. "Open into Board" is the sole attachment path for loose Runs. The Execution Lease is a derived view, reused as a precondition at the Approval Gate (ADR-0024) — making that gate the single choke point for both consent (Item 8) and slot-contention (Item 9). v1's one-Run-per-board default means cross-Run stacking and lease contention are rarely exercised, but the identity model is correct for the many-Runs-per-board schema that ships from day one.
