// ─────────────────────────────────────────────────────────────────────────────
// Substrate — the producer-agnostic Run / Step contract + the Step-Graph fold.
//
// A *Run* is one unit of work reported by an external producer system (e.g. an
// image-engine batch). It streams a minimal lifecycle through the copied Emitter
// (ADR-0008) to the orchestrator's POST /api/ingest:
//
//   run.started → step(queued → running → succeeded|failed) → run.completed(status)
//
// Every envelope carries `envelopeVersion: "1.0"`. The Substrate folds the ordered
// event log into a Step Graph on the READ side — no board tables, no upcaster, no
// artifact snapshot (see the ponytail note at the foot of this file).
//
// `stepKey` convention: `<runId>:<stage>` (ADR-0006). The `stage` segment names the
// pipeline stage; the runId prefix scopes it to one Run.
//
// All timestamps are epoch milliseconds (matches the CCEvent log).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const ENVELOPE_VERSION = '1.0' as const;

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
// `kind` is the discriminant. envelopeVersion is fixed at "1.0" for this slice.

const envelopeVersion = z.literal(ENVELOPE_VERSION);

export const runStartedSchema = z.object({
  envelopeVersion,
  kind: z.literal('run.started'),
  runId: z.string().min(1),
  producerSystem: z.string().min(1),
  startedAt: z.number(),
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

// ponytail: Board/slot merge + `(producerSystem, slotId)` is slice #36; the
// envelope-version upcaster + out-of-window reject is slice #33; artifact
// snapshot-on-ingest is slice #32. All deliberately deferred — this file is the
// thin v1.0 spine those slices build on.
