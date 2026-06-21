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
// Idempotency is `(runId, stepKey, lifecycleState)`. Run lifecycle events have no
// stepKey, so they fold onto a per-run sentinel and use the run state as the
// lifecycle component.
export const RUN_STEP_SENTINEL = '__run__';

export function dedupeKeyOf(env: IngestEnvelope): string {
  if (env.kind === 'run.started') {
    return `${env.runId}::${RUN_STEP_SENTINEL}::started`;
  }
  if (env.kind === 'run.completed') {
    return `${env.runId}::${RUN_STEP_SENTINEL}::${env.status}`;
  }
  return `${env.runId}::${env.stepKey}::${env.state}`;
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

/**
 * PURE fold: ordered envelopes → StepGraph. Group by `(runId, stepKey)`,
 * latest-state-wins per step. Nodes are steps; edges chain steps in first-seen
 * (declared/source) order. Run lifecycle envelopes set graph-level metadata.
 *
 * Envelopes are assumed chronological (the ingest log is append-ordered); the
 * last state seen for a stepKey wins. Mixed-run input is grouped by the first
 * envelope's runId — callers pass one run's events.
 */
export function projectStepGraph(events: IngestEnvelope[]): StepGraph {
  const runId = events[0]?.runId ?? '';
  const graph: StepGraph = {
    envelopeVersion: ENVELOPE_VERSION,
    runId,
    nodes: [],
    edges: [],
  };

  const nodeIndex = new Map<string, StepNode>();
  const order: string[] = []; // stepKeys in first-seen order

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
        let node = nodeIndex.get(env.stepKey);
        if (!node) {
          node = {
            runId: env.runId,
            stepKey: env.stepKey,
            stage: stageOf(env.runId, env.stepKey),
            state: env.state,
          };
          nodeIndex.set(env.stepKey, node);
          order.push(env.stepKey);
        }
        // latest-state-wins; keep the most recent artifact if supplied.
        node.state = env.state;
        if (env.artifact) node.artifact = env.artifact;
        break;
      }
    }
  }

  graph.nodes = order.map((k) => nodeIndex.get(k)!);
  // Edges chain steps in declared/source order — the spine of a linear pipeline.
  // Branch/lineage edges are a later slice; first-seen order is the contract here.
  for (let i = 1; i < order.length; i++) {
    graph.edges.push({ from: order[i - 1]!, to: order[i]! });
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
