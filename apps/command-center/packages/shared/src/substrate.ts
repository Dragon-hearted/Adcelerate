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
 * The branch a Step lifecycle event belongs to. Branches do not exist until #41
 * (Branch/Lineage); today a branch IS a step, so this is the stepKey. #41 swaps
 * a real branch id in HERE without touching the dedupe key or the fold.
 */
export function branchIdOf(stepKey: string): string {
  return stepKey;
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
 * Real lineage edges land in #41; until then edges are a deterministic linear
 * spine over the sorted nodes (the single-branch placeholder this slice hardens).
 */
export function projectStepGraph(events: IngestEnvelope[]): StepGraph {
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
          };
          branches.set(branchId, acc);
        }

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
  for (let i = 1; i < sortedKeys.length; i++) {
    graph.edges.push({ from: sortedKeys[i - 1]!, to: sortedKeys[i]! });
  }

  return graph;
}

// ── step-graph:update broadcast payload ──────────────────────────────────────
// Slice #31 keeps the wire dead simple: every ingest re-projects the run and
// broadcasts the whole graph. The Canvas just replaces its view — no delta
// reconciliation to get wrong.
export type StepGraphUpdate = StepGraph;

// ponytail: Board/slot merge + `(producerSystem, slotId)` is slice #36; artifact
// snapshot-on-ingest is slice #32 — both deliberately deferred. The envelope-
// version window + upcaster + out-of-window reject (slice #33) landed above; it
// stays one window + a one-entry registry, not a plugin framework.
