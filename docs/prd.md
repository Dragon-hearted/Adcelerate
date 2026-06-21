# PRD — Adcelerate Console (Canvas + Command Center)

**Status:** Design complete; ready for build (Milestone 1 = image-engine).
**Date:** 2026-06-21
**Author:** Synthesised from grilling sessions 1–6.

**Authoritative sources (this PRD references, never restates):**
- **Glossary / domain model:** [`CONTEXT.md`](../CONTEXT.md) — the 24 canonical terms. This PRD uses them verbatim. Each term's `_Avoid_` set is binding.
- **Decision record:** [`docs/adr/0001`–`0025`](./adr/) — every "why" lives here; cited inline as `[ADR-NNNN]`.
- **Release/distribution checklist:** [`docs/release-prep.md`](./release-prep.md).

This document is **decision-level**, not implementation-level — it matches `CONTEXT.md`'s implementation-free register. Schema, endpoints, and code anchors live in the ADRs.

---

## 1. Problem & Goals

Adcelerate is a monorepo of independent AI creative systems (image-engine, scene-board, post-board, and more). Today each one runs from its own CLI or skill and **produces an artifact, not a visible process**. When a generation is wrong, the operator has no place to *see* the steps that produced it, *grab* the one they dislike, and *re-run from there* — and no live view of what the agents driving these systems are actually doing, spending, or spawning.

Two original ideas — a ComfyUI/Flora-style **image canvas** and a richer **command center** for agent telemetry — turned out to be the **same instinct**: *see the step-by-step process of a Run, and intervene in it.* Image Flows are `Stage → Op`; agent Runs are `Agent → Sub-agent → Tool-call`. Same shape. So this is **one product** — the **Console** [ADR-0001] — with two zones over one **Substrate**.

### Goals
1. Make every creative **Flow** render its execution as a live **Step Graph** the operator can watch land step-by-step.
2. Let the operator **edit any Step** and re-run from it, keeping every prior version (immutable **Branch** + **Lineage**) [ADR-0003].
3. Give the operator one live view of agent activity — tool calls, token metrics, runtime, what's spawned (**Spawn Tree**) — without leaving the Console [ADR-0001].
4. Make a saved workspace (**Board**) durable and portable, independent of whether a producing system is still running [ADR-0010, ADR-0011].
5. Ship open-source as a clone-and-run, bring-your-own-client-data template [ADR-0013].

### Non-goals
- **Not** a system-*building* tool. System authoring stays in the CLI (Claude Code); the Console exists to *run* generation Flows [ADR-0001].
- **Not** a from-scratch node editor. The operator never wires a graph by hand — Flows emit their own graphs; the operator inspects, edits, and re-runs.
- **Not** a re-implementation of any Flow. Both modes invoke the existing skills; they never reimplement flow logic [ADR-0002].

---

## 2. Persona — the single operator

One persona: **the operator** — a creative running Flows for clients. They are simultaneously the author of the output and the supervisor of the machinery producing it. The product is built for *one* such operator per install; there is no multi-tenant or role model. This singular persona is why the two zones live in one window [ADR-0001].

---

## 3. The Console — two zones, one Substrate

The **Console** is the single operator surface [ADR-0001]:

- **Left zone** — chat with the **Orchestration Agent**, Run history, a lightweight agent-activity summary, and a prompt box with model/param controls. The dense telemetry (**Spawn Tree**: per-agent tokens, tool calls, runtime, spawn hierarchy) is an **expandable panel inside this zone** — not a separate screen.
- **Right zone** — the **Canvas**: where a Run's **Step Graph** renders and generations land one-by-one as they execute.

Both zones read one **Substrate**. The Canvas is rendered with **React Flow** (`@xyflow/react`) for the graph plumbing; the Spawn Tree is deliberately a plain nested/collapsible component, *not* React Flow [ADR-0004].

---

## 4. Core concepts

These are defined canonically in [`CONTEXT.md`](../CONTEXT.md); summarised here only to orient. **Use the glossary terms verbatim — do not introduce synonyms.**

| Term | One-line role |
|---|---|
| **Flow** | One end-to-end creative process exposed by a system, driven by a skill. |
| **Run** | A single invocation of a Flow; emits Steps; bracketed by an explicit **Run lifecycle**. |
| **Step** | A hierarchical, inspectable unit of work (`Stage` ⊃ `Op`) with a stable identity and an observable **Step lifecycle**. |
| **Step Graph** | The DAG of Steps a Run produces, rendered on the Canvas. |
| **Branch** / **Lineage** | An immutable fork of a Step's output (with provenance) / the tree of all Branches. |
| **Stale** / **Orphaned** | A Branch whose upstream changed / a Step whose slot was dropped on re-plan — both *preserved + flagged, never deleted*. |
| **Board** | The unit of persistence — a named workspace referencing ≥1 Run and owning layout + user-authored material. |
| **Reference Group** | A user-authored bundle of image refs fed to a Run as structured input. |
| **Console** / **Canvas** | The operator surface (two zones) / its right-zone graph view. |
| **Reflect** / **Drive** | Canvas reads externally-launched Runs / Console launches the Flow itself. |
| **Approval Gate** | The durable control-plane checkpoint where a Drive Run pauses for operator consent. |
| **Slot Identity** | How a Step stays stable and collision-free across Reflect and Drive. |
| **Substrate** / **Emitter** | The shared spine (event log + artifact store) / the per-system helper that POSTs Step events to it. |
| **Artifact** | The Substrate's durable, addressable copy of a Step's byte output. |
| **Orchestration Agent** | The persistent Claude Agent SDK session behind the left zone that dispatches Flows by invoking skills. |
| **Reference data** | Cold, human-authored, curated files (briefs, prompt libraries) — distinct from hot operational data in the Substrate. |

---

## 5. User flows

### 5.1 Reflect (the starting mode)
1. Operator runs a Flow the usual way (CLI / skill). The Flow's **Emitter** brackets it with `run.started … run.completed(status)` [ADR-0014] and emits Steps at its natural unit of work [ADR-0008].
2. The Run appears in Console history on `run.started`, **born Board-less** [ADR-0025]. Steps land live on the Canvas as a Step Graph, each rendering its **Step lifecycle** (`queued → running → succeeded|failed`, with a client-side elapsed timer — never a fabricated progress bar) [ADR-0009].
3. Operator picks a Step they dislike, edits its prompt/params (or supplies a replacement artifact), and re-runs. This creates an immutable **Branch**; the cascade re-runs downstream into it [ADR-0003].
4. Operator saves the workspace as a **Board** via "open into Board" — the sole attachment path for a loose Run [ADR-0010, ADR-0025].

### 5.2 Drive (later mode)
1. Operator instructs the **Orchestration Agent** in the left zone. It dispatches the Flow by invoking `adcelerate-execute` → the matched system's skill — never reimplementing it [ADR-0002].
2. When the agent reaches a spend-incurring or irreversible action, it pauses at the **Approval Gate** — actioned **only in left-zone chat**; affected Canvas nodes show a non-interactive "⏸ awaiting approval" overlay that deep-links to the chat prompt [ADR-0024].
3. On approve, the gated Step is *born* (`queued`) and dispatches; on reject, it is never dispatched (nothing to roll back). The trip and its resolution are durable control-plane events [ADR-0024].

---

## 6. Execution & data model

**Guiding principle:** the **Substrate owns the durable record; systems are transient producers** [ADR-0011].

- **Step identity** is a stable **semantic step-key** declared by the source (`<run>:<stage>`), reused verbatim on re-run so Branches stack onto one node; `tool_use_id` is demoted to intra-Stage telemetry [ADR-0006]. Identity survives re-planning via a carried-forward **slot id** (`sceneId`), never content-derived; a re-plan is a keep/edit/add/remove **diff**, and a dropped slot becomes **Orphaned** [ADR-0018].
- **Emitter grain** is per-system: a Step is the system's *natural* unit of work, edges come from the system's *own declared dependencies* — no uniform shape is imposed [ADR-0008].
- **Step lifecycle** is emitted as a state machine (≥2 events: `running`, optional `retrying`, terminal `succeeded`/`failed`), not a single terminal event — this is what makes the Canvas live [ADR-0009].
- **Run lifecycle** is explicit and **never inferred** — `run.completed(status)` with a non-binary status (`completed` / `completed-with-failures` / `failed` / `cancelled`). This is the only honest completion signal for Reflect-mode CLI Runs. **Run-done ≠ Board-done** [ADR-0014].
- **Ingest is idempotent and order-tolerant by construction:** at-least-once delivery; dedupe keyed on `(branch-id, lifecycle-state, retry-attempt)`; a monotonic per-branch fold (state never regresses); edges from declared deps not arrival; dropped terminals reconciled by Run lifecycle into a derived "outcome unknown" view. Correctness rests on dedupe + fold + reconcile, *not* on sequence numbers [ADR-0019].
- **Artifacts** are snapshotted into the Substrate's own store eagerly on ingest (keyed by Step/Branch id); a Board always references the Substrate-owned URL, never the producer's rot-prone local URL [ADR-0011].

---

## 7. Editing model

- **Immutability:** editing or re-running a Step never mutates in place; it creates an immutable **Branch**. Originals and siblings are preserved [ADR-0003].
- **Provenance:** every Branch is *agent-generated* or *human-authored*. Exactly one Branch per Step is **active**; the Flow resumes from it [ADR-0003].
- **The active pointer is event-sourced and human-sticky** — not a mutable cell. An agent cascade auto-activation never overrides a human selection made at-or-after the cascade trigger [ADR-0015]. This admits the **Console as a control-plane producer** alongside data-plane Emitters — two producer classes, one ordered log.
- **Provenance-aware cascade:** a downstream *agent* Branch auto-regenerates; a downstream *human* Branch is left untouched and marked **Stale** — human work is never silently overwritten [ADR-0003].
- **Cascades degrade honestly:** a cascade is its own async Run, rendered live; it shows a confirm gate **above 2 nodes** (node count + per-provider/model breakdown + budget-headroom warning — **never a predicted dollar figure**, which is uncomputable), **cancels cooperatively** (queued tail dropped, in-flight finishes), and renders a blocked subtree as a *derived* "blocked: upstream failed" view — no new emitted state [ADR-0016].
- **Persistence:** Branch/Lineage lives in a dedicated `branches` projection table beside the append-only event log — write-once facts plus the mutable `active`/`stale` pointers [ADR-0005].

---

## 8. Reference Groups & Reference data

- A **Reference Group** is a first-class Substrate object: a user-authored bundle of image refs fed to a Run as **structured input** (separate refs by default; a flatten toggle for whole-vibe transfer).
- **Overflow is a deterministic local montage (`sharp`), never a provider call** — pinned refs stay sharp and fill slots first; the overflow tail tiles into the last slot; no ref is discarded [ADR-0017].
- The reference **cap is a descriptor**, not a constant — `capFor(provider, model, modality)` (default Higgsfield ≈ `{total:8}`, WisGate ≈ `{total:14, byCategory:{objects:6, humans:5}}`); partial-flatten triggers only when the *resolved* cap is exceeded [ADR-0017].
- **Reference data** (brand briefs, prompt libraries, client dossiers) is the cold, curated half of storage — a plain on-disk markdown/JSON tree, already an Obsidian-openable vault. Obsidian is an **optional viewer**, never a runtime dependency or system-of-record; `brand.json` stays canonical [ADR-0012].

---

## 9. Cost & guards

- There is **no way to compute a pre-run dollar figure** — no price table exists and providers don't surface cost (WisGate/OpenAI return tokens only; Higgsfield nothing). Every cost surface shows node count + per-provider/model breakdown + budget-headroom, never a fabricated total [ADR-0016].
- The **budget guard is provider-scoped**: a provider's balance check runs only when that provider serves the request — the WisGate balance check no longer 402s Higgsfield generations. Each future provider carries its own check; there is never a global cross-provider gate. Higgsfield has no balance API, so it gets no pre-flight guard (its own out-of-credits error surfaces normally) [ADR-0007].

---

## 10. Modes & orchestration

- **Drive loads skills via the SDK `skills` option** while keeping `settingSources: []`, so the `canUseTool` approval gate can never be bypassed by loaded permissions [ADR-0002].
- The **Approval Gate** is a **durable control-plane checkpoint, not a Step/Run state**. One action surface (left-zone chat); trips on **effect class** (reads auto-allow; spend gates on cascade > 2 nodes *or* a budget line; external/irreversible always gate); no timeout; Run stays plain `running`; survives reload and reconnect re-arms it [ADR-0024].
- **Slot Identity** keeps Reflect and Drive collision-free: emit-time identity is `(runId, step-key)` (two Runs' `s1` can never silently fuse). Desired cross-Run Branch-stacking happens one layer up in the **Board projection**, keyed on `(producerSystem, slot-id)` — automatic but visible, gated by explicit Board co-membership. A soft **Execution Lease** (derived from Step lifecycle) makes a Drive into a busy slot block at the Approval Gate rather than double-dispatch [ADR-0025].

---

## 11. Distribution & versioning

- The 8 creative systems **stay independently-versioned public git submodules**; init is **lazy** via the Execute-Mode routing pre-flight (`git submodule update --init` on first use) [ADR-0021].
- Updates **propagate by SHA-pin** in the parent repo. The Console surfaces a **two-tier freshness signal in the left zone (never the Canvas)**: soft "update available" (non-blocking) and hard "too old — update required" (gated at pre-flight, with ingest 4xx as backstop) [ADR-0022].
- Every Emitter event carries a versioned **`envelopeVersion`** (SemVer). Because the Emitter is *copied* into each isolated submodule (submodules can't import the workspace), copies drift — and once public/SHA-pinned, that drift is a public contract. Ingest validates against a versioned zod schema, **upcasts** known-old versions within a compat window, and **rejects unknown versions loudly (4xx)** — deliberately distinct from the silent dedupe of ingest. Copies stay in sync via a local sha256 recipe (`just emitter-sync`), not CI [ADR-0020].

---

## 12. Open-source posture

Adcelerate ships open-source as a **single clone-and-run repo with bring-your-own-client-data** [ADR-0013]:
- Client data never ships (`client/{slug}/` stays git-ignored, backed up out-of-band).
- Secrets stay env-only via `.env.sample`.
- The Substrate is per-install local (SQLite + local artifact store); nothing phones home.
- On-ramp = an example client + Obsidian vault template.
- A 2026-06-20 audit confirmed history is already clean (no `git-filter-repo` scrub needed). The pre-publish checklist lives in [`release-prep.md`](./release-prep.md).

---

## 13. v1 scope

**In v1:** the full Console loop proven on **image-engine** (Milestone 1) [ADR-0008] — live Step Graph, immutable Branch/Lineage editing, provenance-aware cascade, Board persistence with snapshotted Artifacts, Reference Groups with deterministic montage, the Approval Gate, and the versioned-envelope ingest. The identity/schema model is **many-Runs-per-board from day one** [ADR-0010, ADR-0025].

**Deliberately cut / carried-but-not-enforced in v1** (all per their ADRs):
- **One-Run-per-board is the default** — cross-Run Branch-stacking and Execution-Lease contention are rarely exercised, though the schema supports them [ADR-0010, ADR-0025].
- **Typed reference sub-caps** (objects/humans) are carried in the descriptor but **not enforced** — v1 montage is category-blind, triggering on `total` only [ADR-0017].
- **True aesthetic "vibe-fusion"** of overflow is deferred — v1 uses the `sharp` montage for both overflow and the flatten toggle [ADR-0017].
- **Approval-gate thresholds are fixed named constants — no operator settings UI** [ADR-0024].
- **A local spend counter for the Higgsfield path is deferred**; Higgsfield gets no pre-flight balance guard [ADR-0007].
- **Per-submodule Emitter contract test is deferred**; copy-sync is a local recipe + git hook, no root CI [ADR-0020].
- **Producer-stamped per-Run seq powers only future gap-detection** — v1 correctness does not depend on it [ADR-0019].
- **Flows that don't emit a stable step-key are not branchable** — they render as a flat event timeline until they adopt the step-key contract [ADR-0006, ADR-0018].
- **scrape-engine extraction is pending** — still in-tree, not yet a submodule [ADR-0021].

---

## 14. Open items (acknowledged, not all resolved)

These are tracked in [`release-prep.md`](./release-prep.md); the PRD acknowledges them:
- **ADR-0013 doc tail (docs, not decisions):** an example `.obsidian/` vault template + example client; a setup-doc rewrite for the clone-light / lazy-init path; a `docs/index.md` cross-link to the ADR log + glossary (the index is currently stale — it still describes the deprecated observability dashboard).
- **prompt-writer dangling refs:** 3 footnotes in the `systems/prompt-writer` submodule still point to the now-deleted `ai_docs/wisgate-nanobanana-api.md`; re-source into its own `knowledge/` before the next submodule push.
- **`client/` decision (🔲):** ~1.2 GB, gitignored, never committed — keep-local (recommended) vs separate private repo. The BYO-client-data posture holds regardless [ADR-0013].

---

## Appendix A — ADR → section map

- **Surface & interaction:** 0001 Console (two zones) · 0004 React Flow Canvas · 0010 Board persistence · 0012 Reference-data vault.
- **Execution model:** 0006 stable step identity · 0008 Emitter grain · 0009 step-lifecycle events · 0014 explicit Run lifecycle · 0019 idempotent ingest · 0011 artifact snapshot.
- **Editing & branching:** 0003 immutable Branch/cascade · 0005 Branch projection table · 0015 active-Branch event-sourced · 0016 cascade preview/cancel · 0017 reference overflow montage · 0018 re-plan stability.
- **Modes & orchestration:** 0002 Drive via skill-loading · 0024 Approval Gate · 0025 Reflect/Drive slot identity.
- **Cost/guards:** 0007 provider-scoped budget guard.
- **Distribution/versioning:** 0021 lazy-init submodules · 0022 SHA-pin freshness · 0020 Emitter envelope versioning.
- **Open-source posture:** 0013 BYO-client-data.

## Appendix B — repo / dev-environment note

[ADR-0023] (rm-guard re-keyed to target reachability, not the `-rf` flag) is a dev-tooling/security-hook decision, not a product decision — recorded here only for completeness. It does not affect the Console's behaviour.
