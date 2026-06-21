// ─────────────────────────────────────────────────────────────────────────────
// /api/ingest — producer-agnostic Run/Step ingest (slice #31).
//
//   POST /api/ingest            → validate envelope, dedupe, persist, broadcast
//   GET  /api/runs/:runId/graph → projected StepGraph snapshot (hydration)
//
// Reuses the existing `events` ordered log (the Run groups under the `session_id`
// column — a Run is NOT a Session, the column is just reused) and the
// persist-then-broadcast EventBus. The Step Graph is folded READ-side from the
// stored envelopes (`projectStepGraph`) — no board tables, no new columns.
//
// Dedupe is `(runId, stepKey, lifecycleState)` via `dedupeKeyOf`, checked against
// the run's already-persisted envelopes so it's stateless across restarts.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import {
  ingestEnvelopeSchema,
  upcastEnvelope,
  dedupeKeyOf,
  projectStepGraph,
  SUPPORTED_ENVELOPE_RANGE,
  type IngestEnvelope,
  type EventType,
} from '@command-center/shared';
import { db } from '../db/client';
import { events } from '../db/schema';
import { eventBus } from '../bus/event-bus';

// kind → the synthetic CCEvent hook type it persists as.
function hookTypeOf(kind: IngestEnvelope['kind']): EventType {
  if (kind === 'run.started') return 'cc.run.started';
  if (kind === 'run.completed') return 'cc.run.completed';
  return 'cc.step';
}

const RUN_STEP_HOOK_TYPES = new Set<EventType>([
  'cc.run.started',
  'cc.run.completed',
  'cc.step',
]);

/** Load a run's persisted Run/Step envelopes in append order (seq ascending). */
function loadRunEnvelopes(runId: string): IngestEnvelope[] {
  const rows = db
    .select()
    .from(events)
    .where(eq(events.sessionId, runId))
    .orderBy(asc(events.seq))
    .all();
  const out: IngestEnvelope[] = [];
  for (const r of rows) {
    if (!RUN_STEP_HOOK_TYPES.has(r.hookEventType as EventType)) continue;
    const parsed = ingestEnvelopeSchema.safeParse(r.payload);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/ingest — the one ingress for external producers.
  app.post('/api/ingest', async (req, reply) => {
    // ── version gate (slice #33) — runs BEFORE the structural validate ────────
    // current → straight through; older-in-window → upcast to current; a real
    // producer declaring an out-of-window version → loud 4xx with ZERO
    // persistence + an incompatibility broadcast. A version-less/garbage body is
    // NOT a version problem — it falls through to the existing structural 400.
    // The 4xx reject is deliberately distinct from the seam-1 dedupe (200 idempotent).
    const gate = upcastEnvelope(req.body);
    if (!gate.ok && gate.reason === 'out-of-window') {
      const body = (req.body ?? {}) as { producerSystem?: unknown };
      const producerSystem =
        typeof body.producerSystem === 'string' ? body.producerSystem : 'unknown';
      // Transient alarm — NOT persisted; a rejected envelope mutates no state.
      eventBus.emitIncompatibility({
        producerSystem,
        gotVersion: gate.gotVersion,
        supported: SUPPORTED_ENVELOPE_RANGE,
        at: Date.now(),
      });
      // 422 Unprocessable Entity: well-formed JSON, semantically unsupported
      // version. A hard no-op on projected state (distinct from 200 dedupe).
      return reply.code(422).send({
        error: 'incompatible envelope version',
        gotVersion: gate.gotVersion,
        supported: SUPPORTED_ENVELOPE_RANGE,
      });
    }

    // Existing structural validate. On accept it runs against the version-
    // normalized (upcast) envelope; on an unparseable-version body it runs on the
    // raw body and yields the existing 400 — separate from the 422 version reject.
    const candidate = gate.ok ? gate.envelope : req.body;
    const parsed = ingestEnvelopeSchema.safeParse(candidate);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid envelope', issues: parsed.error.issues });
    }
    const env = parsed.data;

    // Dedupe on (runId, stepKey, lifecycleState) against what's already stored.
    const existing = loadRunEnvelopes(env.runId);
    const key = dedupeKeyOf(env);
    if (existing.some((e) => dedupeKeyOf(e) === key)) {
      // Idempotent replay — graph is unchanged, so don't persist or re-broadcast.
      return reply.code(200).send({ ok: true, deduped: true });
    }

    // Persist via the bus (persist-then-broadcast). The Run groups under
    // session_id; stepKey/summary are forwarded for cheap filtering.
    eventBus.emit({
      session_id: env.runId,
      hook_event_type: hookTypeOf(env.kind),
      payload: env,
      summary: env.kind === 'step' ? env.stepKey : env.kind,
    });

    // Re-project the full run and push the live read-model to the Canvas.
    const graph = projectStepGraph([...existing, env]);
    eventBus.emitStepGraphUpdate(graph);

    return reply.code(202).send({ ok: true, deduped: false });
  });

  // GET /api/runs/:runId/graph — StepGraph snapshot for Canvas hydration.
  app.get<{ Params: { runId: string } }>('/api/runs/:runId/graph', async (req) => {
    const { runId } = req.params;
    return projectStepGraph(loadRunEnvelopes(runId));
  });
}
