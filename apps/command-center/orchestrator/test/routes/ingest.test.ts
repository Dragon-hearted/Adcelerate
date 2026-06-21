// /api/ingest — validation, dedupe on (runId, stepKey, lifecycleState), and the
// GET /api/runs/:runId/graph projection. Runs against the in-memory DB.
import { describe, it, expect, beforeAll } from 'bun:test';
import Fastify from 'fastify';
import type { IngestEnvelope } from '@command-center/shared';
import { runMigrations } from '../../src/db/migrate';
import { ingestRoutes } from '../../src/routes/ingest';

const V = '1.0' as const;

beforeAll(() => {
  runMigrations();
});

async function buildApp() {
  const app = Fastify();
  await app.register(ingestRoutes);
  await app.ready();
  return app;
}

function post(app: Awaited<ReturnType<typeof buildApp>>, body: unknown) {
  return app.inject({ method: 'POST', url: '/api/ingest', payload: body as object });
}

describe('POST /api/ingest', () => {
  it('rejects a malformed envelope with 400', async () => {
    const app = await buildApp();
    const res = await post(app, { kind: 'step', runId: 'r', state: 'running' }); // missing envelopeVersion + stepKey
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('accepts a valid step envelope (202)', async () => {
    const app = await buildApp();
    const env: IngestEnvelope = {
      envelopeVersion: V, kind: 'step', runId: 'run_accept', stepKey: 'run_accept:gen', state: 'queued',
    };
    const res = await post(app, env);
    expect(res.statusCode).toBe(202);
    expect(res.json().deduped).toBe(false);
    await app.close();
  });

  it('dedupes a replayed (runId, stepKey, lifecycleState)', async () => {
    const app = await buildApp();
    const env: IngestEnvelope = {
      envelopeVersion: V, kind: 'step', runId: 'run_dedupe', stepKey: 'run_dedupe:gen', state: 'running',
    };
    const first = await post(app, env);
    expect(first.statusCode).toBe(202);
    expect(first.json().deduped).toBe(false);

    const second = await post(app, env); // identical → deduped
    expect(second.statusCode).toBe(200);
    expect(second.json().deduped).toBe(true);

    // A different state for the same step is NOT a dupe.
    const advanced = await post(app, { ...env, state: 'succeeded' });
    expect(advanced.statusCode).toBe(202);
    expect(advanced.json().deduped).toBe(false);

    await app.close();
  });

  it('folds a run into a single succeeded node via GET /api/runs/:runId/graph', async () => {
    const app = await buildApp();
    const runId = 'run_graph';
    const stepKey = `${runId}:gen`;
    await post(app, { envelopeVersion: V, kind: 'run.started', runId, producerSystem: 'image-engine', startedAt: 1 });
    await post(app, { envelopeVersion: V, kind: 'step', runId, stepKey, state: 'queued' });
    await post(app, { envelopeVersion: V, kind: 'step', runId, stepKey, state: 'running' });
    await post(app, { envelopeVersion: V, kind: 'step', runId, stepKey, state: 'succeeded' });
    await post(app, { envelopeVersion: V, kind: 'run.completed', runId, status: 'completed', completedAt: 9 });

    const res = await app.inject({ method: 'GET', url: `/api/runs/${runId}/graph` });
    expect(res.statusCode).toBe(200);
    const g = res.json();
    expect(g.runId).toBe(runId);
    expect(g.status).toBe('completed');
    expect(g.producerSystem).toBe('image-engine');
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].state).toBe('succeeded');
    await app.close();
  });
});
