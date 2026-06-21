// Spawn Tree — the pure, order-independent fold (slice #35).
// Pure contract tests: no DB, no server. Lives here because @command-center/shared
// has no test runner; imports the fold from the barrel.
import { test, expect, describe } from 'bun:test';
import {
  projectSpawnTree,
  type SpawnTreeNode,
  type AgentDescriptor,
  type CCEvent,
} from '@command-center/shared';

const NOW = 10_000;
const SID = 'sess_1';

function agent(over: Partial<AgentDescriptor> = {}): AgentDescriptor {
  return {
    session_id: SID,
    name: 'orchestrator',
    role: 'architect',
    model: 'claude-opus-4-8',
    state: 'running',
    cwd: '/repo',
    startedAt: 1_000,
    lastEventAt: 5_000,
    totals: { input: 0, output: 0, cost_usd: 0 },
    ...over,
  };
}

// Minimal tool event builder (Pre/Post).
function ev(over: Partial<CCEvent>): CCEvent {
  return {
    seq: 0,
    source_app: 'command-center',
    session_id: SID,
    hook_event_type: 'PreToolUse',
    payload: {},
    timestamp: 0,
    ...over,
  };
}

// A 3-level fixture: agent → Task(sub-agent) → Bash(tool).
//   Task tool_use: tu_task, Pre@1100 Post@1900  (runtime 800)
//   Bash tool_use: tu_bash, parent=tu_task, Pre@1200 Post@1500 (runtime 300)
function threeLevelEvents(): CCEvent[] {
  return [
    ev({ hook_event_type: 'PreToolUse', tool_name: 'Task', tool_use_id: 'tu_task', timestamp: 1100 }),
    ev({ hook_event_type: 'PostToolUse', tool_name: 'Task', tool_use_id: 'tu_task', timestamp: 1900 }),
    ev({ hook_event_type: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'tu_bash', parent_tool_use_id: 'tu_task', timestamp: 1200 }),
    ev({ hook_event_type: 'PostToolUse', tool_name: 'Bash', tool_use_id: 'tu_bash', parent_tool_use_id: 'tu_task', timestamp: 1500 }),
  ];
}

const TOKENS = { [SID]: { input: 120, output: 80, cost_usd: 0.42 } };

describe('projectSpawnTree', () => {
  test('builds a 3-level tree: agent → subagent → tool', () => {
    const tree = projectSpawnTree([agent()], threeLevelEvents(), TOKENS, NOW);

    expect(tree).toHaveLength(1);
    const root = tree[0]!;
    expect(root.kind).toBe('agent');
    expect(root.id).toBe(SID);

    expect(root.children).toHaveLength(1);
    const sub = root.children[0]!;
    expect(sub.kind).toBe('subagent');
    expect(sub.name).toBe('Task');
    expect(sub.id).toBe('tu_task');

    expect(sub.children).toHaveLength(1);
    const tool = sub.children[0]!;
    expect(tool.kind).toBe('tool');
    expect(tool.name).toBe('Bash');
    expect(tool.id).toBe('tu_bash');
    expect(tool.children).toHaveLength(0);
  });

  test('per-node runtime pairs PreToolUse/PostToolUse', () => {
    const tree = projectSpawnTree([agent({ state: 'done', lastEventAt: 5_000 })], threeLevelEvents(), TOKENS, NOW);
    const root = tree[0]!;
    const sub = root.children[0]!;
    const tool = sub.children[0]!;

    expect(sub.runtimeMs).toBe(800); // 1900 - 1100
    expect(tool.runtimeMs).toBe(300); // 1500 - 1200
    expect(root.runtimeMs).toBe(4_000); // 5000 - 1000 (terminal → lastEventAt)
  });

  test('rollup = own + Σ all descendants (runtime sums; tokens/cost from map)', () => {
    const tree = projectSpawnTree([agent({ state: 'done', lastEventAt: 5_000 })], threeLevelEvents(), TOKENS, NOW);
    const root = tree[0]!;
    const sub = root.children[0]!;
    const tool = sub.children[0]!;

    // tool: leaf → rollup == own
    expect(tool.rollup.runtimeMs).toBe(300);
    // subagent: own 800 + tool 300
    expect(sub.rollup.runtimeMs).toBe(1_100);
    // agent: own 4000 + 800 + 300
    expect(root.rollup.runtimeMs).toBe(5_100);

    // Tokens/cost are session-grain → only on the agent node, summed at root.
    expect(root.tokens).toEqual({ input: 120, output: 80 });
    expect(root.costUsd).toBeCloseTo(0.42);
    expect(root.rollup.tokens).toEqual({ input: 120, output: 80 });
    expect(root.rollup.costUsd).toBeCloseTo(0.42);
    // descendants contribute 0 tokens/cost
    expect(sub.rollup.tokens).toEqual({ input: 0, output: 0 });
    expect(sub.rollup.costUsd).toBe(0);
  });

  test('open tool (PreToolUse, no PostToolUse) → runtimeMs = now - start', () => {
    const events: CCEvent[] = [
      ev({ hook_event_type: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'tu_open', timestamp: 2_000 }),
    ];
    const tree = projectSpawnTree([agent()], events, TOKENS, NOW);
    const open = tree[0]!.children[0]!;
    expect(open.endedAt).toBeUndefined();
    expect(open.runtimeMs).toBe(NOW - 2_000); // 8000
  });

  test('running session (non-terminal) → runtime to now; endedAt undefined', () => {
    const tree = projectSpawnTree([agent({ state: 'running' })], [], TOKENS, NOW);
    const root = tree[0]!;
    expect(root.endedAt).toBeUndefined();
    expect(root.runtimeMs).toBe(NOW - 1_000); // 9000
  });

  test('shuffled events → DEEP-EQUAL tree (order-independence)', () => {
    const base = threeLevelEvents();
    const shuffled = [base[3]!, base[0]!, base[2]!, base[1]!]; // arbitrary reorder

    const a = projectSpawnTree([agent({ state: 'done' })], base, TOKENS, NOW);
    const b = projectSpawnTree([agent({ state: 'done' })], shuffled, TOKENS, NOW);
    expect(b).toEqual(a);
  });

  test('top-level tool with absent parent is a child of the session node', () => {
    const events: CCEvent[] = [
      ev({ hook_event_type: 'PreToolUse', tool_name: 'Read', tool_use_id: 'tu_read', timestamp: 1_300 }),
      ev({ hook_event_type: 'PostToolUse', tool_name: 'Read', tool_use_id: 'tu_read', timestamp: 1_400 }),
    ];
    const tree = projectSpawnTree([agent()], events, TOKENS, NOW);
    expect(tree[0]!.children.map((c: SpawnTreeNode) => c.id)).toEqual(['tu_read']);
  });

  test('children sorted by startedAt then id (deterministic)', () => {
    const events: CCEvent[] = [
      ev({ hook_event_type: 'PreToolUse', tool_name: 'Read', tool_use_id: 'tu_b', timestamp: 1_500 }),
      ev({ hook_event_type: 'PreToolUse', tool_name: 'Read', tool_use_id: 'tu_a', timestamp: 1_200 }),
    ];
    const tree = projectSpawnTree([agent()], events, TOKENS, NOW);
    expect(tree[0]!.children.map((c: SpawnTreeNode) => c.id)).toEqual(['tu_a', 'tu_b']);
  });
});
