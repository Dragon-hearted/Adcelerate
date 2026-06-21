# The active Branch is event-sourced and human-sticky, not a mutable cell

ADR-0003 says exactly one Branch per Step is `active`, and re-running cascades from it. ADR-0005 makes `branches` a projection. Two writers point at "active": the **operator** (manually choosing a Branch in the carousel/lineage UI) and the **agent** (a cascade auto-activating a freshly regenerated Branch when upstream changed). When both fire near-simultaneously on the same Step, a mutable `active` column with last-writer-wins can silently clobber the operator's choice — and then the cascade resumes downstream off a Branch the human never picked.

The provenance-aware cascade (the *Stale* rule) already handles the cascade-vs-existing-human-branch case: agent cascades regenerate *agent-authored* downstream Branches and leave *human-authored* ones Stale-but-untouched. What remains is the pure timing race on the active pointer itself.

**Decision (two parts):**

1. **`active` is event-sourced, not a mutable column.** There is no `UPDATE branches SET active=…` to race on. Activation is an `activate(stepKey, branchId, provenance, generation)` event, and the projection folds events in **ingest order** — collapsing the "projection-table race" into the ordering/dedupe discipline already required for ingest (Bulletproofing #6). Operator flips enter as events through the orchestrator over Socket.IO; agent auto-activations enter through the Emitter. **Two ingress paths, one ordered event log.** This admits the **Console as a control-plane producer** to the Substrate, alongside the data-plane producers (system Emitters) — and it is what makes an active selection replayable, so a reopened Board (ADR-0010) restores the same active Branch.

2. **Resolution is human-sticky, not last-writer-wins.** When folding, an agent cascade auto-activation does **not** override a human `activate` recorded at-or-after the cascade's triggering input (compared via the `generation` tag). The regenerated agent Branch still lands in Lineage — it is simply **non-active**, surfaced with a "newer regeneration available" affordance. This is the *Stale* principle ("human work is never silently overwritten") applied to the active pointer rather than to downstream artifacts.

**Considered and rejected:**
- **Mutable `active` column + last-writer-wins** — simplest, but silently clobbers operator intent and isn't replayable, breaking Board reopen.
- **Freshest-regeneration-always-wins** — clean rule, but yanks the active pointer out from under an operator who just chose; violates the human-intent-is-sacred principle the rest of the design rests on.
- **Optimistic-concurrency reject + retry toast** — pushes the conflict onto the user as an error to resolve, when the system already has enough information (provenance + generation) to resolve it correctly and silently.

**Consequence:** the ingest/event model now has two producer classes — system Emitters (data plane) and the Console (control plane). Operator UI actions that change Substrate state (active-flip, and by extension pin/note/layout-save under ADR-0010) become first-class events on the log, subject to the same dedupe/ordering as Emitter events (Bulletproofing #6). The `branches` projection fold carries a provenance + generation comparison rather than a blind upsert.
