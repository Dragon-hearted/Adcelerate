// ─────────────────────────────────────────────────────────────────────────────
// /api/branches — Console-as-control-plane Branch/Lineage editing (slice #41).
//
// Proves the editing model end-to-end over the route surface (NOT the pure folds —
// those are unit-tested in packages/shared):
//   • fork → a fresh HUMAN Branch is minted, the original PRESERVED, declared-
//     downstream Steps go Stale (overlay on the StepGraph, deps-transitive).
//   • activate is HUMAN-STICKY: a LATER agent activation (lower generation) does
//     NOT clobber the human pick.
//   • re-plan orphans ONLY the dropped slots; stable slots keep their Branches.
//   • a reopened Run re-folds its control events back to the same active Branch
//     (event-sourced replay restore — no branches table).
//
// Runs against the in-memory DB (CC_DB_PATH=:memory:) via `bun run test`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import type { IngestEnvelope } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { ingestRoutes } from '../src/routes/ingest';
import { branchRoutes } from '../src/routes/branches';
import { eventBus } from '../src/bus/event-bus';

const V = '1.0' as const;

beforeAll(() => {
  runMigrations();
});

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(ingestRoutes);
  await app.register(branchRoutes);
  await app.ready();
  return app;
}

function ingest(app: FastifyInstance, env: IngestEnvelope) {
  return app.inject({ method: 'POST', url: '/api/ingest', payload: env as object });
}

/** Seed a Run with a linear DAG a → b → c (declared `deps`), all succeeded. */
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

function getBranches(app: FastifyInstance, runId: string) {
  return app.inject({ method: 'GET', url: `/api/runs/${runId}/branches` });
}

function getGraph(app: FastifyInstance, runId: string) {
  return app.inject({ method: 'GET', url: `/api/runs/${runId}/graph` });
}

describe('POST /api/branches — fork', () => {
  it('mints a fresh HUMAN Branch, becomes active, stales declared-downstream Steps', async () => {
    const app = await buildApp();
    const runId = 'run_fork';
    const { a, b, c } = await seedChain(app, runId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/branches',
      payload: { runId, stepKey: a, payload: { text: 'edited prompt' } },
    });
    expect(res.statusCode).toBe(200);
    const branchId: string = res.json().branchId;
    expect(typeof branchId).toBe('string');
    expect(branchId).not.toBe(a); // a FRESH id, not the root (== stepKey)

    // The Branch is human, active, carries the edit payload; original PRESERVED.
    const proj = (await getBranches(app, runId)).json();
    const step = proj.steps[a];
    expect(step.activeBranchId).toBe(branchId);
    const forked = step.branches.find((x: { branchId: string }) => x.branchId === branchId);
    expect(forked.provenance).toBe('human');
    expect(forked.active).toBe(true);
    expect(forked.parentBranchId).toBe(a); // parent = the root branch (rootBranchId === stepKey)
    expect(forked.payload).toEqual({ text: 'edited prompt' });

    // Declared-downstream Steps (b, c) go Stale — the edited Step (a) does NOT.
    const graph = (await getGraph(app, runId)).json();
    const node = (k: string) => graph.nodes.find((n: { stepKey: string }) => n.stepKey === k);
    expect(node(a).stale).toBeUndefined();
    expect(node(b).stale).toBe(true);
    expect(node(c).stale).toBe(true);
    // Stale is an OVERLAY — the lifecycle state is PRESERVED (succeeded), not deleted.
    expect(node(b).state).toBe('succeeded');
    expect(graph.nodes).toHaveLength(3);

    await app.close();
  });

  it('broadcasts branch:update on fork', async () => {
    const app = await buildApp();
    const runId = 'run_fork_bcast';
    const { a } = await seedChain(app, runId);

    let pushed: { runId: string } | null = null;
    const off = eventBus.onBranchUpdate((p) => { pushed = p; });
    await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: a } });
    off();

    expect(pushed).not.toBeNull();
    expect(pushed!.runId).toBe(runId);
    await app.close();
  });
});

describe('POST /api/branches/:id/activate — human-sticky', () => {
  it('a LATER agent activation (lower generation) does NOT clobber the human pick', async () => {
    const app = await buildApp();
    const runId = 'run_sticky';
    const { a } = await seedChain(app, runId);

    // Human forks → human Branch H is active.
    const fork = await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: a } });
    const humanBranchId: string = fork.json().branchId;
    expect((await getBranches(app, runId)).json().steps[a].activeBranchId).toBe(humanBranchId);

    // Simulate a LATER #42-style agent cascade: it lands AFTER the human pick in
    // ingest order, but carries the (lower) triggering-edit generation. Human wins.
    eventBus.emit({
      session_id: runId,
      hook_event_type: 'cc.branch.created',
      payload: { runId, stepKey: a, branchId: 'agent_regen', parentBranchId: a, provenance: 'agent', createdAt: 2 },
    });
    eventBus.emit({
      session_id: runId,
      hook_event_type: 'cc.branch.activated',
      payload: { runId, stepKey: a, branchId: 'agent_regen', provenance: 'agent', generation: 0 },
    });

    const proj = (await getBranches(app, runId)).json();
    expect(proj.steps[a].activeBranchId).toBe(humanBranchId); // sticky — human survives
    // The agent branch still LANDS in lineage (preserved), just non-active.
    expect(proj.steps[a].branches.map((b: { branchId: string }) => b.branchId)).toContain('agent_regen');
    expect(proj.steps[a].branches.find((b: { branchId: string }) => b.branchId === 'agent_regen').active).toBe(false);

    await app.close();
  });

  it('a human activate switches the active pointer to an existing Branch', async () => {
    const app = await buildApp();
    const runId = 'run_activate';
    const { a } = await seedChain(app, runId);

    const h1 = (await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: a } })).json().branchId;
    const h2 = (await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: a } })).json().branchId;
    // The most recent fork is active.
    expect((await getBranches(app, runId)).json().steps[a].activeBranchId).toBe(h2);

    // Re-activate the earlier Branch explicitly.
    const res = await app.inject({ method: 'POST', url: `/api/branches/${h1}/activate`, payload: { runId, stepKey: a } });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect((await getBranches(app, runId)).json().steps[a].activeBranchId).toBe(h1);

    await app.close();
  });
});

describe('POST /api/runs/:runId/replan — slot diff', () => {
  it('orphans ONLY the dropped slots; stable slots keep their Branches', async () => {
    const app = await buildApp();
    const runId = 'run_replan';
    const { a, b, c } = await seedChain(app, runId);

    // Fork b so it carries a human Branch — a STABLE slot must keep it across re-plan.
    const bBranch = (await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: b } })).json().branchId;

    // Re-plan to keep {a, b}, drop {c}.
    const res = await app.inject({ method: 'POST', url: `/api/runs/${runId}/replan`, payload: { slotIds: [a, b] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().orphaned).toEqual([c]); // only the dropped slot

    // Projection: c is orphaned; b's Branch is PRESERVED (stable slot kept its fork).
    const proj = (await getBranches(app, runId)).json();
    expect(proj.orphanedStepKeys).toEqual([c]);
    expect(proj.steps[b].activeBranchId).toBe(bBranch);

    // StepGraph: c greyed via `orphaned` overlay; a/b NOT orphaned; nothing deleted.
    const graph = (await getGraph(app, runId)).json();
    const node = (k: string) => graph.nodes.find((n: { stepKey: string }) => n.stepKey === k);
    expect(node(c).orphaned).toBe(true);
    expect(node(c).state).toBe('succeeded'); // PRESERVED, never deleted
    expect(node(a).orphaned).toBeUndefined();
    expect(node(b).orphaned).toBeUndefined();
    expect(graph.nodes).toHaveLength(3);

    await app.close();
  });

  it('rejects a missing slotIds with 400', async () => {
    const app = await buildApp();
    const runId = 'run_replan_bad';
    await seedChain(app, runId);
    const res = await app.inject({ method: 'POST', url: `/api/runs/${runId}/replan`, payload: {} });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('replay restore — event-sourced, no branches table', () => {
  it('a reopened Run folds its control events back to the same active Branch', async () => {
    const app = await buildApp();
    const runId = 'run_replay';
    const { a } = await seedChain(app, runId);

    const branchId = (await app.inject({ method: 'POST', url: '/api/branches', payload: { runId, stepKey: a, payload: { ref: 'img_42' } } })).json().branchId;

    // A FRESH app instance over the SAME persisted log (simulates a Board reopen):
    // the active pointer + lineage are re-derived purely from `cc.branch.*` events.
    const reopened = await buildApp();
    const proj = (await getBranches(reopened, runId)).json();
    expect(proj.steps[a].activeBranchId).toBe(branchId);
    const restored = proj.steps[a].branches.find((b: { branchId: string }) => b.branchId === branchId);
    expect(restored.provenance).toBe('human');
    expect(restored.payload).toEqual({ ref: 'img_42' });

    await app.close();
    await reopened.close();
  });
});
