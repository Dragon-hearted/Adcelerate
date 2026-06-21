// ─────────────────────────────────────────────────────────────────────────────
// TEST SEAM 1 — idempotent, order-tolerant ingest fold (slice #32 / ADR-0019).
//
// The fold must be a MONOTONIC per-branch max over the lifecycle order
//   queued(0) → running(1)=retrying(1) → succeeded(2)=failed(2)
// keyed for dedupe on (branchId=stepKey, state, retryAttempt). Proven by feeding
// adversarial logs (shuffled / duplicated / retried / terminal-before-running)
// and asserting the projection converges byte-identically to the clean log.
//
// Run against an in-memory DB (CC_DB_PATH=:memory:, see package.json "test").
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, describe, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  CURRENT_ENVELOPE_VERSION as V,
  projectStepGraph,
  dedupeKeyOf,
  stateRank,
  type IngestEnvelope,
  type StepState,
  type RunStatus,
} from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { ingestRoutes } from '../src/routes/ingest';

let app: FastifyInstance;

beforeAll(async () => {
  runMigrations();
  app = Fastify();
  await app.register(ingestRoutes);
  await app.ready();
});

const ART = { url: 'file:///a.png', mimeType: 'image/png' } as const;

function rs(runId: string): IngestEnvelope {
  return { envelopeVersion: V, kind: 'run.started', runId, producerSystem: 'image-engine', startedAt: 1 };
}
function rc(runId: string, status: RunStatus): IngestEnvelope {
  return { envelopeVersion: V, kind: 'run.completed', runId, status, completedAt: 9 };
}
function step(
  runId: string,
  stepKey: string,
  state: StepState,
  opts: { retryAttempt?: number; artifact?: typeof ART } = {},
): IngestEnvelope {
  return {
    envelopeVersion: V,
    kind: 'step',
    runId,
    stepKey,
    state,
    ...(opts.retryAttempt !== undefined ? { retryAttempt: opts.retryAttempt } : {}),
    ...(opts.artifact ? { artifact: opts.artifact } : {}),
  };
}

/** A clean, in-order, two-step run: A succeeds (with artifact), B fails → partial. */
function cleanLog(runId: string): IngestEnvelope[] {
  const A = `${runId}:a`;
  const B = `${runId}:b`;
  return [
    rs(runId),
    step(runId, A, 'queued'),
    step(runId, A, 'running'),
    step(runId, A, 'succeeded', { artifact: ART }),
    step(runId, B, 'queued'),
    step(runId, B, 'running'),
    step(runId, B, 'failed'),
    rc(runId, 'completed-with-failures'),
  ];
}

// Deterministic adversarial transforms (no RNG — keeps the suite reproducible).
const reverse = (log: IngestEnvelope[]) => [...log].reverse();
const rotate = (log: IngestEnvelope[], k: number) => [...log.slice(k), ...log.slice(0, k)];
const duplicateEach = (log: IngestEnvelope[]) => log.flatMap((e) => [e, e]);

describe('seam 1 — monotonic fold converges (pure)', () => {
  const RUN = 'run_seam1';
  const reference = projectStepGraph(cleanLog(RUN));

  test('clean log → A succeeded(+artifact), B failed, status partial', () => {
    expect(reference.status).toBe('completed-with-failures');
    expect(reference.nodes.map((n) => n.stepKey)).toEqual([`${RUN}:a`, `${RUN}:b`]);
    const a = reference.nodes.find((n) => n.stepKey === `${RUN}:a`)!;
    const b = reference.nodes.find((n) => n.stepKey === `${RUN}:b`)!;
    expect(a.state).toBe('succeeded');
    expect(a.artifact).toEqual(ART);
    expect(b.state).toBe('failed');
    expect(a.malformed).toBeUndefined();
    expect(b.malformed).toBeUndefined();
  });

  const variants: Array<[string, IngestEnvelope[]]> = [
    ['reversed', reverse(cleanLog(RUN))],
    ['rotated', rotate(cleanLog(RUN), 3)],
    ['duplicated', duplicateEach(cleanLog(RUN))],
    ['duplicated+reversed', reverse(duplicateEach(cleanLog(RUN)))],
    ['terminal-before-progress', [
      // succeeded/failed arrive BEFORE queued/running for both steps.
      rc(RUN, 'completed-with-failures'),
      step(RUN, `${RUN}:a`, 'succeeded', { artifact: ART }),
      step(RUN, `${RUN}:b`, 'failed'),
      step(RUN, `${RUN}:a`, 'running'),
      step(RUN, `${RUN}:b`, 'running'),
      step(RUN, `${RUN}:a`, 'queued'),
      step(RUN, `${RUN}:b`, 'queued'),
      rs(RUN),
    ]],
  ];

  for (const [name, log] of variants) {
    test(`${name} log projects byte-identically to clean`, () => {
      expect(projectStepGraph(log)).toEqual(reference);
    });
  }
});

describe('seam 1 — retry is not a duplicate; latest attempt wins', () => {
  const RUN = 'run_retry';
  const S = `${RUN}:gen`;
  // Attempt 0 fails, then a retry attempt 1 succeeds → final state succeeded.
  const retryLog: IngestEnvelope[] = [
    rs(RUN),
    step(RUN, S, 'queued', { retryAttempt: 0 }),
    step(RUN, S, 'running', { retryAttempt: 0 }),
    step(RUN, S, 'failed', { retryAttempt: 0 }),
    step(RUN, S, 'retrying', { retryAttempt: 1 }),
    step(RUN, S, 'running', { retryAttempt: 1 }),
    step(RUN, S, 'succeeded', { retryAttempt: 1, artifact: ART }),
    rc(RUN, 'completed'),
  ];

  test('final state is the retry terminal (succeeded), regardless of order', () => {
    const ref = projectStepGraph(retryLog);
    expect(ref.nodes).toHaveLength(1);
    expect(ref.nodes[0]!.state).toBe('succeeded');
    expect(ref.nodes[0]!.malformed).toBeUndefined();
    // Shuffles converge to the same node state.
    expect(projectStepGraph(reverse(retryLog))).toEqual(ref);
    expect(projectStepGraph(duplicateEach(retryLog))).toEqual(ref);
  });

  test('retry event (same state, new attempt) has a distinct dedupe key', () => {
    const a0 = dedupeKeyOf(step(RUN, S, 'running', { retryAttempt: 0 }));
    const a1 = dedupeKeyOf(step(RUN, S, 'running', { retryAttempt: 1 }));
    expect(a0).not.toBe(a1);
    // A true duplicate (same attempt) collapses.
    expect(dedupeKeyOf(step(RUN, S, 'running', { retryAttempt: 0 }))).toBe(a0);
  });
});

describe('seam 1 — terminal-only step is flagged malformed (≥2 lifecycle events)', () => {
  const RUN = 'run_malformed';
  test('a step that only emits a terminal event → node.malformed', () => {
    const g = projectStepGraph([
      rs(RUN),
      step(RUN, `${RUN}:only`, 'succeeded', { artifact: ART }),
      rc(RUN, 'completed'),
    ]);
    expect(g.nodes[0]!.malformed).toBe(true);
  });

  test('a later-arriving queued/running clears malformed (order-tolerant)', () => {
    const terminalFirst = projectStepGraph([
      step(RUN, `${RUN}:x`, 'succeeded'),
      step(RUN, `${RUN}:x`, 'running'),
      step(RUN, `${RUN}:x`, 'queued'),
    ]);
    expect(terminalFirst.nodes[0]!.state).toBe('succeeded');
    expect(terminalFirst.nodes[0]!.malformed).toBeUndefined();
  });
});

describe('seam 1 — state rank is the lifecycle total order', () => {
  test('terminal > progress > queued; retrying ties running', () => {
    expect(stateRank('queued')).toBe(0);
    expect(stateRank('running')).toBe(1);
    expect(stateRank('retrying')).toBe(1);
    expect(stateRank('succeeded')).toBe(2);
    expect(stateRank('failed')).toBe(2);
  });
});

describe('seam 1 — end-to-end: shuffled+duplicated log → same graph as clean (route)', () => {
  function post(payload: unknown) {
    return app.inject({
      method: 'POST',
      url: '/api/ingest',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(payload),
    });
  }

  test('replay a shuffled+duplicated log; GET graph == clean projection', async () => {
    const RUN = 'run_e2e';
    const adversarial = reverse(duplicateEach(cleanLog(RUN)));
    for (const env of adversarial) {
      const res = await post(env);
      // Each is either accepted (202) or an idempotent dedupe (200) — never 4xx.
      expect([200, 202]).toContain(res.statusCode);
    }
    const res = await app.inject({ method: 'GET', url: `/api/runs/${RUN}/graph` });
    expect(res.statusCode).toBe(200);
    // Byte-identical to the clean-log projection for the same runId.
    expect(res.json()).toEqual(projectStepGraph(cleanLog(RUN)));
  });

  test('duplicate (same attempt) dedupes 200; retry (new attempt) accepts 202', async () => {
    const RUN = 'run_dedupe_vs_retry';
    const S = `${RUN}:gen`;
    expect((await post(step(RUN, S, 'running', { retryAttempt: 0 }))).statusCode).toBe(202);
    const dup = await post(step(RUN, S, 'running', { retryAttempt: 0 }));
    expect(dup.statusCode).toBe(200);
    expect(dup.json().deduped).toBe(true);
    const retry = await post(step(RUN, S, 'running', { retryAttempt: 1 }));
    expect(retry.statusCode).toBe(202);
    expect(retry.json().deduped).toBe(false);
  });
});
