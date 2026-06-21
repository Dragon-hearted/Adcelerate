// #35 Spawn Tree — orchestrator capture. Proves the in-process pipeline forwards
// the SDK's message-level `parent_tool_use_id` TOP-LEVEL onto the emitted +
// persisted CCEvents, so the shared `projectSpawnTree` fold can nest a
// sub-agent's tool-calls under the spawning `Task` tool_use.
//
// Scripted stream: root agent emits a `Task` tool_use → a nested sub-agent (its
// messages carry `parent_tool_use_id = <Task id>`) runs a `Read` tool → both
// tools' results come back. We assert the Pre/Post events carry the right parent.
import { test, expect, beforeAll } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { SDKMessage, Query } from '@anthropic-ai/claude-agent-sdk';
import type { CCEvent, AgentDescriptor } from '@command-center/shared';
import { projectSpawnTree } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { db } from '../src/db/client';
import { events } from '../src/db/schema';
import { rowToEvent } from '../src/db/mappers';
import { eventBus } from '../src/bus/event-bus';
import { AgentSession, type QueryFn } from '../src/agents/session';

beforeAll(() => {
  runMigrations();
});

const msg = (m: unknown): SDKMessage => m as SDKMessage;

const TASK_ID = 'tu_task';
const READ_ID = 'tu_read';

// Root agent spawns a Task; the Task's sub-agent runs a Read; both finish.
const spawnQuery: QueryFn = ({ prompt }) => {
  const gen = (async function* () {
    for await (const _turn of prompt as AsyncIterable<unknown>) {
      void _turn;
      break;
    }
    yield msg({ type: 'system', subtype: 'init', model: 'claude-test', cwd: '/repo', tools: [], mcp_servers: [], permissionMode: 'default', session_id: 'sdk', uuid: 'u1' });
    // Root agent calls Task (no parent → top-level under the session).
    yield msg({ type: 'assistant', parent_tool_use_id: null, message: { model: 'claude-test', content: [{ type: 'tool_use', id: TASK_ID, name: 'Task', input: { description: 'spawn' } }] }, uuid: 'u2', session_id: 'sdk' });
    // Nested sub-agent calls Read — its messages carry the spawning Task's id.
    yield msg({ type: 'assistant', parent_tool_use_id: TASK_ID, message: { model: 'claude-test', content: [{ type: 'tool_use', id: READ_ID, name: 'Read', input: { file_path: '/x' } }] }, uuid: 'u3', session_id: 'sdk' });
    // Nested Read result (still under the Task).
    yield msg({ type: 'user', parent_tool_use_id: TASK_ID, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: READ_ID, is_error: false, content: 'file body' }] }, uuid: 'u4', session_id: 'sdk' });
    // Task result back to the root agent (top-level).
    yield msg({ type: 'user', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: TASK_ID, is_error: false, content: 'done' }] }, uuid: 'u5', session_id: 'sdk' });
    yield msg({ type: 'result', subtype: 'success', total_cost_usd: 0.01, usage: { input_tokens: 5, output_tokens: 6 }, modelUsage: { 'claude-test': {} }, num_turns: 1, is_error: false, result: 'ok', stop_reason: null, permission_denials: [] });
  })();
  (gen as unknown as { interrupt: () => Promise<void> }).interrupt = async () => {};
  return gen as unknown as Query;
};

test('parent_tool_use_id flows top-level onto emitted + persisted CCEvents and nests in the fold', async () => {
  const seen: CCEvent[] = [];
  const off = eventBus.on((e) => seen.push(e));

  const session = new AgentSession(
    { name: 'spawner', role: 'generalist', model: 'claude-test', cwd: '/repo' },
    { queryFn: spawnQuery },
  );
  await session.start();
  session.prompt('go');
  await session.done();
  off();

  const mine = seen.filter((e) => e.session_id === session.id);
  const pre = (tuid: string) =>
    mine.find((e) => e.hook_event_type === 'PreToolUse' && e.tool_use_id === tuid);
  const post = (tuid: string) =>
    mine.find((e) => e.hook_event_type === 'PostToolUse' && e.tool_use_id === tuid);

  // ── Emitted (broadcast) CCEvents carry parent_tool_use_id TOP-LEVEL ──────────
  // Root Task tool_use → no parent (top-level child of the session).
  expect(pre(TASK_ID)).toBeDefined();
  expect(pre(TASK_ID)!.parent_tool_use_id).toBeNull();
  expect(post(TASK_ID)!.parent_tool_use_id).toBeNull();

  // Nested Read tool_use → parent is the spawning Task.
  expect(pre(READ_ID)).toBeDefined();
  expect(pre(READ_ID)!.parent_tool_use_id).toBe(TASK_ID);
  expect(post(READ_ID)!.parent_tool_use_id).toBe(TASK_ID);

  // ── Persisted round-trip: the events column survives replay top-level ────────
  const rows = db.select().from(events).where(eq(events.sessionId, session.id)).all();
  const replayed = rows.map(rowToEvent);
  const readPre = replayed.find((e) => e.hook_event_type === 'PreToolUse' && e.tool_use_id === READ_ID);
  expect(readPre?.parent_tool_use_id).toBe(TASK_ID);

  // ── Contract check: the shared fold nests Read UNDER Task UNDER the session ──
  const descriptor: AgentDescriptor = {
    session_id: session.id,
    name: 'spawner',
    role: 'generalist',
    model: 'claude-test',
    state: session.state,
    cwd: '/repo',
    startedAt: session.descriptor.startedAt,
    lastEventAt: session.descriptor.lastEventAt,
    totals: session.descriptor.totals,
  };
  const tree = projectSpawnTree([descriptor], mine, {}, Date.now());
  const root = tree.find((n) => n.id === session.id);
  expect(root).toBeDefined();
  const taskNode = root!.children.find((c) => c.id === TASK_ID);
  expect(taskNode).toBeDefined();
  expect(taskNode!.kind).toBe('subagent');
  const readNode = taskNode!.children.find((c) => c.id === READ_ID);
  expect(readNode).toBeDefined();
  expect(readNode!.kind).toBe('tool');
});
