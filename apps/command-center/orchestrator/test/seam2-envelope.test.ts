// ─────────────────────────────────────────────────────────────────────────────
// TEST SEAM 2 — Emitter envelope versioning + loud reject (slice #33 / ADR-0020).
//
// The three response classes at POST /api/ingest:
//   current (1.1.0)        → 202 accept, persisted, projected
//   older-in-window (1.0.0)→ upcast → 202 accept, projects IDENTICALLY to current
//   out-of-window (0.9 / 2.0) → 422 loud reject, ZERO persistence, incompatibility
//
// Reject (422 hard no-op) is asserted distinct from seam-1 dedupe (200 idempotent).
// Run against an in-memory DB (CC_DB_PATH=:memory:, see package.json "test").
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, describe, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import {
  CURRENT_ENVELOPE_VERSION,
  SUPPORTED_ENVELOPE_RANGE,
  upcastEnvelope,
  projectStepGraph,
  type IngestEnvelope,
  type UpcastAccepted,
} from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { db } from '../src/db/client';
import { events } from '../src/db/schema';
import { ingestRoutes } from '../src/routes/ingest';
import { eventBus } from '../src/bus/event-bus';

let app: FastifyInstance;

beforeAll(async () => {
  runMigrations();
  app = Fastify();
  await app.register(ingestRoutes);
  await app.ready();
});

function post(payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/api/ingest',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
}

/** Persisted Run/Step rows for a run, in append order. */
function loadRunRows(runId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.sessionId, runId))
    .orderBy(asc(events.seq))
    .all();
}

/** Build a 3-event run (started → step succeeded → completed) at a given version. */
function runEnvelopes(version: string, runId: string): Record<string, unknown>[] {
  const step = `${runId}:generate`;
  return [
    { envelopeVersion: version, kind: 'run.started', runId, producerSystem: 'image-engine', startedAt: 1 },
    { envelopeVersion: version, kind: 'step', runId, stepKey: step, state: 'succeeded' },
    { envelopeVersion: version, kind: 'run.completed', runId, status: 'completed', completedAt: 9 },
  ];
}

describe('seam 2 — current version is accepted', () => {
  test('current (1.1.0) run → 202 accept, persisted', async () => {
    const RUN = 'run_current';
    for (const env of runEnvelopes(CURRENT_ENVELOPE_VERSION, RUN)) {
      const res = await post(env);
      expect(res.statusCode).toBe(202);
      expect(res.json()).toMatchObject({ ok: true, deduped: false });
    }
    expect(loadRunRows(RUN)).toHaveLength(3);

    // GET hydration projects the run.
    const graphRes = await app.inject({ method: 'GET', url: `/api/runs/${RUN}/graph` });
    const graph = graphRes.json();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].state).toBe('succeeded');
    expect(graph.status).toBe('completed');
  });
});

describe('seam 2 — older-in-window is upcast then accepted', () => {
  test('1.0.0 run → 202 accept, persisted', async () => {
    const RUN = 'run_v10';
    for (const env of runEnvelopes('1.0.0', RUN)) {
      const res = await post(env);
      expect(res.statusCode).toBe(202);
      expect(res.json()).toMatchObject({ ok: true, deduped: false });
    }
    expect(loadRunRows(RUN)).toHaveLength(3);
  });

  test('upcastEnvelope stamps current version and defaults the 1.1 field', () => {
    const gate = upcastEnvelope({
      envelopeVersion: '1.0.0',
      kind: 'run.started',
      runId: 'r',
      producerSystem: 'image-engine',
      startedAt: 1,
    });
    expect(gate.ok).toBe(true);
    const acc = gate as UpcastAccepted;
    expect(acc.upcasted).toBe(true);
    expect(acc.envelope.envelopeVersion).toBe(CURRENT_ENVELOPE_VERSION);
    // 1.1 added optional producerVersion; the upcaster defaults it.
    expect((acc.envelope as { producerVersion?: string }).producerVersion).toBe('unknown');
  });

  test('current version is accepted as-is (no upcast)', () => {
    const gate = upcastEnvelope({
      envelopeVersion: CURRENT_ENVELOPE_VERSION,
      kind: 'step',
      runId: 'r',
      stepKey: 'r:x',
      state: 'running',
    });
    expect(gate.ok).toBe(true);
    expect((gate as UpcastAccepted).upcasted).toBe(false);
  });

  test('1.0.0 upcast projects to the SAME StepGraph as current', () => {
    const RUN = 'run_same';
    // Same runId through the pure fold → upcast(1.0.0) must deep-equal current.
    const upcast: IngestEnvelope[] = runEnvelopes('1.0.0', RUN).map((raw) => {
      const gate = upcastEnvelope(raw);
      expect(gate.ok).toBe(true);
      return (gate as UpcastAccepted).envelope;
    });
    const current = runEnvelopes(CURRENT_ENVELOPE_VERSION, RUN).map(
      (raw) => (upcastEnvelope(raw) as UpcastAccepted).envelope,
    );
    expect(projectStepGraph(upcast)).toEqual(projectStepGraph(current));
  });
});

describe('seam 2 — out-of-window is rejected loudly (4xx, zero mutation)', () => {
  for (const bad of ['0.9.0', '2.0.0']) {
    test(`${bad} → 422 reject, NO events persisted, incompatibility fires`, async () => {
      const RUN = `run_${bad.replace(/\./g, '_')}`;
      let signal: { producerSystem: string; gotVersion: string; supported: string } | null = null;
      const off = eventBus.onIncompatibility((s) => {
        signal = s;
      });

      const res = await post({
        envelopeVersion: bad,
        kind: 'run.started',
        runId: RUN,
        producerSystem: 'drifted-system',
        startedAt: 1,
      });
      off();

      // Loud 4xx (not 2xx) — a hard no-op.
      expect(res.statusCode).toBe(422);
      expect(res.json()).toMatchObject({
        gotVersion: bad,
        supported: SUPPORTED_ENVELOPE_RANGE,
      });

      // ZERO state mutation: nothing persisted for the run.
      expect(loadRunRows(RUN)).toHaveLength(0);

      // The Console incompatibility signal fired.
      expect(signal).toMatchObject({
        producerSystem: 'drifted-system',
        gotVersion: bad,
        supported: SUPPORTED_ENVELOPE_RANGE,
      });
    });
  }

  test('missing/garbage version is a malformed body → 400 (not a 422 incompatibility)', async () => {
    // No version is not a "declared unsupported version" — it falls through to
    // the existing structural validate, distinct from the out-of-window 422.
    const res = await post({ kind: 'run.started', runId: 'run_noversion', producerSystem: 'x', startedAt: 1 });
    expect(res.statusCode).toBe(400);
    expect(loadRunRows('run_noversion')).toHaveLength(0);
  });
});

describe('seam 2 — reject is distinct from seam-1 dedupe', () => {
  test('duplicate current envelope → 200 deduped (idempotent), NOT 4xx', async () => {
    const env = {
      envelopeVersion: CURRENT_ENVELOPE_VERSION,
      kind: 'run.started',
      runId: 'run_dedupe',
      producerSystem: 'image-engine',
      startedAt: 1,
    };
    const first = await post(env);
    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({ deduped: false });

    const second = await post(env);
    // Dedupe: 200 idempotent (distinct from the 422 hard-reject above).
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ ok: true, deduped: true });

    // Idempotent — exactly one row persisted.
    expect(loadRunRows('run_dedupe')).toHaveLength(1);
  });
});
