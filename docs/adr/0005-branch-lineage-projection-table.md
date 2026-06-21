# Persist Branch/Lineage as a projection table beside the event log

The orchestrator is event-sourced: `events` is an append-only log keyed by `session_id` + a monotonic `seq`, never edited, and it powers the live timeline and replay. Branch/Lineage (ADR-0003) introduces state that splits cleanly in two: **immutable facts** — a Branch's contents, its `provenance` (agent|human), its place in the Lineage tree — and **mutable pointers** — which Branch is `active`, and which are `stale`. The mutable pointers flip as the operator switches Branches and as the Stale cascade fires. A flipping pointer cannot live in a never-edit log.

We add a dedicated **`branches` table** (a projection / read-model over the event stream):
- **Write-once columns** (never updated): `branch_id` (PK), `step_id` (FK to the Step it forks — see open dependency below), `parent_branch_id` (Lineage tree structure; null for root), `provenance`, the output payload/ref, `created_at`.
- **Mutable columns** (the only updatable fields): `active`, `stale`.
- One active Branch per Step, enforced in app logic (or a unique partial index on `(step_id) WHERE active`).

Branch changes also **emit `branch.created` / `branch.activated` / `branch.staled` events** onto the existing log and Socket.IO transport — so the Canvas updates live through the pipe that already exists, and the lineage history stays auditable. SQLite + drizzle-kit migration.

**Considered and rejected:**
- **Pure event-sourcing (fold the log to derive active/stale)** — philosophically clean and gives full history, but every Canvas render would fold the event stream to answer "what's active?", forcing a materialized cache anyway — i.e. this decision with extra steps and worse read latency.
- **Columns on `events`** (`active`/`stale`/`provenance` on event rows) — would make the append-only log mutable (active/stale flip in place), corrupting the very immutability the timeline and replay rely on, and conflates "an event happened" with "a Branch exists." Wrong layer.

**Consequence:** Two stores to keep in sync (the immutable log + the `branches` projection) — a standard, well-understood event-sourcing pattern. Reads become a simple indexed `WHERE step_id = ? ORDER BY …` instead of a fold. **Open dependency:** the `branches.step_id` FK requires a *stable Step identity*, which does not exist yet — Steps are derived from `tool_use_id` for SDK tool calls, while scene-board's semantic Stages arrive via the Emitter with no `tool_use_id`. That identity is the next decision to resolve.
