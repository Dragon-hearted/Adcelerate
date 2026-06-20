# Ingest is idempotent and order-tolerant by construction, not by sequence trust

Step + Run + artifact events travel from a system's Emitter to the Substrate over an HTTP ingest path and on to the Console over Socket.IO. Events can duplicate (retried POST), arrive out of order (5 concurrent gens, `MAX_CONCURRENCY=5`; late retries), or drop (failed POST). Any of these could corrupt the Step Graph if the projection trusts arrival order.

**Grounding (Explore, 2026-06-20):**
- A real per-session **monotonic `seq`** exists on the `events` table, **server-assigned by the EventBus** at persist time (`event-bus.ts:140-153`), replayed `ORDER BY seq asc` (`sessions.ts:77`). **Persist-then-broadcast** is already the discipline (`event-bus.ts:169-191`).
- The frontend dedupes by `(session_id, seq)` + binary-inserts by timestamp (`useStore.ts:64-100`), 1000-event ring buffer.
- `token_events` dedupes by `(transcript_file, inode, offset)` via `INSERT OR IGNORE` (`store.ts:47-72`) — a *file-location* dedupe; the reusable part is the `INSERT OR IGNORE`-on-unique-index *mechanism*, not the key.
- **No HTTP ingest endpoint exists**: `send_event.py` POSTs `:4000/events`; the orchestrator is on **:4100** with no receiver — net-new path *and* a port mismatch to fix. No artifact store, no server-side monotonic fold (frontend only timestamp-sorts).

**Decision:**

1. **At-least-once delivery + idempotent ingest.** The Emitter retries failed POSTs; ingest dedupes via `INSERT OR IGNORE` on a unique index — the `token_events` mechanism, on a domain key.

2. **Dedupe key = `(branch-id, lifecycle-state, retry-attempt)`**, *not* `(step-key, state)`. A re-run fires `running`→`succeeded` again on the same step-key; deduping by step-key would swallow the re-run. Branch-id distinguishes re-runs (ADR-0003/0005); `retry-attempt` distinguishes `retrying 2/3` from `3/3`.

3. **Monotonic per-branch fold by lifecycle rank** — state never regresses; a late `running` after `succeeded` is ignored. The state machine *is* the order, so within-Step reordering is harmless without a sequence number.

4. **Graph edges come from declared dependencies (ADR-0008), never arrival order** — reordered events cannot corrupt graph topology, only (harmlessly, per ADR-0016) per-node state.

5. **Drop handling.** Dropped non-terminal (`running`) self-heals when `succeeded` lands. Dropped terminal (`succeeded`/`failed`) — the dangerous case — is reconciled by the **Run lifecycle** (ADR-0014): on `run.completed`, any still-non-terminal Step renders a **derived "outcome unknown"** view (not a new emitted state — the derived-state pattern of ADR-0016) with a re-fetch affordance.

6. **Persist-then-broadcast retained**: ingest validates → dedupes → persists with the server seq → *then* broadcasts. The transport never carries a non-durable event; reconnect/replay is authoritative.

7. **Two seqs, clear roles.** Keep the server per-session seq for feed/replay *delivery* order; add a producer-stamped per-Run seq in the payload for *causal* replay + future gap-detection. **Correctness rests on dedupe-key + monotonic fold + run-completion reconciliation — not on either seq.** A missing producer seq degrades gap-detection, not correctness. (Rejected the stricter alternative — reject-on-out-of-producer-seq — as brittle against drops.)

8. **Artifact snapshot (ADR-0011) is an idempotent ingest side-effect** — triggered by `succeeded`'s artifact URL, keyed by branch-id; re-delivery does not re-fetch. Net-new `./artifacts/` store + table.

**Considered and rejected:**
- **Dedupe by `(step-key, state)`** — swallows legitimate re-runs.
- **Trust arrival order / server seq for correctness** — captures arrival, not causal order, under concurrency; corrupts on reorder.
- **Producer-seq as correctness-load-bearing (reject out-of-order)** — brittle: a single drop wedges the stream.

**Consequence:** net-new `POST /events` ingest on :4100 (fix the `send_event.py` :4000→:4100 mismatch); a unique index on `(branch-id, lifecycle-state, retry-attempt)` with `INSERT OR IGNORE`; a per-branch monotonic-rank fold in the projection; a net-new artifact store keyed by branch-id; the frontend fold extended from timestamp-sort to branch-lifecycle-rank. The Console's "outcome unknown" and "blocked: upstream failed" are both *derived* states, emitting nothing new.
