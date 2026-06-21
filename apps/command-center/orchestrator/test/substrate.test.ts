// Substrate — the pure Step-Graph fold + the ingest dedupe key (slice #31).
// Pure contract tests: no DB, no server.
import { test, expect, describe } from 'bun:test';
import {
  projectStepGraph,
  dedupeKeyOf,
  type IngestEnvelope,
} from '@command-center/shared';

const V = '1.0' as const;
const RUN = 'run_abc';
const STEP = `${RUN}:generate`;

describe('projectStepGraph', () => {
  test('queued → running → succeeded folds to ONE succeeded node', () => {
    const events: IngestEnvelope[] = [
      { envelopeVersion: V, kind: 'run.started', runId: RUN, producerSystem: 'image-engine', startedAt: 1 },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'queued' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'running' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'succeeded' },
      { envelopeVersion: V, kind: 'run.completed', runId: RUN, status: 'completed', completedAt: 9 },
    ];
    const g = projectStepGraph(events);
    expect(g.runId).toBe(RUN);
    expect(g.producerSystem).toBe('image-engine');
    expect(g.status).toBe('completed');
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0]!.state).toBe('succeeded');
    expect(g.nodes[0]!.stage).toBe('generate');
    expect(g.edges).toHaveLength(0);
  });

  test('multiple steps with NO declared deps → nodes but ZERO edges (#34)', () => {
    const a = `${RUN}:plan`;
    const b = `${RUN}:render`;
    const g = projectStepGraph([
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'succeeded' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: b, state: 'running' },
    ]);
    expect(g.nodes.map((n) => n.stepKey)).toEqual([a, b]);
    // No emission-order spine anymore — edges reflect declared deps only (ADR-0008).
    expect(g.edges).toEqual([]);
  });

  test('declared deps → dependency edges { from: dep, to: stepKey } (#34)', () => {
    const a = `${RUN}:plan`;
    const b = `${RUN}:render`;
    const g = projectStepGraph([
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'succeeded' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: b, state: 'running', deps: [a] },
    ]);
    expect(g.edges).toEqual([{ from: a, to: b }]);
  });

  test('dep pointing at an unknown node is filtered out (#34)', () => {
    const a = `${RUN}:plan`;
    const ghost = `${RUN}:never-seen`;
    const g = projectStepGraph([
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'succeeded', deps: [ghost] },
    ]);
    expect(g.nodes.map((n) => n.stepKey)).toEqual([a]);
    expect(g.edges).toEqual([]);
  });

  test('dep union across a branch + deterministic (from, to) sort (#34)', () => {
    const a = `${RUN}:a`;
    const b = `${RUN}:b`;
    const c = `${RUN}:c`;
    // c depends on a (declared on its queued event) and b (declared on running).
    const g = projectStepGraph([
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'succeeded' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: b, state: 'succeeded' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: c, state: 'queued', deps: [a] },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: c, state: 'running', deps: [b] },
    ]);
    expect(g.edges).toEqual([
      { from: a, to: c },
      { from: b, to: c },
    ]);
  });

  test('shuffled event order → DEEP-EQUAL graph incl. edges (#34)', () => {
    const a = `${RUN}:a`;
    const b = `${RUN}:b`;
    const c = `${RUN}:c`;
    const log: IngestEnvelope[] = [
      { envelopeVersion: V, kind: 'run.started', runId: RUN, producerSystem: 'image-engine', startedAt: 1 },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'queued' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: a, state: 'succeeded' },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: b, state: 'running', deps: [a] },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: b, state: 'succeeded', deps: [a] },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: c, state: 'running', deps: [a, b] },
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: c, state: 'succeeded', deps: [a, b] },
      { envelopeVersion: V, kind: 'run.completed', runId: RUN, status: 'completed', completedAt: 9 },
    ];
    const reference = projectStepGraph(log);
    expect(reference.edges).toEqual([
      { from: a, to: b },
      { from: a, to: c },
      { from: b, to: c },
    ]);
    // Reversed and rotated arrival both converge to the SAME graph (edges incl.).
    expect(projectStepGraph([...log].reverse())).toEqual(reference);
    expect(projectStepGraph([...log.slice(4), ...log.slice(0, 4)])).toEqual(reference);
  });

  test('latest artifact is retained on the node', () => {
    const g = projectStepGraph([
      { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'running' },
      {
        envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'succeeded',
        artifact: { url: 'file:///out.png', mimeType: 'image/png' },
      },
    ]);
    expect(g.nodes[0]!.artifact).toEqual({ url: 'file:///out.png', mimeType: 'image/png' });
  });

  test('empty input → empty graph', () => {
    const g = projectStepGraph([]);
    expect(g.runId).toBe('');
    expect(g.nodes).toHaveLength(0);
  });
});

describe('dedupeKeyOf', () => {
  test('step key is (branchId=stepKey, state, retryAttempt)', () => {
    expect(
      dedupeKeyOf({ envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'running' }),
    ).toBe(`${STEP}::running::0`);
    // retryAttempt is part of the identity — a retry is NOT a duplicate.
    expect(
      dedupeKeyOf({ envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'running', retryAttempt: 1 }),
    ).toBe(`${STEP}::running::1`);
  });

  test('run.started and run.completed fold onto the run sentinel with run state', () => {
    expect(
      dedupeKeyOf({ envelopeVersion: V, kind: 'run.started', runId: RUN, producerSystem: 'x', startedAt: 1 }),
    ).toBe(`${RUN}::__run__::started`);
    expect(
      dedupeKeyOf({ envelopeVersion: V, kind: 'run.completed', runId: RUN, status: 'failed', completedAt: 2 }),
    ).toBe(`${RUN}::__run__::failed`);
  });

  test('same step in different states yields distinct keys (state is part of identity)', () => {
    const queued = dedupeKeyOf({ envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'queued' });
    const running = dedupeKeyOf({ envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP, state: 'running' });
    expect(queued).not.toBe(running);
  });
});
