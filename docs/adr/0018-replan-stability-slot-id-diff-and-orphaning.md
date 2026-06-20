# Step identity survives re-planning via a carried-forward slot id, and dropped slots orphan rather than delete

ADR-0006 fixed the step-key as a stable semantic key (not a transient `tool_use_id`). This ADR answers the dependent question: does that key survive the agent **re-planning** a batch (different items / order / content)? If keys shift on re-plan, every Branch detaches.

**Grounding (Explore, 2026-06-20):** batch item identity is `item.sceneId ?? randomUUID()` (`batch-executor.ts:165`); a batch is `{ items[], dependencies[] }` with dependencies keyed by `sceneId` (`types.ts:116-119`). So `sceneId` is *already* the semantic key — supply a consistent one and the item stays identified across reorder/insert/delete. Two gaps make this fragile: (a) the **UUID fallback** mints a fresh, unstored id every run, so an unkeyed item's Branches detach on every re-run, silently; (b) **nothing carries `sceneId`s forward** across a re-plan — the API delegates stability to the caller, and an LLM re-planning will free-associate new `sceneId` strings.

**Decision:**

1. **`sceneId` is the step-key's stable component.** The Emitter keys observed Steps `<batch>:<sceneId>` (ADR-0006/0008). This rides on an existing field, not net-new identity.

2. **`itemId`/`sceneId` is a semantic *slot* id, never content-derived.** Editing an item's prompt/params must **not** change its key — that *is* the branch-on-edit operation (a new Branch on the *same* Step, ADR-0003). Content/prompt-hash identity is explicitly rejected: it would detach Branches on the exact operation branching exists to support. Identity is a stable slot, assigned once and carried forward.

3. **The UUID fallback is forbidden for observed flows.** Any Flow that wants branching must supply `sceneId` per item; an unkeyed item is best-effort/ephemeral and explicitly **not** branchable. Build-task: make `sceneId` mandatory on the observed batch path, replacing today's silent UUID mint (`batch-executor.ts:165`).

4. **A re-plan is a diff expressed in slot ids, not a blind regeneration.** When the agent re-plans, the orchestrator carries forward `sceneId`s for continued slots, mints new ones only for genuinely new items, and for slots dropped from the new plan marks the Step **Orphaned** — preserved with Branches/Lineage intact (immutability, ADR-0003), greyed on the Canvas as "removed from current plan," **never silently deleted**. This is the "the batch itself changed" rule.

5. **Detachment is always surfaced.** A new slot makes a node appear; a dropped slot orphans visibly. Never a silent key shift.

**Considered and rejected:**
- **Content/prompt-hash identity** — stable under reorder, but detaches Branches the moment you edit a prompt, breaking branch-on-edit.
- **Trusting the agent to reuse `sceneId`s** — LLM re-plans are non-deterministic; identity can't rest on free-association.
- **Deleting dropped slots** — discards immutable Lineage; violates ADR-0003's "nothing is mutated in place / everything preserved."
- **Keeping the silent UUID fallback for observed flows** — guarantees detachment every re-run.

**Consequence:** the orchestrator must persist the slot-id set per Run/Board and force re-plans through a keep/edit/add/remove diff against it — the agent cannot emit a fresh `items[]` array and hope. A new Step state, **Orphaned**, joins the model (a slot removed from the current plan), distinct from **Stale** (upstream changed). Both share the "preserve + flag, never delete" spirit.
