# Step identity is a stable semantic step-key declared at the source

Branch/Lineage (ADR-0003) and its `branches.step_id` FK (ADR-0005) require every Step to have an identity that is **stable across re-runs** — a Step is a *logical slot* ("the hero shot"), and each re-run produces another Branch *of that same slot*. The available execution identifier, `tool_use_id`, is the wrong thing: the SDK mints a fresh `tool_use_id` for every tool call, so a `[M]odify`/regenerate would look like a brand-new Step and the Branches would never stack onto one node — the Lineage falls apart.

We define **Step identity as a stable semantic step-key declared by the emitting source**: every Stage carries a logical id like `<run>:<stage>` (e.g. `run42:hero-sheet`), minted by the skill/Emitter and **reused verbatim on re-run**. `tool_use_id` remains a transient execution detail used only for telemetry *inside* a Stage. Op-level branching, when wanted, uses a semantic sub-key (`run42:hero-sheet:beat-3`) the same way. This maps directly onto scene-board's per-Stage `[A]/[M]/[R]` gates, where `[M]` == "re-run the same Stage" == Branch-without-cascade.

**Considered and rejected:**
- **Step ID = `tool_use_id`** — dies on re-run (fresh id each execution); cannot anchor a Step's Branches.
- **Orchestrator infers identity at ingest** (heuristically match a re-run to its prior Step by stage name/position/similarity) — fragile magic; the source already knows its own identity, so re-inferring it server-side adds failure modes for no gain.

**Consequence:** A small **contract is pushed into the Emitter**: any flow that wants branchable Steps must emit a stable step-key, not fire-and-forget events. That is the price of branchable Steps, and it keeps the `branches.step_id` FK meaningful. `tool_use_id` is demoted to intra-Stage telemetry. Flows that never emit step-keys still render as a flat event timeline — they simply aren't branchable until they adopt the contract.
