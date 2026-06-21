// ─────────────────────────────────────────────────────────────────────────────
// /api/runs/:runId/cascade(-preview) — provenance-aware cascade preview + request
// (slice #42). Proves the route surface (the pure folds are unit-tested in
// packages/shared/test/cascade.test.ts):
//   • GET cascade-preview folds graph+branches → correct shape (runId, targets,
//     count===targets.length, threshold) and 404s on an unknown run/step.
//   • POST cascade persists EXACTLY ONE cc.cascade.requested + returns the targets.
//   • budgetHeadroom is pulled from the in-memory trip cache (seed a trip → appears).
//
// Runs against the in-memory DB (CC_DB_PATH=:memory:) via `bun run test`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ApprovalRequest, CCEvent, IngestEnvelope } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { ingestRoutes } from '../src/routes/ingest';
import { cascadeRoutes } from '../src/routes/cascade';
import { eventBus, budgetTripCache } from '../src/bus/event-bus';
import { approvalBus } from '../src/bus/approval-bus';

const V = '1.0' as const;

beforeAll(() => {
  runMigrations();
});

// The budget-trip cache is process-global + transient; clear it before every test
// so a crossed-line seed in one gate test never leaks into another's trip rule.
beforeEach(() => {
  budgetTripCache.clear();
});

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(ingestRoutes);
  await app.register(cascadeRoutes);
  await app.ready();
  return app;
}

function ingest(app: FastifyInstance, env: IngestEnvelope) {
  return app.inject({ method: 'POST', url: '/api/ingest', payload: env as object });
}

/** Seed a Run with a linear DAG a → b → c (declared `deps`), all succeeded, agent-only. */
async function seedChain(app: FastifyInstance, runId: string): Promise<{ a: string; b: string; c: string }> {
  const a = `${runId}:a`;
  const b = `${runId}:b`;
  const c = `${runId}:c`;
  await ingest(app, { envelopeVersion: V, kind: 'run.started', runId, producerSystem: 'image-engine', startedAt: 1 });
  for (const [key, deps] of [[a, undefined], [b, [a]], [c, [b]]] as const) {
    await ingest(app, { envelopeVersion: V, kind: 'step', runId, stepKey: key, state: 'queued', deps });
    await ingest(app, { envelopeVersion: V, kind: 'step', runId, stepKey: key, state: 'succeeded', deps });
  }
  return { a, b, c };
}

/** Seed a linear DAG over `stages` (declared `deps`), every step left in `state`.
 *  `state: 'queued'` leaves the steps mid-flight → leased (no terminal event). */
async function seedLinear(
  app: FastifyInstance,
  runId: string,
  stages: string[],
  state: 'succeeded' | 'queued' = 'succeeded',
): Promise<string[]> {
  await ingest(app, { envelopeVersion: V, kind: 'run.started', runId, producerSystem: 'image-engine', startedAt: 1 });
  const keys: string[] = [];
  let prev: string | undefined;
  for (const s of stages) {
    const key = `${runId}:${s}`;
    const deps = prev ? [prev] : undefined;
    await ingest(app, { envelopeVersion: V, kind: 'step', runId, stepKey: key, state: 'queued', deps });
    if (state !== 'queued') {
      await ingest(app, { envelopeVersion: V, kind: 'step', runId, stepKey: key, state, deps });
    }
    keys.push(key);
    prev = key;
  }
  return keys;
}

/** Poll the bus until the cascade gate has parked its (spend) approval for `runId`. */
async function waitForApproval(runId: string): Promise<ApprovalRequest> {
  for (let i = 0; i < 100; i++) {
    const req = approvalBus.list().find((r) => r.session_id === runId);
    if (req) return req;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error('cascade gate never parked an approval for ' + runId);
}

/** Collect cc.approval.requested + cc.cascade.requested for a run; returns a stop fn. */
function captureGate(runId: string): { approvals: CCEvent[]; cascades: CCEvent[]; off: () => void } {
  const approvals: CCEvent[] = [];
  const cascades: CCEvent[] = [];
  const off = eventBus.on((e) => {
    if (e.session_id !== runId) return;
    if (e.hook_event_type === 'cc.approval.requested') approvals.push(e);
    if (e.hook_event_type === 'cc.cascade.requested') cascades.push(e);
  });
  return { approvals, cascades, off };
}

function preview(app: FastifyInstance, runId: string, stepKey: string) {
  return app.inject({ method: 'GET', url: `/api/runs/${runId}/cascade-preview?stepKey=${encodeURIComponent(stepKey)}` });
}

describe('GET /api/runs/:runId/cascade-preview', () => {
  it('folds graph+branches into the pinned CascadePreview shape (edit a ⇒ targets b,c)', async () => {
    const app = await buildApp();
    const runId = 'run_preview';
    const { a, b, c } = await seedChain(app, runId);

    const res = await preview(app, runId, a);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.runId).toBe(runId);
    expect(body.editedStepKey).toBe(a);
    // All-agent downstream → both b and c are targets; none human-excluded.
    expect(body.targets.map((t: { stepKey: string }) => t.stepKey).sort()).toEqual([b, c].sort());
    expect(body.excludedHumanStepKeys).toEqual([]);
    expect(body.count).toBe(body.targets.length);
    expect(body.count).toBe(2);
    expect(body.threshold).toBe(2);
    // Each target carries its resolved stage segment.
    expect(body.targets.find((t: { stepKey: string }) => t.stepKey === b).stage).toBe('b');
    // budgetHeadroom is always present (array; honest, may be empty).
    expect(Array.isArray(body.budgetHeadroom)).toBe(true);

    await app.close();
  });

  it('404s on an unknown run', async () => {
    const app = await buildApp();
    const res = await preview(app, 'run_nope', 'run_nope:a');
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('404s on a stepKey not in the graph', async () => {
    const app = await buildApp();
    const runId = 'run_preview_404';
    await seedChain(app, runId);
    const res = await preview(app, runId, `${runId}:ghost`);
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('400s when stepKey query param is missing', async () => {
    const app = await buildApp();
    const runId = 'run_preview_400';
    await seedChain(app, runId);
    const res = await app.inject({ method: 'GET', url: `/api/runs/${runId}/cascade-preview` });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('surfaces budgetHeadroom from the cached trip (seed a trip → it appears)', async () => {
    const app = await buildApp();
    const runId = 'run_preview_budget';
    const { a } = await seedChain(app, runId);

    // Seed a provider trip — the bus caches the latest-per-provider on emit.
    eventBus.emitBudgetTrip({
      provider: 'higgsfield',
      model: 'gpt-image-2',
      spentUsd: 9.5,
      limitUsd: 10,
      at: 1234,
    });

    const body = (await preview(app, runId, a)).json();
    const row = body.budgetHeadroom.find((h: { provider: string }) => h.provider === 'higgsfield');
    expect(row).toBeDefined();
    expect(row).toEqual({ provider: 'higgsfield', model: 'gpt-image-2', spentUsd: 9.5, limitUsd: 10, at: 1234 });

    await app.close();
  });
});

describe('POST /api/runs/:runId/cascade (≤2 ∧ clean → silent dispatch)', () => {
  it('dispatches silently (no approval parked) + emits EXACTLY ONE cc.cascade.requested', async () => {
    const app = await buildApp();
    const runId = 'run_cascade_post';
    const { a, b, c } = await seedChain(app, runId);

    const { approvals, cascades, off } = captureGate(runId);
    const res = await app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });
    off();

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('dispatched');
    expect(res.json().requested.sort()).toEqual([b, c].sort());

    // No gate: nothing parked; exactly one persisted intent with the pinned payload.
    expect(approvalBus.list().some((r) => r.session_id === runId)).toBe(false);
    expect(approvals).toHaveLength(0);
    expect(cascades).toHaveLength(1);
    expect(cascades[0].payload?.editedStepKey).toBe(a);
    expect((cascades[0].payload?.targets as string[]).sort()).toEqual([b, c].sort());

    await app.close();
  });

  it('400s when stepKey is missing; 404s on an unknown run', async () => {
    const app = await buildApp();
    const runId = 'run_cascade_bad';
    await seedChain(app, runId);

    const bad = await app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: {} });
    expect(bad.statusCode).toBe(400);

    const nope = await app.inject({ method: 'POST', url: `/api/runs/run_x/cascade`, payload: { stepKey: 'run_x:a' } });
    expect(nope.statusCode).toBe(404);

    await app.close();
  });
});

describe('POST /api/runs/:runId/cascade (durable spend+lease gate, #43)', () => {
  it('trips on count > 2 → ONE cc.approval.requested; approve emits cc.cascade.requested', async () => {
    const app = await buildApp();
    const runId = 'run_gate_count';
    const [a, ...rest] = await seedLinear(app, runId, ['a', 'b', 'c', 'd', 'e']); // 4 downstream

    const { approvals, cascades, off } = captureGate(runId);
    const pending = app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });

    const req = await waitForApproval(runId);
    expect(req.kind).toBe('permission');
    expect(req.effectClass).toBe('spend');
    expect(req.reason).toContain('4 > 2 nodes');
    expect(req.runId).toBe(runId);
    expect(req.stepKeys?.sort()).toEqual(rest.sort());
    expect(req.timeoutMs).toBeUndefined(); // no timeout — durable, waits for a human
    // Step not born yet: cascade intent withheld until approval.
    expect(cascades).toHaveLength(0);

    approvalBus.respond({ id: req.id, decision: 'approve', respondedAt: Date.now() });
    const res = await pending;
    off();

    expect(res.json().status).toBe('dispatched');
    expect(res.json().requested.sort()).toEqual(rest.sort());
    expect(approvals).toHaveLength(1); // exactly ONE durable request
    expect(cascades).toHaveLength(1); // emitted ONLY after approve
    await app.close();
  });

  it('deny emits NOTHING (Step never born), returns { status: denied }', async () => {
    const app = await buildApp();
    const runId = 'run_gate_deny';
    const [a] = await seedLinear(app, runId, ['a', 'b', 'c', 'd', 'e']);

    const { approvals, cascades, off } = captureGate(runId);
    const pending = app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });

    const req = await waitForApproval(runId);
    approvalBus.respond({ id: req.id, decision: 'deny', respondedAt: Date.now() });
    const res = await pending;
    off();

    expect(res.json().status).toBe('denied');
    expect(approvals).toHaveLength(1);
    expect(cascades).toHaveLength(0); // queued tail never dispatched
    await app.close();
  });

  it('trips on a crossed budget-line (spentUsd >= limitUsd); reason names the provider', async () => {
    const app = await buildApp();
    const runId = 'run_gate_budget';
    const [a, b, c] = await seedLinear(app, runId, ['a', 'b', 'c']); // only 2 downstream

    // Crossed line — spend has hit the limit. Honest reason, never a fabricated total.
    eventBus.emitBudgetTrip({ provider: 'higgsfield', model: 'gpt-image-2', spentUsd: 50, limitUsd: 50, at: 1 });

    const { approvals, cascades, off } = captureGate(runId);
    const pending = app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });

    const req = await waitForApproval(runId);
    expect(req.effectClass).toBe('spend');
    expect(req.reason).toContain('higgsfield $50/50');
    expect(req.reason).not.toContain('> 2 nodes'); // count alone did NOT trip (2 ≤ 2)

    approvalBus.respond({ id: req.id, decision: 'approve', respondedAt: Date.now() });
    const res = await pending;
    off();

    expect(res.json().status).toBe('dispatched');
    expect(res.json().requested.sort()).toEqual([b, c].sort());
    expect(approvals).toHaveLength(1);
    expect(cascades).toHaveLength(1);
    await app.close();
  });

  it('does NOT trip on an UN-crossed budget-line (spentUsd < limitUsd)', async () => {
    const app = await buildApp();
    const runId = 'run_gate_budget_ok';
    const [a, b, c] = await seedLinear(app, runId, ['a', 'b', 'c']);

    eventBus.emitBudgetTrip({ provider: 'higgsfield', model: 'gpt-image-2', spentUsd: 48, limitUsd: 50, at: 1 });

    const { approvals, cascades, off } = captureGate(runId);
    const res = await app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });
    off();

    expect(res.json().status).toBe('dispatched');
    expect(res.json().requested.sort()).toEqual([b, c].sort());
    expect(approvals).toHaveLength(0); // headroom remains → silent dispatch
    expect(cascades).toHaveLength(1);
    await app.close();
  });

  it('trips when a target is in a leased slot (queued/running/retrying); reason says "slot busy"', async () => {
    const app = await buildApp();
    const runId = 'run_gate_lease';
    const [a, b, c] = await seedLinear(app, runId, ['a', 'b', 'c'], 'queued'); // mid-flight → leased

    const { approvals, cascades, off } = captureGate(runId);
    const pending = app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });

    const req = await waitForApproval(runId);
    expect(req.effectClass).toBe('spend');
    expect(req.reason).toContain(`slot ${b} busy`);
    expect(req.reason).not.toContain('> 2 nodes'); // leased, not count

    approvalBus.respond({ id: req.id, decision: 'approve', respondedAt: Date.now() });
    const res = await pending;
    off();

    expect(res.json().status).toBe('dispatched');
    expect(res.json().requested.sort()).toEqual([b, c].sort());
    expect(approvals).toHaveLength(1);
    expect(cascades).toHaveLength(1);
    await app.close();
  });
});
