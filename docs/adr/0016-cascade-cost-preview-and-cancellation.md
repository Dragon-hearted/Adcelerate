# Cascades preview honestly, cancel cooperatively, and degrade without new failure states

Re-running the active Branch cascades downstream (ADR-0003): each regenerated downstream Branch is a provider call, so a deep graph means real money and minutes. The design needs a cost guard, a cancel path, and partial-failure semantics — without fabricating numbers or inflating the Step state machine.

**Grounding (Explore, 2026-06-20):** there is **no way to compute a pre-cascade dollar figure**. image-engine has no price table or per-call/per-model cost constant; the budget guard (ADR-0007) only snapshots a WisGate account balance at startup and computes `spent = topUp − remaining`, 402 at zero (`budget-guard.ts:20-56`); and **no provider surfaces cost** — WisGate/OpenAI return token counts only, Higgsfield reports nothing (`higgsfield-provider.ts:474`). A "~$X" preview would be exactly the fabricated number ADR-0009 forbids for progress.

**Decision (four parts):**

1. **Async, never blocking.** A cascade is its own Run (ADR-0014); it renders live on the Canvas (`queued`→`running` per node). No blocking modal — the Canvas is the progress view.

2. **Preview + confirm gate, honest and threshold-triggered.** Before dispatch, compute the transitive downstream set of *agent-authored* Branches that will regenerate and show: **node count**, **per-provider/model breakdown** ("4 × gemini-2.5-flash, 2 × Higgsfield"), and a **budget-headroom warning** cross-checked against the budget guard ("Higgsfield account at $X remaining") — **never a predicted cost total**. The gate is threshold-triggered: cascades of **≤ 2 nodes** dispatch silently with an inline "regenerating N…" toast; the confirm modal appears only above the threshold.

3. **Cooperative cancel** (the `cancelled` hook from ADR-0014). Cancel flips a flag; the scheduler stops dispatching **queued** nodes; **in-flight** nodes (≤ `MAX_CONCURRENCY=5`) are allowed to *finish*, because their spend is already committed at the provider — killing a Higgsfield `--wait` subprocess or aborting a WisGate fetch only wastes money already spent and yields no artifact. Cancel means "spend no more"; on a deep graph the unspent cost is the queued tail. The Run terminates `cancelled`.

4. **Partial failure — no new emitted state.** A node that 402s/times out renders `failed` (ADR-0009, the single failure source). Its downstream subtree never dispatches and stays `queued`; the Canvas renders "blocked: upstream failed" as a **derived view state** (node is `queued` ∧ an upstream is `failed`), not a new lifecycle event — keeping ADR-0009's state machine minimal. The Run ends `completed-with-failures` (ADR-0014). Retrying the failed node re-cascades **only its subtree**.

**Considered and rejected:**
- **A dollar-cost preview ("~$2.47")** — uncomputable from available data; would fabricate a number, violating ADR-0009's honesty principle.
- **Always-on confirm modal** — friction on the common small cascade; the ≤2 threshold reserves the gate for the expensive case.
- **Hard-kill in-flight gens on cancel** — wastes already-committed spend and produces no artifact; cooperative drain is strictly better.
- **A `blocked`/`skipped` emitted Step state** — redundant; "blocked" is derivable from graph state, and adding it would split failure semantics that ADR-0009 deliberately unified.

**Consequence:** the cascade scheduler must (a) compute the transitive agent-authored downstream set up front for the preview, (b) honor a cooperative cancel flag between dispatches, and (c) stop descending past a `failed` node. The Canvas renderer gains one derived state ("blocked: upstream failed") computed from node + upstream status, emitting nothing new.
