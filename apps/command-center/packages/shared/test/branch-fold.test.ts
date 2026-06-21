// Branch / Lineage fold — the BRAIN of slice #41. Pure contract tests: no DB, no
// server. Exercises the five pinned ponytail decisions (events.ts comment + the
// substrate fold): no-branches-table (events ARE the substrate), human-sticky
// active (ADR-0015 §2), overlays-not-lifecycle-states, flag-not-cascade, and the
// generation-tag-is-ordering comparison.
import { test, expect, describe } from 'bun:test';
import {
  projectBranches,
  projectStepGraph,
  staleDownstream,
  diffSlots,
  branchIdOf,
  rootBranchId,
  type CCEvent,
  type IngestEnvelope,
} from '../src/index';

const RUN = 'run_branch';
const STEP_A = `${RUN}:plan`;
const STEP_B = `${RUN}:render`;
const STEP_C = `${RUN}:publish`;

// CCEvent factory — only the fields the fold reads matter; the rest are filler.
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
  opts: { parentBranchId?: string | null; provenance?: 'agent' | 'human'; payload?: { ref?: string; text?: string } } = {},
) =>
  ev('cc.branch.created', {
    runId: RUN,
    stepKey,
    branchId,
    parentBranchId: opts.parentBranchId ?? null,
    provenance: opts.provenance ?? 'agent',
    ...(opts.payload ? { payload: opts.payload } : {}),
  });

const activated = (stepKey: string, branchId: string, provenance: 'agent' | 'human', generation: number) =>
  ev('cc.branch.activated', { runId: RUN, stepKey, branchId, provenance, generation });

const staled = (stepKey: string, branchId?: string, orphaned?: boolean) =>
  ev('cc.branch.staled', { runId: RUN, stepKey, ...(branchId ? { branchId } : {}), ...(orphaned ? { orphaned } : {}) });

describe('projectBranches — lineage tree (#41, ADR-0005)', () => {
  test('lineage tree is built from created events via parentBranchId', () => {
    // root (agent) → fork b1 (human) → fork b2 (human): a 3-deep lineage chain.
    const events = [
      created(STEP_A, 'b0', { parentBranchId: null, provenance: 'agent' }),
      created(STEP_A, 'b1', { parentBranchId: 'b0', provenance: 'human', payload: { text: 'edit one' } }),
      created(STEP_A, 'b2', { parentBranchId: 'b1', provenance: 'human', payload: { ref: 'img://x' } }),
    ];
    const proj = projectBranches(events);
    expect(proj.runId).toBe(RUN);
    const step = proj.steps[STEP_A]!;
    expect(step.branches.map((b) => b.branchId)).toEqual(['b0', 'b1', 'b2']);
    // Parent pointers ARE the tree — reconstructable from the flat list.
    expect(step.branches.map((b) => b.parentBranchId)).toEqual([null, 'b0', 'b1']);
    expect(step.branches.map((b) => b.provenance)).toEqual(['agent', 'human', 'human']);
    expect(step.branches[1]!.payload).toEqual({ text: 'edit one' });
    expect(step.branches[2]!.payload).toEqual({ ref: 'img://x' });
    // No activation events → active falls back to the parentless root branch.
    expect(step.activeBranchId).toBe('b0');
    expect(step.branches.find((b) => b.active)!.branchId).toBe('b0');
  });

  test('fold is order-independent under a shuffled log', () => {
    const a = created(STEP_A, 'b0', { parentBranchId: null });
    const b = created(STEP_A, 'b1', { parentBranchId: 'b0', provenance: 'human' });
    const c = activated(STEP_A, 'b1', 'human', 5);
    const inOrder = projectBranches([a, b, c]);
    const shuffled = projectBranches([c, a, b]);
    expect(shuffled).toEqual(inOrder);
  });
});

describe('projectBranches — human-sticky active pointer (ADR-0015 §2)', () => {
  test('a human pick SURVIVES a later agent (cascade) activate', () => {
    // human edits/activates B at gen 5; a cascade tagged with the upstream edit's
    // gen 2 then tries to re-activate the regenerated agent branch C → must NOT win.
    const events = [
      created(STEP_A, 'b0', { parentBranchId: null, provenance: 'agent' }),
      created(STEP_A, 'bH', { parentBranchId: 'b0', provenance: 'human' }),
      activated(STEP_A, 'bH', 'human', 5),
      created(STEP_A, 'bC', { parentBranchId: 'b0', provenance: 'agent' }),
      activated(STEP_A, 'bC', 'agent', 2), // cascade carries the triggering edit's generation
    ];
    const proj = projectBranches(events);
    expect(proj.steps[STEP_A]!.activeBranchId).toBe('bH');
    // The regenerated agent branch STILL lands in lineage — just non-active.
    expect(proj.steps[STEP_A]!.branches.map((b) => b.branchId)).toContain('bC');
    expect(proj.steps[STEP_A]!.branches.find((b) => b.branchId === 'bC')!.active).toBe(false);
  });

  test('human stickiness holds REGARDLESS of arrival order', () => {
    const human = activated(STEP_A, 'bH', 'human', 5);
    const cascade = activated(STEP_A, 'bC', 'agent', 2);
    const base = [created(STEP_A, 'bH', { parentBranchId: null, provenance: 'human' }), created(STEP_A, 'bC', { parentBranchId: null, provenance: 'agent' })];
    expect(projectBranches([...base, human, cascade]).steps[STEP_A]!.activeBranchId).toBe('bH');
    expect(projectBranches([...base, cascade, human]).steps[STEP_A]!.activeBranchId).toBe('bH');
  });

  test('an agent activate WINS when there is no human pick', () => {
    const events = [
      created(STEP_A, 'b0', { parentBranchId: null, provenance: 'agent' }),
      created(STEP_A, 'bC', { parentBranchId: 'b0', provenance: 'agent' }),
      activated(STEP_A, 'bC', 'agent', 2),
    ];
    expect(projectBranches(events).steps[STEP_A]!.activeBranchId).toBe('bC');
  });

  test('a genuinely NEWER agent activate (gen > human watermark) wins', () => {
    // generation-tag-is-ordering: a cascade from an edit NEWER than the human pick
    // (gen 7 > 5) is not stale — it legitimately advances the active pointer.
    const events = [
      created(STEP_A, 'bH', { parentBranchId: null, provenance: 'human' }),
      activated(STEP_A, 'bH', 'human', 5),
      created(STEP_A, 'bC', { parentBranchId: 'bH', provenance: 'agent' }),
      activated(STEP_A, 'bC', 'agent', 7),
    ];
    expect(projectBranches(events).steps[STEP_A]!.activeBranchId).toBe('bC');
  });
});

describe('staleDownstream + projectBranches — stale propagation (#34 deps)', () => {
  test('stale propagates TRANSITIVELY along declared deps', () => {
    // A → B → C (B deps A, C deps B). Editing A stales {B, C}, not A.
    const edges = [
      { from: STEP_A, to: STEP_B },
      { from: STEP_B, to: STEP_C },
    ];
    const stale = staleDownstream(edges, [STEP_A]);
    expect([...stale].sort()).toEqual([STEP_B, STEP_C].sort());
    expect(stale.has(STEP_A)).toBe(false); // the edited source is not stale itself
  });

  test('staled events mark the active branch stale in the projection', () => {
    const events = [
      created(STEP_B, 'b0', { parentBranchId: null, provenance: 'agent' }),
      created(STEP_C, 'c0', { parentBranchId: null, provenance: 'agent' }),
      // control plane computed downstream via staleDownstream → emits staled events
      staled(STEP_B, 'b0'),
      staled(STEP_C, 'c0'),
    ];
    const proj = projectBranches(events);
    expect(proj.steps[STEP_B]!.branches[0]!.stale).toBe(true);
    expect(proj.steps[STEP_C]!.branches[0]!.stale).toBe(true);
  });

  test('a staled event without an explicit branchId stales the ACTIVE branch', () => {
    const events = [
      created(STEP_B, 'b0', { parentBranchId: null, provenance: 'agent' }),
      created(STEP_B, 'b1', { parentBranchId: 'b0', provenance: 'human' }),
      activated(STEP_B, 'b1', 'human', 3),
      staled(STEP_B), // no branchId → resolves to the active branch (b1)
    ];
    const proj = projectBranches(events);
    expect(proj.steps[STEP_B]!.branches.find((b) => b.branchId === 'b1')!.stale).toBe(true);
    expect(proj.steps[STEP_B]!.branches.find((b) => b.branchId === 'b0')!.stale).toBe(false);
  });
});

describe('orphaned — re-plan drops a slot (ADR-0018, PRESERVED)', () => {
  test('a staled event with orphaned:true records the stepKey, never deletes it', () => {
    const events = [
      created(STEP_C, 'c0', { parentBranchId: null, provenance: 'agent' }),
      staled(STEP_C, undefined, true),
    ];
    const proj = projectBranches(events);
    expect(proj.orphanedStepKeys).toEqual([STEP_C]);
    // PRESERVED — the branch list is intact, the step is not stale, just orphaned.
    expect(proj.steps[STEP_C]!.branches[0]!.branchId).toBe('c0');
    expect(proj.steps[STEP_C]!.branches[0]!.stale).toBe(false);
  });
});

describe('diffSlots — re-plan slot diff (ADR-0018)', () => {
  test('classifies kept / added / orphaned', () => {
    const d = diffSlots(['s1', 's2', 's3'], ['s2', 's3', 's4']);
    expect(d.kept).toEqual(['s2', 's3']);
    expect(d.added).toEqual(['s4']);
    expect(d.orphaned).toEqual(['s1']);
  });

  test('is order-independent and de-duplicated', () => {
    const d = diffSlots(['s3', 's1', 's1', 's2'], ['s2', 's2', 's3']);
    expect(d.kept).toEqual(['s2', 's3']);
    expect(d.added).toEqual([]);
    expect(d.orphaned).toEqual(['s1']);
  });
});

describe('projectStepGraph — derived overlay stamping (#41)', () => {
  const V = '1.1.0' as const;
  const steps: IngestEnvelope[] = [
    { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP_A, state: 'succeeded' },
    { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP_B, state: 'succeeded', deps: [STEP_A] },
    { envelopeVersion: V, kind: 'step', runId: RUN, stepKey: STEP_C, state: 'succeeded', deps: [STEP_B] },
  ];

  test('no overlays arg → unchanged projection (composable, opt-in)', () => {
    const g = projectStepGraph(steps);
    expect(g.nodes.every((n) => n.stale === undefined && n.orphaned === undefined)).toBe(true);
  });

  test('stale/orphaned overlays stamp matching nodes WITHOUT touching lifecycle state', () => {
    const stale = staleDownstream(g0Edges(), [STEP_A]); // {B, C}
    const g = projectStepGraph(steps, { stale, orphaned: [STEP_C] });
    const byKey = Object.fromEntries(g.nodes.map((n) => [n.stepKey, n]));
    expect(byKey[STEP_A]!.stale).toBeUndefined(); // edited source — not stale
    expect(byKey[STEP_B]!.stale).toBe(true);
    expect(byKey[STEP_C]!.stale).toBe(true);
    expect(byKey[STEP_C]!.orphaned).toBe(true);
    // overlays sit ON TOP of the lifecycle state — never replace it.
    expect(byKey[STEP_C]!.state).toBe('succeeded');
  });

  function g0Edges() {
    return projectStepGraph(steps).edges;
  }
});

describe('branchIdOf — retired stub, real root resolution (#41)', () => {
  test('dedupe grain resolves to the step root branch (root === stepKey)', () => {
    expect(rootBranchId(STEP_A)).toBe(STEP_A);
    expect(branchIdOf(STEP_A)).toBe(rootBranchId(STEP_A));
  });
});
