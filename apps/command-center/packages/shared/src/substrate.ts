// ─────────────────────────────────────────────────────────────────────────────
// Substrate — the producer-agnostic Run / Step contract + the Step-Graph fold.
//
// A *Run* is one unit of work reported by an external producer system (e.g. an
// image-engine batch). It streams a minimal lifecycle through the copied Emitter
// (ADR-0008) to the orchestrator's POST /api/ingest:
//
//   run.started → step(queued → running → succeeded|failed) → run.completed(status)
//
// Every envelope carries a SemVer `envelopeVersion`. The orchestrator's CURRENT
// version is `1.1.0`; the supported compat window is `[1.0.0, 2.0.0)` (ADR-0020).
// Older-in-window envelopes are carried to current shape by a small upcaster
// chain at ingest; out-of-window versions are rejected loudly (4xx). The
// Substrate folds the ordered event log into a Step Graph on the READ side.
//
// `stepKey` convention: `<runId>:<stage>` (ADR-0006). The `stage` segment names the
// pipeline stage; the runId prefix scopes it to one Run.
//
// All timestamps are epoch milliseconds (matches the CCEvent log).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { CCEvent } from './events';
// Type-only (erased at runtime → no circular dep with ws-contract, which imports
// the projection types from here). #42 returns the preview shape minus the bits
// the route fills in (runId + budgetHeadroom from the trip cache).
import type { CascadePreview, CascadeTarget } from './ws-contract';

// The orchestrator's CURRENT envelope version. Producers may lag within the
// supported window below; older-in-window envelopes are upcast at ingest.
export const CURRENT_ENVELOPE_VERSION = '1.1.0' as const;

// Back-compat alias — slice #31 referenced ENVELOPE_VERSION; it now tracks current.
export const ENVELOPE_VERSION = CURRENT_ENVELOPE_VERSION;

// Supported compat window: [1.0.0, 2.0.0). Older-in-window → upcast to current;
// outside → loud 4xx reject (ADR-0020). Human-readable form for the reject signal.
export const SUPPORTED_ENVELOPE_RANGE = '>=1.0.0 <2.0.0' as const;

// ── lifecycle vocabularies ───────────────────────────────────────────────────

export const RUN_STATUSES = [
  'completed',
  'completed-with-failures',
  'failed',
  'cancelled',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const STEP_STATES = [
  'queued',
  'running',
  'retrying',
  'succeeded',
  'failed',
] as const;
export type StepState = (typeof STEP_STATES)[number];

// ── lifecycle ordering (#32) ─────────────────────────────────────────────────
// A total order over Step states drives the MONOTONIC fold: the highest-rank
// event seen for a branch wins, so out-of-order arrival converges. Terminals
// (succeeded/failed) outrank progress (running/retrying) outrank queued.
//   queued(0) → running(1) = retrying(1) → succeeded(2) = failed(2)
const STATE_RANK: Record<StepState, number> = {
  queued: 0,
  running: 1,
  retrying: 1,
  succeeded: 2,
  failed: 2,
};
/** Lifecycle rank: terminal(2) > progress(1) > queued(0). */
export function stateRank(state: StepState): number {
  return STATE_RANK[state];
}
const TERMINAL_RANK = 2;

// Strict tiebreak WITHIN an equal (rank, retryAttempt) — keeps the fold a total
// order so it stays order-independent. `retrying` beats `running` (more recent
// lifecycle); `failed` beats `succeeded` (surface failure conservatively).
const STATE_TIEBREAK: Record<StepState, number> = {
  queued: 0,
  running: 1,
  retrying: 2,
  succeeded: 3,
  failed: 4,
};

// ── artifact ─────────────────────────────────────────────────────────────────
// A produced output reference. Snapshot-on-ingest is deferred (#32) — for now the
// envelope just carries the URL + mime so the Canvas can preview it live.
export const artifactSchema = z.object({
  url: z.string(),
  mimeType: z.string(),
});
export type Artifact = z.infer<typeof artifactSchema>;

// ── envelopes ────────────────────────────────────────────────────────────────
// `kind` is the discriminant. The validated schema pins `envelopeVersion` to the
// CURRENT version — older-in-window envelopes are upcast to current BEFORE they
// reach this schema (see `upcastEnvelope`).

const envelopeVersion = z.literal(CURRENT_ENVELOPE_VERSION);

export const runStartedSchema = z.object({
  envelopeVersion,
  kind: z.literal('run.started'),
  runId: z.string().min(1),
  producerSystem: z.string().min(1),
  startedAt: z.number(),
  // Added in 1.1: the producer's own version string (e.g. the system's git SHA
  // or semver), so the freshness signal (ADR-0022 / #40) can flag a stale copy.
  // Optional on the wire; the 1.0→1.1 upcaster defaults it to "unknown".
  producerVersion: z.string().optional(),
  // #36: a producer-declared Slot Identity for cross-Run Board merge. Additive
  // optional — NO envelope-version bump (same pattern as `producerVersion`;
  // absence is well-defined → open-into-Board falls back to runId).
  // ponytail: producer-declared slotId wire-supported; the Emitter emits it when
  // a producer needs the natural-unit grain (likely #37). v1 assigns it via the
  // open-into-Board param instead, so the byte-identical Emitter pair is untouched.
  slotId: z.string().min(1).optional(),
});
export type RunStarted = z.infer<typeof runStartedSchema>;

export const runCompletedSchema = z.object({
  envelopeVersion,
  kind: z.literal('run.completed'),
  runId: z.string().min(1),
  status: z.enum(RUN_STATUSES),
  completedAt: z.number(),
});
export type RunCompleted = z.infer<typeof runCompletedSchema>;

export const stepEventSchema = z.object({
  envelopeVersion,
  kind: z.literal('step'),
  runId: z.string().min(1),
  stepKey: z.string().min(1),
  state: z.enum(STEP_STATES),
  artifact: artifactSchema.optional(),
  // Added in #32: which retry attempt this lifecycle event belongs to. Default 0
  // (first attempt). Part of the dedupe identity so a retried event (same state,
  // new attempt) is NOT mistaken for a duplicate. Optional on the wire.
  retryAttempt: z.number().int().nonnegative().optional(),
  // Added in #34 (ADR-0008): the producer-declared upstream stepKeys this Step
  // depends on. The fold draws dependency edges from THIS, not emission order.
  // Additive optional → NO envelope-version bump (same pattern as producerVersion
  // / slotId). Absent or empty = a Step with no declared deps (→ no inbound edges).
  deps: z.array(z.string().min(1)).optional(),
});
export type StepEvent = z.infer<typeof stepEventSchema>;

export const ingestEnvelopeSchema = z.discriminatedUnion('kind', [
  runStartedSchema,
  runCompletedSchema,
  stepEventSchema,
]);
export type IngestEnvelope = z.infer<typeof ingestEnvelopeSchema>;

// ── envelope versioning: window + upcaster registry ──────────────────────────
// One ordered window + a tiny from-version-keyed upcaster chain (ADR-0020).
// Not a plugin framework: the only real edge today is 1.0 → 1.1, which exists
// because the live image-engine Emitter still stamps "1.0" and the orchestrator
// has advanced to 1.1.0 — so 1.0 envelopes are the live upcast fixture.

type RawEnvelope = Record<string, unknown>;

/** Parse a lenient SemVer (`major.minor[.patch]`, e.g. "1.0" or "1.1.0"). */
function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3] ?? 0) };
}

const CURRENT_SEMVER = parseSemver(CURRENT_ENVELOPE_VERSION)!;

/** In supported window `[1.0.0, 2.0.0)` — i.e. major === 1. */
export function isVersionInWindow(version: string): boolean {
  const s = parseSemver(version);
  return s !== null && s.major === 1;
}

/** `major.minor` key for the upcaster registry (patch drift folds onto its minor). */
function minorKey(s: { major: number; minor: number }): string {
  return `${s.major}.${s.minor}`;
}

const CURRENT_MINOR_KEY = minorKey(CURRENT_SEMVER);

/** 1.0 → 1.1: stamp current version, default the new optional `producerVersion`. */
function upcastTo_1_1(raw: RawEnvelope): RawEnvelope {
  const next: RawEnvelope = { ...raw, envelopeVersion: CURRENT_ENVELOPE_VERSION };
  if (next.kind === 'run.started' && next.producerVersion === undefined) {
    next.producerVersion = 'unknown';
  }
  return next;
}

// Keyed by the from-`major.minor`. Each entry advances one step toward current.
const UPCASTERS: Record<string, (raw: RawEnvelope) => RawEnvelope> = {
  '1.0': upcastTo_1_1,
};

export interface UpcastAccepted {
  ok: true;
  /**
   * Version-normalized (current-shape) envelope. Still passed through the
   * existing `ingestEnvelopeSchema` validate at the caller — this gate only
   * decides the VERSION class, not structural validity.
   */
  envelope: IngestEnvelope;
  /** True when an upcaster ran (older-in-window); false when already current. */
  upcasted: boolean;
}
export interface UpcastRejected {
  ok: false;
  outOfWindow: true;
  /**
   * `out-of-window` — a parseable but unsupported SemVer (too old/new); surfaces
   * as the loud 4xx + incompatibility signal. `unparseable` — no/garbage version;
   * just a malformed body, left to the caller's existing structural 400.
   */
  reason: 'out-of-window' | 'unparseable';
  /** The offending version exactly as it arrived (for the incompatibility signal). */
  gotVersion: string;
}
export type UpcastResult = UpcastAccepted | UpcastRejected;

/**
 * Version-gate the raw ingest body BEFORE the existing structural validate:
 *  - current (already 1.1) → accept as-is,
 *  - older-in-window with an upcaster path (1.0) → run the chain to current,
 *  - out-of-window / unparseable / in-band-but-no-path → reject (caller 4xx).
 *
 * This is purely the VERSION decision. The accepted envelope is re-validated by
 * the caller's `ingestEnvelopeSchema.safeParse`, so a structurally-broken body
 * still yields the existing 400 (distinct from this gate's 4xx version reject).
 */
export function upcastEnvelope(raw: unknown): UpcastResult {
  const body = (raw ?? {}) as RawEnvelope;
  const got = body.envelopeVersion;
  const gotVersion = typeof got === 'string' ? got : String(got);

  const sem = typeof got === 'string' ? parseSemver(got) : null;
  // No/garbage version → not a version problem, just a malformed body. Leave it
  // to the caller's structural validate (400), don't raise an incompatibility.
  if (!sem) {
    return { ok: false, outOfWindow: true, reason: 'unparseable', gotVersion };
  }
  // Parseable but outside [1.0.0, 2.0.0) → a real producer declaring an
  // unsupported version: the loud 4xx + incompatibility alarm.
  if (sem.major !== 1) {
    return { ok: false, outOfWindow: true, reason: 'out-of-window', gotVersion };
  }

  // Walk the upcaster chain from the body's minor toward current.
  let cur: RawEnvelope = body;
  let key = minorKey(sem);
  let upcasted = false;
  let guard = 0;
  while (key !== CURRENT_MINOR_KEY && UPCASTERS[key] && guard++ < 16) {
    cur = UPCASTERS[key]!(cur);
    const s = parseSemver(String(cur.envelopeVersion));
    if (!s) break;
    key = minorKey(s);
    upcasted = true;
  }

  // In-window but no path to current (e.g. an unknown future 1.x minor) → reject
  // loudly rather than silently mis-handle. Never trust, always validate.
  if (key !== CURRENT_MINOR_KEY) {
    return { ok: false, outOfWindow: true, reason: 'out-of-window', gotVersion };
  }

  return { ok: true, envelope: cur as unknown as IngestEnvelope, upcasted };
}

// ── dedupe key ───────────────────────────────────────────────────────────────
// Idempotency is `(branchId, lifecycleState, retryAttempt)` (#32). A retried
// event (same state, new attempt) is therefore NOT collapsed into a duplicate.
// Run lifecycle events have no stepKey, so they fold onto a per-run sentinel and
// use the run state as the lifecycle component (retryAttempt N/A there).
export const RUN_STEP_SENTINEL = '__run__';

/**
 * The ROOT (original, agent-provenance) branch id for a step. The data-plane
 * Emitter knows nothing of forks, so its Step lifecycle events ALL describe this
 * one root branch; `projectBranches` likewise treats the parentless branch as the
 * root. Forks are a control-plane concept — they mint FRESH branch ids that never
 * appear in Emitter traffic. Root === stepKey keeps the dedupe key format stable.
 */
export function rootBranchId(stepKey: string): string {
  return stepKey;
}

/**
 * The branch a Step LIFECYCLE event dedupes under (#32 idempotency grain). #41
 * retires the old `=> stepKey` stub: Emitter step events only ever describe the
 * step's ROOT branch (forks live on the control plane, never emitted), so this is
 * real resolution to `rootBranchId` — dedupe and `projectBranches` agree on it.
 */
export function branchIdOf(stepKey: string): string {
  return rootBranchId(stepKey);
}

export function dedupeKeyOf(env: IngestEnvelope): string {
  if (env.kind === 'run.started') {
    return `${env.runId}::${RUN_STEP_SENTINEL}::started`;
  }
  if (env.kind === 'run.completed') {
    return `${env.runId}::${RUN_STEP_SENTINEL}::${env.status}`;
  }
  return `${branchIdOf(env.stepKey)}::${env.state}::${env.retryAttempt ?? 0}`;
}

/** Derive the `<stage>` segment of a `<runId>:<stage>` stepKey (ADR-0006). */
export function stageOf(runId: string, stepKey: string): string {
  const prefix = `${runId}:`;
  return stepKey.startsWith(prefix) ? stepKey.slice(prefix.length) : stepKey;
}

// ── Step Graph (read-side projection) ────────────────────────────────────────

export interface StepNode {
  runId: string;
  stepKey: string;
  stage: string;
  state: StepState;
  artifact?: Artifact;
  // #32: the branch reached a terminal state without ever emitting a non-terminal
  // (queued/running/retrying) lifecycle event — i.e. a terminal-only Step. Valid
  // Steps carry ≥2 lifecycle events (ADR-0009); the Canvas flags this one. Cleared
  // automatically if an earlier-lifecycle event later arrives (order-tolerant).
  malformed?: boolean;
  // #41: DERIVED overlay flags, stamped by `projectStepGraph`'s optional overlay
  // arg from the branch fold — NOT lifecycle states. `stale` = an upstream Step was
  // edited (downstream via declared `deps`); `orphaned` = a re-plan dropped this
  // Step's slot. The Emitter NEVER emits these — they are absent (= false) on the
  // wire and added read-side. ponytail: overlays-not-lifecycle-states — deliberately
  // kept OFF the STEP_STATES wire enum so the byte-identical Emitter pair is untouched.
  stale?: boolean;
  orphaned?: boolean;
}

export interface StepEdge {
  from: string; // stepKey
  to: string;   // stepKey
}

export interface StepGraph {
  envelopeVersion: typeof ENVELOPE_VERSION;
  runId: string;
  producerSystem?: string;
  status?: RunStatus;
  startedAt?: number;
  completedAt?: number;
  nodes: StepNode[];
  edges: StepEdge[];
}

// The fold's per-branch accumulator. `priority` is the (rank, retryAttempt,
// tiebreak) tuple of the winning event; `artifactPriority` tracks the best
// artifact-bearing event separately so an artifact on a non-winning event is not
// lost. `sawNonTerminal` drives the terminal-only `malformed` flag.
interface BranchAcc {
  node: StepNode;
  priority: readonly [number, number, number];
  artifactPriority: readonly [number, number, number] | null;
  sawNonTerminal: boolean;
  // #34: the UNION of declared upstream stepKeys seen across this branch's step
  // events (order-independent — a Set, so duplicate/out-of-order deps converge).
  deps: Set<string>;
}

function eventPriority(state: StepState, retryAttempt: number): readonly [number, number, number] {
  return [STATE_RANK[state], retryAttempt, STATE_TIEBREAK[state]];
}

/** Lexicographic compare of two (rank, attempt, tiebreak) tuples. a > b ? */
function gt(a: readonly [number, number, number], b: readonly [number, number, number]): boolean {
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
}

/**
 * PURE, ORDER-INDEPENDENT fold: envelopes → StepGraph (#32). Per branch
 * (branchId = stepKey), keep the event with the highest `(rank, retryAttempt,
 * tiebreak)` — a monotonic max-fold — so duplicate, out-of-order, and retried
 * events all converge to the SAME graph regardless of arrival order. Nodes are
 * emitted in deterministic stepKey order (not arrival order) so the projection
 * is byte-stable under a shuffled log. Run lifecycle envelopes set graph metadata.
 *
 * Edges are the producer's DECLARED dependencies (#34, ADR-0008): the union of
 * each Step's `deps` → `{ from: dep, to: stepKey }`, filtered to known nodes and
 * sorted by (from, to). A run with no declared deps has no edges.
 *
 * #41: an OPTIONAL `overlays` arg stamps DERIVED `stale`/`orphaned` flags onto the
 * matching nodes (computed by the control plane from the branch fold + declared
 * deps — see `projectBranches`/`staleDownstream`). Composable: callers that don't
 * care about editing pass nothing and get the unchanged projection.
 */
export function projectStepGraph(
  events: IngestEnvelope[],
  overlays?: { stale?: Iterable<string>; orphaned?: Iterable<string> },
): StepGraph {
  const runId = events[0]?.runId ?? '';
  const graph: StepGraph = {
    envelopeVersion: ENVELOPE_VERSION,
    runId,
    nodes: [],
    edges: [],
  };

  const branches = new Map<string, BranchAcc>();

  for (const env of events) {
    switch (env.kind) {
      case 'run.started':
        graph.producerSystem = env.producerSystem;
        graph.startedAt = env.startedAt;
        break;
      case 'run.completed':
        graph.status = env.status;
        graph.completedAt = env.completedAt;
        break;
      case 'step': {
        const branchId = branchIdOf(env.stepKey);
        const attempt = env.retryAttempt ?? 0;
        const prio = eventPriority(env.state, attempt);
        const isNonTerminal = STATE_RANK[env.state] < TERMINAL_RANK;

        let acc = branches.get(branchId);
        if (!acc) {
          acc = {
            node: {
              runId: env.runId,
              stepKey: env.stepKey,
              stage: stageOf(env.runId, env.stepKey),
              state: env.state,
            },
            priority: prio,
            artifactPriority: null,
            sawNonTerminal: false,
            deps: new Set<string>(),
          };
          branches.set(branchId, acc);
        }

        // Accumulate the declared deps (union across all of this branch's events).
        if (env.deps) for (const d of env.deps) acc.deps.add(d);

        // Monotonic: only a strictly-higher-priority event moves the node state.
        if (gt(prio, acc.priority)) {
          acc.node.state = env.state;
          acc.priority = prio;
        }
        // Best-artifact wins independently — highest-priority event that carries one.
        if (env.artifact && (acc.artifactPriority === null || gt(prio, acc.artifactPriority))) {
          acc.node.artifact = env.artifact;
          acc.artifactPriority = prio;
        }
        if (isNonTerminal) acc.sawNonTerminal = true;
        break;
      }
    }
  }

  // Terminal-only normalization: a branch that reached terminal but never saw a
  // non-terminal lifecycle event is malformed (<2 lifecycle events, ADR-0009).
  for (const acc of branches.values()) {
    if (!acc.sawNonTerminal && STATE_RANK[acc.node.state] === TERMINAL_RANK) {
      acc.node.malformed = true;
    }
  }

  // Deterministic stepKey order → byte-stable projection under a shuffled log.
  const sortedKeys = [...branches.keys()].sort();
  graph.nodes = sortedKeys.map((k) => branches.get(k)!.node);

  // Declared-dependency edges (ADR-0008): edge `{ from: dep, to: stepKey }` for
  // each declared dep, kept ONLY when BOTH endpoints are known nodes (dangling
  // deps to never-seen steps are dropped). Sorted by (from, to) so the projection
  // stays byte-stable under a shuffled log.
  // ponytail: no linear first-seen spine anymore — a run that declares no deps
  // now has ZERO edges (correct per ADR-0008; edges reflect the real DAG, not
  // emission order). `layout()` depth folds all such nodes to depth 0, fine.
  const known = new Set(sortedKeys);
  for (const stepKey of sortedKeys) {
    for (const dep of branches.get(stepKey)!.deps) {
      if (known.has(dep)) graph.edges.push({ from: dep, to: stepKey });
    }
  }
  graph.edges.sort((a, b) =>
    a.from !== b.from ? (a.from < b.from ? -1 : 1) : a.to < b.to ? -1 : a.to > b.to ? 1 : 0,
  );

  // #41: stamp derived stale/orphaned overlays onto matching nodes (PRESERVE the
  // existing lifecycle state — overlays sit ON TOP of `succeeded`/etc., they never
  // replace it, and never hide/delete a node). Absent overlays → no-op.
  if (overlays) {
    const staleSet = overlays.stale ? new Set(overlays.stale) : null;
    const orphanedSet = overlays.orphaned ? new Set(overlays.orphaned) : null;
    if (staleSet || orphanedSet) {
      for (const node of graph.nodes) {
        if (staleSet?.has(node.stepKey)) node.stale = true;
        if (orphanedSet?.has(node.stepKey)) node.orphaned = true;
      }
    }
  }

  return graph;
}

// ── step-graph:update broadcast payload ──────────────────────────────────────
// Slice #31 keeps the wire dead simple: every ingest re-projects the run and
// broadcasts the whole graph. The Canvas just replaces its view — no delta
// reconciliation to get wrong.
export type StepGraphUpdate = StepGraph;

// ── Branch / Lineage projection (#41, ADR-0003/0005/0015) ─────────────────────
// ponytail: no-branches-table-fold-instead. ADR-0015 supersedes ADR-0005's mutable
// `active`/`stale` columns: the active pointer is EVENT-SOURCED, folded in ingest
// order, human-sticky. We persist `cc.branch.*` CCEvents on the existing events log
// (truth + audit + Board-reopen restore) and DERIVE everything here — no branches
// table, no migration. ADR-0005's table stays the upgrade path only if branch-event
// volume makes this per-ingest fold measurably slow. [FLAGGED for user veto.]

/** Who authored a Branch: the agent (auto) or a human operator (control-plane edit). */
export type Provenance = 'agent' | 'human';

/**
 * One immutable Branch of a Step (ADR-0003/0005). Lineage is the `parentBranchId`
 * chain (null = the root/original). `active`/`stale` are DERIVED overlays from the
 * fold, not stored. `payload` carries the human edit (a swapped `ref` and/or `text`).
 */
export interface BranchInfo {
  branchId: string;
  parentBranchId: string | null;
  provenance: Provenance;
  payload?: { ref?: string; text?: string };
  createdAt: number;
  active: boolean;
  stale: boolean;
}

/**
 * The folded Branch/Lineage view of a Run: per stepKey, the lineage of Branches +
 * the single human-sticky active pointer; plus the Run's orphaned Steps (slots
 * dropped on re-plan, PRESERVED never deleted).
 */
export interface BranchProjection {
  runId: string;
  steps: Record<string /*stepKey*/, { branches: BranchInfo[]; activeBranchId: string }>;
  orphanedStepKeys: string[];
}

/**
 * Transitive DOWNSTREAM stepKeys of a set of edited Steps, following declared
 * `deps` edges (#34, ADR-0008): every Step that directly or transitively declares
 * a dep on an edited Step. The edited Steps themselves are EXCLUDED — an edit
 * stales what is below it, not itself. Pure + order-independent; the control plane
 * uses this to decide which Steps to emit `cc.branch.staled` for, and to build the
 * stale set passed to `projectStepGraph` overlays.
 * ponytail: generation-tag-is-ordering — plain reachability over edges, no vector clock.
 */
export function staleDownstream(edges: StepEdge[], editedStepKeys: Iterable<string>): Set<string> {
  // adjacency: upstream `from` → downstream `to`s (edge = dep→dependent).
  const downstream = new Map<string, string[]>();
  for (const e of edges) {
    const list = downstream.get(e.from);
    if (list) list.push(e.to);
    else downstream.set(e.from, [e.to]);
  }
  const edited = new Set(editedStepKeys);
  const stale = new Set<string>();
  const stack = [...edited];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const next of downstream.get(cur) ?? []) {
      if (!stale.has(next)) {
        stale.add(next);
        stack.push(next);
      }
    }
  }
  // Sources are not stale themselves (an edit only stales DOWNSTREAM).
  for (const k of edited) stale.delete(k);
  return stale;
}

/**
 * Re-plan slot diff (ADR-0018): classify the prior Slot-Identity set against the
 * next one so stable slots keep their Steps and only changed slots churn.
 *  - `kept`     — in BOTH (stable slot retains its Steps/Branches),
 *  - `added`    — in `next` only (a new slot),
 *  - `orphaned` — in `prior` only (a dropped slot → its Steps are Orphaned, PRESERVED).
 * Pure set diff: de-duplicated and order-independent (every list sorted).
 * ponytail: explicit-replan-diff — explicit slot set IN, slot diff OUT, no plan inference.
 */
export function diffSlots(
  prior: string[],
  next: string[],
): { kept: string[]; added: string[]; orphaned: string[] } {
  const priorSet = new Set(prior);
  const nextSet = new Set(next);
  const kept: string[] = [];
  const added: string[] = [];
  const orphaned: string[] = [];
  for (const s of new Set(prior)) if (nextSet.has(s)) kept.push(s);
  for (const s of new Set(next)) if (!priorSet.has(s)) added.push(s);
  for (const s of new Set(prior)) if (!nextSet.has(s)) orphaned.push(s);
  kept.sort();
  added.sort();
  orphaned.sort();
  return { kept, added, orphaned };
}

// The fold's per-step accumulator. `order` preserves branch insertion order for a
// deterministic `branches` list; the active resolution is human-sticky (ADR-0015).
interface StepBranchAcc {
  order: string[];
  branches: Map<string, BranchInfo>;
  rootBranchId: string | null; // first parentless branch — the active fallback
  activeBranchId: string | null;
  lastHumanGeneration: number; // generation of the most recent HUMAN activation
  staleBranchIds: Set<string>;
  staleActive: boolean; // a staled event arrived without an explicit branchId
}

/** Read a number from a CCEvent payload, else a fallback (defensive — payloads are `unknown`). */
function numField(p: Record<string, unknown>, key: string, fallback: number): number {
  const v = p[key];
  return typeof v === 'number' ? v : fallback;
}

/** Read a string field, else null. */
function strField(p: Record<string, unknown>, key: string): string | null {
  const v = p[key];
  return typeof v === 'string' ? v : null;
}

/**
 * PURE fold: `cc.branch.*` CCEvents → BranchProjection. Folded in ingest order
 * (seq ascending, timestamp tiebreak) so the result is order-independent under a
 * shuffled log. Only `cc.branch.*` events are considered; everything else ignored.
 *
 *  - `cc.branch.created`   → a BranchInfo under steps[stepKey].branches. Lineage is
 *    the `parentBranchId` chain (the tree is reconstructable from the pointers).
 *  - `cc.branch.activated` → resolves the single `activeBranchId` per stepKey,
 *    HUMAN-STICKY (ADR-0015 §2): an agent/cascade activation tagged with generation
 *    G does NOT override a human activation recorded at-or-after G — the regenerated
 *    agent branch still lands in lineage, just non-active.
 *    ponytail: generation-tag-is-ordering-not-vectorclock — a cascade carries the
 *    triggering edit's generation; humans stamp their own. We compare those numbers.
 *  - `cc.branch.staled`    → marks a branch stale (overlay), OR — when payload
 *    `orphaned === true` — records the stepKey as Orphaned (re-plan dropped its
 *    slot). Both PRESERVED, never deleted. ponytail: overlays-not-lifecycle-states.
 *
 * #41 FLAGS stale/orphaned only — the provenance-aware regeneration cascade is #42.
 * ponytail: flag-not-cascade.
 */
export function projectBranches(events: CCEvent[]): BranchProjection {
  const branchEvents = events
    .filter((e) => e.hook_event_type.startsWith('cc.branch.'))
    .sort((a, b) => (a.seq !== b.seq ? a.seq - b.seq : a.timestamp - b.timestamp));

  const runId =
    (branchEvents.length
      ? strField(branchEvents[0]!.payload, 'runId')
      : null) ?? '';

  const steps = new Map<string, StepBranchAcc>();
  const orphaned = new Set<string>();

  const accFor = (stepKey: string): StepBranchAcc => {
    let acc = steps.get(stepKey);
    if (!acc) {
      acc = {
        order: [],
        branches: new Map(),
        rootBranchId: null,
        activeBranchId: null,
        lastHumanGeneration: Number.NEGATIVE_INFINITY,
        staleBranchIds: new Set(),
        staleActive: false,
      };
      steps.set(stepKey, acc);
    }
    return acc;
  };

  for (const ev of branchEvents) {
    const p = ev.payload;
    const stepKey = strField(p, 'stepKey');
    if (!stepKey) continue; // a branch event with no stepKey is meaningless — skip
    const branchId = strField(p, 'branchId');

    switch (ev.hook_event_type) {
      case 'cc.branch.created': {
        if (!branchId) break;
        const acc = accFor(stepKey);
        if (acc.branches.has(branchId)) break; // idempotent — first create wins
        const parentBranchId = strField(p, 'parentBranchId'); // null = root
        const provenance: Provenance = strField(p, 'provenance') === 'human' ? 'human' : 'agent';
        const rawPayload = (p.payload ?? undefined) as { ref?: string; text?: string } | undefined;
        const info: BranchInfo = {
          branchId,
          parentBranchId,
          provenance,
          createdAt: numField(p, 'createdAt', ev.timestamp),
          active: false,
          stale: false,
        };
        if (rawPayload && (rawPayload.ref !== undefined || rawPayload.text !== undefined)) {
          info.payload = {
            ...(rawPayload.ref !== undefined ? { ref: rawPayload.ref } : {}),
            ...(rawPayload.text !== undefined ? { text: rawPayload.text } : {}),
          };
        }
        acc.branches.set(branchId, info);
        acc.order.push(branchId);
        if (parentBranchId === null && acc.rootBranchId === null) acc.rootBranchId = branchId;
        break;
      }
      case 'cc.branch.activated': {
        if (!branchId) break;
        const acc = accFor(stepKey);
        const provenance: Provenance = strField(p, 'provenance') === 'human' ? 'human' : 'agent';
        const generation = numField(p, 'generation', ev.seq);
        if (provenance === 'human') {
          // Human pick always wins and stamps the sticky generation watermark.
          acc.activeBranchId = branchId;
          acc.lastHumanGeneration = generation;
        } else if (acc.lastHumanGeneration < generation) {
          // Agent/cascade only wins when NO human pick at-or-after its generation.
          acc.activeBranchId = branchId;
        }
        break;
      }
      case 'cc.branch.staled': {
        const acc = accFor(stepKey);
        if (p.orphaned === true) {
          orphaned.add(stepKey); // re-plan dropped this Step's slot
          break;
        }
        if (branchId) acc.staleBranchIds.add(branchId);
        else acc.staleActive = true; // stale "the active branch", resolved post-fold
        break;
      }
    }
  }

  // Resolve active + stamp active/stale onto each step's branches.
  const out: BranchProjection = { runId, steps: {}, orphanedStepKeys: [] };
  for (const [stepKey, acc] of steps) {
    if (acc.order.length === 0) continue; // staled/orphaned-only step → no branch list
    const activeBranchId = acc.activeBranchId ?? acc.rootBranchId ?? acc.order[0]!;
    if (acc.staleActive) acc.staleBranchIds.add(activeBranchId);
    const branches = acc.order.map((id) => {
      const b = acc.branches.get(id)!;
      b.active = id === activeBranchId;
      b.stale = acc.staleBranchIds.has(id);
      return b;
    });
    out.steps[stepKey] = { branches, activeBranchId };
  }
  out.orphanedStepKeys = [...orphaned].sort();
  return out;
}

// ── branch:update broadcast payload ───────────────────────────────────────────
// Mirrors `StepGraphUpdate` (#31): every control-plane edit re-folds + broadcasts
// the whole BranchProjection; the Canvas replaces its view (no delta to mis-merge).
export type BranchUpdate = BranchProjection;

// ── Provenance-aware cascade preview (#42, ADR-0003/0016) ─────────────────────
// Pure + testable. REUSES `staleDownstream` (declared-dep reachability) — no new
// reachability — and the `projectBranches` active-pointer + provenance.

/** The active branch's provenance for a step; default `agent` when no human edit
 *  exists (Emitter steps carry only the agent-authored root → absence = agent). */
function activeProvenance(branchProj: BranchProjection, stepKey: string): Provenance {
  const step = branchProj.steps[stepKey];
  if (!step) return 'agent';
  return step.branches.find((b) => b.branchId === step.activeBranchId)?.provenance ?? 'agent';
}

/**
 * The cascade the operator would trigger by editing `editedStepKey`: the transitive
 * agent-authored downstream Branch set that would regenerate. `targets` = the
 * downstream steps whose ACTIVE branch provenance is `agent`; `excludedHumanStepKeys`
 * = the human-active rest of that same downstream set — left Stale, NEVER silently
 * overridden (ADR-0003/0015). `count === targets.length`; `threshold` gates the UI
 * (silent at/below, confirm above). The route fills `runId` + `budgetHeadroom`.
 * ponytail: reuse-staledownstream — reachability is one shared walk, not re-derived.
 */
export function cascadePreview(
  graph: StepGraph,
  branchProj: BranchProjection,
  editedStepKey: string,
  threshold = 2,
): Omit<CascadePreview, 'runId' | 'budgetHeadroom'> {
  const stageByKey = new Map(graph.nodes.map((n) => [n.stepKey, n.stage]));
  const downstream = [...staleDownstream(graph.edges, [editedStepKey])].sort();

  const targets: CascadeTarget[] = [];
  const excludedHumanStepKeys: string[] = [];
  for (const stepKey of downstream) {
    if (activeProvenance(branchProj, stepKey) === 'agent') {
      targets.push({ stepKey, stage: stageByKey.get(stepKey) ?? stageOf(graph.runId, stepKey) });
    } else {
      excludedHumanStepKeys.push(stepKey);
    }
  }
  return { editedStepKey, targets, count: targets.length, threshold, excludedHumanStepKeys };
}

/**
 * DERIVED render-time view state (emits nothing — ADR-0009/0016 §4): the stepKeys
 * whose node is `queued` AND has SOME transitive upstream node in `failed`. The
 * Canvas restyles these "blocked: upstream failed"; it never adds a wire state.
 * Pure walk over the declared-dep edges (upstream = edge `to`→`from`).
 */
export function blockedUpstreamStepKeys(graph: StepGraph): Set<string> {
  const stateByKey = new Map(graph.nodes.map((n) => [n.stepKey, n.state]));
  const upstream = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = upstream.get(e.to);
    if (list) list.push(e.from);
    else upstream.set(e.to, [e.from]);
  }

  const blocked = new Set<string>();
  for (const node of graph.nodes) {
    if (node.state !== 'queued') continue;
    const seen = new Set<string>();
    const stack = [...(upstream.get(node.stepKey) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      if (stateByKey.get(cur) === 'failed') {
        blocked.add(node.stepKey);
        break;
      }
      for (const up of upstream.get(cur) ?? []) stack.push(up);
    }
  }
  return blocked;
}

/**
 * Execution Lease (#43, ADR-0025 §5) — DERIVED, emits nothing: the stepKeys whose
 * node is mid-flight (state ∈ {queued, running, retrying}) and therefore "holds" a
 * slot. A cascade dispatch into a leased slot trips the durable approval gate.
 * No new state / lock — a soft read over the existing Step lifecycle, mirroring how
 * `blockedUpstreamStepKeys` reads node state off the graph.
 *
 * ponytail: v1 keys by `stepKey` within the active run graph — correct under the v1
 * one-run-per-board invariant. The cross-run `(producerSystem, slot-id)` refinement
 * (ADR-0025 §3) is correct-but-rarely-exercised here; add it when many-runs-per-board
 * is actually exercised.
 */
export function leasedSlots(graph: StepGraph): Set<string> {
  const busy = new Set<string>();
  for (const node of graph.nodes) {
    if (node.state === 'queued' || node.state === 'running' || node.state === 'retrying') {
      busy.add(node.stepKey);
    }
  }
  return busy;
}

// ── Board projection (#36) ────────────────────────────────────────────────────
// A Board is the unit of persistence: a grouping over already-persisted Runs.
// Cross-Run stacking is a READ-side projection keyed on `(producerSystem, slotId)`
// [ADR-0025] — emit identity stays `(runId, step-key)`. Re-generating the same
// creative slot lands in the SAME slot rather than scattering.

/** One Board position: every Run sharing a `(producerSystem, slotId)`, latest first. */
export interface BoardSlot {
  slotId: string;
  producerSystem: string;
  runs: StepGraph[];
}

export interface BoardProjection {
  boardId: string;
  title: string;
  createdAt: number;
  slots: BoardSlot[];
}

/**
 * PURE, ORDER-INDEPENDENT fold: Board metadata + Run memberships + each member's
 * StepGraph → BoardProjection. Mirrors `projectStepGraph` discipline (#32): no DB,
 * no I/O, byte-stable under shuffled inputs.
 *
 *  - Group memberships by composite `(producerSystem, slotId)` — each group is one slot.
 *  - Within a slot, `runs` are the members' StepGraphs (looked up by runId), sorted
 *    by `startedAt` DESC (latest first), tiebreak `runId` ASC. A membership whose
 *    runId is absent from `runGraphs` is skipped (Run not yet folded / board-less).
 *  - Slots sorted by `slotId` ASC (byte-stable, like `projectStepGraph`'s stepKey sort).
 */
export function projectBoard(
  meta: { boardId: string; title: string; createdAt: number },
  memberships: Array<{ runId: string; producerSystem: string; slotId: string }>,
  runGraphs: Record<string, StepGraph>,
): BoardProjection {
  const bySlot = new Map<string, BoardSlot>();

  for (const m of memberships) {
    const graph = runGraphs[m.runId];
    if (!graph) continue; // runId absent → excluded (board-less / not yet folded)
    const key = `${m.producerSystem}\u0000${m.slotId}`;
    let slot = bySlot.get(key);
    if (!slot) {
      slot = { slotId: m.slotId, producerSystem: m.producerSystem, runs: [] };
      bySlot.set(key, slot);
    }
    slot.runs.push(graph);
  }

  // Within each slot: latest startedAt first, tiebreak runId ascending.
  for (const slot of bySlot.values()) {
    slot.runs.sort((a, b) => {
      const sa = a.startedAt ?? 0;
      const sb = b.startedAt ?? 0;
      if (sa !== sb) return sb - sa; // DESC
      return a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0;
    });
  }

  // Slots sorted by slotId ascending → byte-stable projection under shuffled input.
  // Tiebreak on producerSystem so distinct producers sharing a slotId stay stable.
  const slots = [...bySlot.values()].sort((a, b) => {
    if (a.slotId !== b.slotId) return a.slotId < b.slotId ? -1 : 1;
    return a.producerSystem < b.producerSystem ? -1 : a.producerSystem > b.producerSystem ? 1 : 0;
  });

  return { boardId: meta.boardId, title: meta.title, createdAt: meta.createdAt, slots };
}

// ponytail: Board/slot merge + `(producerSystem, slotId)` is slice #36; artifact
// snapshot-on-ingest is slice #32 — both deliberately deferred. The envelope-
// version window + upcaster + out-of-window reject (slice #33) landed above; it
// stays one window + a one-entry registry, not a plugin framework.
