// ─────────────────────────────────────────────────────────────────────────────
// TEST — Board projection fold (#36 / ADR-0025).
//
// `projectBoard` is a PURE, ORDER-INDEPENDENT fold: Board metadata + Run
// memberships + each member's StepGraph → BoardProjection. It groups memberships
// by `(producerSystem, slotId)` so two Runs of the SAME slot stack in one Board
// position (latest startedAt first), and is byte-stable under a shuffled input.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, describe } from 'bun:test';
import {
  CURRENT_ENVELOPE_VERSION as V,
  projectBoard,
  type StepGraph,
} from '@command-center/shared';

const META = { boardId: 'board_1', title: 'Demo Board', createdAt: 1000 };

/** Minimal fake StepGraph — only the fields the Board fold reads/carries. */
function graph(runId: string, producerSystem: string, startedAt: number): StepGraph {
  return {
    envelopeVersion: V,
    runId,
    producerSystem,
    startedAt,
    nodes: [],
    edges: [],
  };
}

describe('projectBoard — slot merge by (producerSystem, slotId)', () => {
  test('two runs in the same slot → one slot, two runs stacked (latest startedAt first)', () => {
    const g1 = graph('run_a', 'image-engine', 10);
    const g2 = graph('run_b', 'image-engine', 20);
    const memberships = [
      { runId: 'run_a', producerSystem: 'image-engine', slotId: 'hero' },
      { runId: 'run_b', producerSystem: 'image-engine', slotId: 'hero' },
    ];
    const proj = projectBoard(META, memberships, { run_a: g1, run_b: g2 });

    expect(proj.slots).toHaveLength(1);
    expect(proj.slots[0]!.slotId).toBe('hero');
    expect(proj.slots[0]!.producerSystem).toBe('image-engine');
    // Latest startedAt first: run_b (20) before run_a (10).
    expect(proj.slots[0]!.runs.map((r) => r.runId)).toEqual(['run_b', 'run_a']);
  });

  test('equal startedAt → deterministic tiebreak by runId ascending', () => {
    const g1 = graph('run_z', 'image-engine', 5);
    const g2 = graph('run_a', 'image-engine', 5);
    const memberships = [
      { runId: 'run_z', producerSystem: 'image-engine', slotId: 'hero' },
      { runId: 'run_a', producerSystem: 'image-engine', slotId: 'hero' },
    ];
    const proj = projectBoard(META, memberships, { run_z: g1, run_a: g2 });
    expect(proj.slots[0]!.runs.map((r) => r.runId)).toEqual(['run_a', 'run_z']);
  });

  test('different slotId → two separate slots (sorted by slotId)', () => {
    const g1 = graph('run_a', 'image-engine', 10);
    const g2 = graph('run_b', 'image-engine', 20);
    const memberships = [
      { runId: 'run_b', producerSystem: 'image-engine', slotId: 'second' },
      { runId: 'run_a', producerSystem: 'image-engine', slotId: 'first' },
    ];
    const proj = projectBoard(META, memberships, { run_a: g1, run_b: g2 });

    expect(proj.slots).toHaveLength(2);
    expect(proj.slots.map((s) => s.slotId)).toEqual(['first', 'second']);
    expect(proj.slots[0]!.runs.map((r) => r.runId)).toEqual(['run_a']);
    expect(proj.slots[1]!.runs.map((r) => r.runId)).toEqual(['run_b']);
  });

  test('membership whose runId is absent from runGraphs → excluded (board-less)', () => {
    const g1 = graph('run_a', 'image-engine', 10);
    const memberships = [
      { runId: 'run_a', producerSystem: 'image-engine', slotId: 'hero' },
      { runId: 'run_ghost', producerSystem: 'image-engine', slotId: 'hero' },
    ];
    const proj = projectBoard(META, memberships, { run_a: g1 });

    expect(proj.slots).toHaveLength(1);
    expect(proj.slots[0]!.runs.map((r) => r.runId)).toEqual(['run_a']);
  });

  test('carries board metadata through verbatim', () => {
    const proj = projectBoard(META, [], {});
    expect(proj.boardId).toBe('board_1');
    expect(proj.title).toBe('Demo Board');
    expect(proj.createdAt).toBe(1000);
    expect(proj.slots).toEqual([]);
  });
});

describe('projectBoard — order independence', () => {
  test('shuffled memberships yield a deep-equal projection', () => {
    const runGraphs: Record<string, StepGraph> = {
      run_a: graph('run_a', 'image-engine', 10),
      run_b: graph('run_b', 'image-engine', 20),
      run_c: graph('run_c', 'scene-board', 30),
      run_d: graph('run_d', 'scene-board', 15),
    };
    const memberships = [
      { runId: 'run_a', producerSystem: 'image-engine', slotId: 'hero' },
      { runId: 'run_b', producerSystem: 'image-engine', slotId: 'hero' },
      { runId: 'run_c', producerSystem: 'scene-board', slotId: 'opening' },
      { runId: 'run_d', producerSystem: 'scene-board', slotId: 'opening' },
    ];

    const reference = projectBoard(META, memberships, runGraphs);
    const reversed = projectBoard(META, [...memberships].reverse(), runGraphs);
    const rotated = projectBoard(
      META,
      [...memberships.slice(2), ...memberships.slice(0, 2)],
      runGraphs,
    );

    expect(reversed).toEqual(reference);
    expect(rotated).toEqual(reference);

    // Sanity on the reference shape: two slots, each with its two runs latest-first.
    expect(reference.slots.map((s) => s.slotId)).toEqual(['hero', 'opening']);
    expect(reference.slots[0]!.runs.map((r) => r.runId)).toEqual(['run_b', 'run_a']);
    expect(reference.slots[1]!.runs.map((r) => r.runId)).toEqual(['run_c', 'run_d']);
  });
});
