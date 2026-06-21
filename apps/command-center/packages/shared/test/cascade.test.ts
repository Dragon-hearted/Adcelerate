// Cascade preview + blocked-upstream — the BRAIN of slice #42. Pure contract
// tests: no DB, no server. Exercises the pinned ponytail decisions — provenance-
// aware target set (human-active excluded, ADR-0003/0015), count/threshold honesty
// (ADR-0016), and the DERIVED blocked-upstream view state (emits nothing, ADR-0009).
import { test, expect, describe } from 'bun:test';
import {
  projectStepGraph,
  projectBranches,
  cascadePreview,
  blockedUpstreamStepKeys,
  ENVELOPE_VERSION,
  type CCEvent,
  type IngestEnvelope,
  type StepState,
} from '../src/index';

const RUN = 'run_cascade';
const A = `${RUN}:plan`;
const B = `${RUN}:render`;
const C = `${RUN}:publish`;

// Minimal step envelope — only the fields the fold reads (edges come from `deps`).
function step(stepKey: string, state: StepState, deps: string[] = []): IngestEnvelope {
  return {
    envelopeVersion: ENVELOPE_VERSION,
    kind: 'step',
    runId: RUN,
    stepKey,
    state,
    ...(deps.length ? { deps } : {}),
  } as IngestEnvelope;
}

// CCEvent factory for cc.branch.* — mirrors branch-fold.test.ts.
let SEQ = 0;
function ev(type: CCEvent['hook_event_type'], payload: Record<string, unknown>): CCEvent {
  SEQ += 1;
  return {
    seq: SEQ,
    source_app: 'command-center',
    session_id: 'ctrl',
    hook_event_type: type,
    payload,
    timestamp: 1000 + SEQ,
  };
}
const created = (
  stepKey: string,
  branchId: string,
  opts: { parentBranchId?: string | null; provenance?: 'agent' | 'human' } = {},
) =>
  ev('cc.branch.created', {
    runId: RUN,
    stepKey,
    branchId,
    parentBranchId: opts.parentBranchId ?? null,
    provenance: opts.provenance ?? 'agent',
  });
const activated = (stepKey: string, branchId: string, provenance: 'agent' | 'human', generation: number) =>
  ev('cc.branch.activated', { runId: RUN, stepKey, branchId, provenance, generation });

describe('cascadePreview — provenance-aware target set (#42, ADR-0003/0015)', () => {
  // A → B → C declared-dep chain. Edit A ⇒ staleDownstream = {B, C}.
  const graph = projectStepGraph([
    step(A, 'succeeded'),
    step(B, 'succeeded', [A]),
    step(C, 'succeeded', [B]),
  ]);

  test('human-active downstream is EXCLUDED from targets, left in excludedHumanStepKeys', () => {
    // B: agent root only. C: human fork activated → C is human-active (sticky).
    const branchProj = projectBranches([
      created(B, `${B}#root`),
      created(C, `${C}#root`),
      created(C, `${C}#human`, { parentBranchId: `${C}#root`, provenance: 'human' }),
      activated(C, `${C}#human`, 'human', 1),
    ]);

    const preview = cascadePreview(graph, branchProj, A);
    expect(preview.targets.map((t) => t.stepKey)).toEqual([B]);
    expect(preview.excludedHumanStepKeys).toEqual([C]);
    // count === targets.length (the pinned invariant) and the edited source is itself excluded.
    expect(preview.count).toBe(preview.targets.length);
    expect(preview.count).toBe(1);
    expect(preview.editedStepKey).toBe(A);
    // target carries the resolved stage segment.
    expect(preview.targets[0]).toEqual({ stepKey: B, stage: 'render' });
  });

  test('count === targets.length for an all-agent downstream; threshold passes through', () => {
    // No human edits anywhere → both downstream steps are agent-authored targets.
    const branchProj = projectBranches([created(B, `${B}#root`), created(C, `${C}#root`)]);

    const preview = cascadePreview(graph, branchProj, A);
    expect(preview.targets.map((t) => t.stepKey).sort()).toEqual([B, C].sort());
    expect(preview.excludedHumanStepKeys).toEqual([]);
    expect(preview.count).toBe(preview.targets.length);
    expect(preview.count).toBe(2);
    // threshold is honest passthrough: default 2, and any explicit value is echoed (UI gates on it).
    expect(preview.threshold).toBe(2);
    expect(cascadePreview(graph, branchProj, A, 5).threshold).toBe(5);
  });

  test('absent branch entry defaults to agent (Emitter steps carry only the agent root)', () => {
    // No cc.branch.* events at all → every downstream step is an agent target.
    const preview = cascadePreview(graph, projectBranches([]), A);
    expect(preview.targets.map((t) => t.stepKey).sort()).toEqual([B, C].sort());
    expect(preview.excludedHumanStepKeys).toEqual([]);
  });
});

describe('blockedUpstreamStepKeys — derived view state (#42, ADR-0009/0016 §4)', () => {
  test('queued node behind a FAILED upstream is blocked (transitively); behind SUCCEEDED is not', () => {
    // Chain: A(failed) → B(queued) → C(queued). Separate: D(succeeded) → E(queued).
    const D = `${RUN}:fetch`;
    const E = `${RUN}:crop`;
    const graph = projectStepGraph([
      step(A, 'failed'),
      step(B, 'queued', [A]),
      step(C, 'queued', [B]),
      step(D, 'succeeded'),
      step(E, 'queued', [D]),
    ]);

    const blocked = blockedUpstreamStepKeys(graph);
    // B directly + C transitively behind the failed A.
    expect(blocked.has(B)).toBe(true);
    expect(blocked.has(C)).toBe(true);
    // E is queued but its upstream succeeded → NOT blocked.
    expect(blocked.has(E)).toBe(false);
    // The failed node itself is not "queued" → never in the set.
    expect(blocked.has(A)).toBe(false);
    expect([...blocked].sort()).toEqual([B, C].sort());
  });
});
