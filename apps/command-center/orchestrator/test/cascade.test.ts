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

import { describe, it, expect, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import type { CCEvent, IngestEnvelope } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { ingestRoutes } from '../src/routes/ingest';
import { cascadeRoutes } from '../src/routes/cascade';
import { eventBus } from '../src/bus/event-bus';

const V = '1.0' as const;

beforeAll(() => {
  runMigrations();
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

describe('POST /api/runs/:runId/cascade', () => {
  it('emits EXACTLY ONE cc.cascade.requested and returns the target stepKeys', async () => {
    const app = await buildApp();
    const runId = 'run_cascade_post';
    const { a, b, c } = await seedChain(app, runId);

    const seen: CCEvent[] = [];
    const off = eventBus.on((evt) => {
      if (evt.session_id === runId && evt.hook_event_type === 'cc.cascade.requested') seen.push(evt);
    });

    const res = await app.inject({ method: 'POST', url: `/api/runs/${runId}/cascade`, payload: { stepKey: a } });
    off();

    expect(res.statusCode).toBe(200);
    expect(res.json().requested.sort()).toEqual([b, c].sort());

    // Exactly one persisted intent event with the pinned payload shape.
    expect(seen).toHaveLength(1);
    expect(seen[0].payload?.editedStepKey).toBe(a);
    expect((seen[0].payload?.targets as string[]).sort()).toEqual([b, c].sort());

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
