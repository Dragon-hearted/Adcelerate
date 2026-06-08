// AgentSession — end-to-end emission via a scripted fake query() stream.
// Validates the acceptance criterion: a prompt drives SessionStart→…→Stop over
// the EventBus, plus a token:tick from the result usage — no live Claude auth.
import { test, expect, beforeAll } from 'bun:test';
import type { SDKMessage, Query } from '@anthropic-ai/claude-agent-sdk';
import type { CCEvent, TokenTick } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { eventBus } from '../src/bus/event-bus';
import { AgentSession, type QueryFn } from '../src/agents/session';

beforeAll(() => {
  runMigrations();
});

const msg = (m: unknown): SDKMessage => m as SDKMessage;

// A fake query() that waits for the first user turn, then emits a scripted
// system/init → assistant(text) → result stream and ends.
const fakeQuery: QueryFn = ({ prompt }) => {
  const gen = (async function* () {
    // Block until the session pushes the first user message.
    for await (const _turn of prompt as AsyncIterable<unknown>) {
      void _turn;
      break;
    }
    yield msg({ type: 'system', subtype: 'init', model: 'claude-test', cwd: '/repo', tools: [], mcp_servers: [], permissionMode: 'default', session_id: 'sdk', uuid: 'u1' });
    yield msg({ type: 'assistant', parent_tool_use_id: null, message: { model: 'claude-test', content: [{ type: 'text', text: 'hi!' }] }, uuid: 'u2', session_id: 'sdk' });
    yield msg({ type: 'result', subtype: 'success', total_cost_usd: 0.002, usage: { input_tokens: 3, output_tokens: 4 }, modelUsage: { 'claude-test': {} }, num_turns: 1, is_error: false, result: 'hi!', stop_reason: null, permission_denials: [] });
  })();
  (gen as unknown as { interrupt: () => Promise<void> }).interrupt = async () => {};
  return gen as unknown as Query;
};

test('prompt drives SessionStart → Stop and emits token:tick', async () => {
  const events: CCEvent[] = [];
  const ticks: TokenTick[] = [];
  const offEvt = eventBus.on((e) => events.push(e));
  const offTick = eventBus.onTokenTick((t) => ticks.push(t));

  const session = new AgentSession(
    { name: 'smoke', role: 'generalist', model: 'claude-test', cwd: '/repo' },
    { queryFn: fakeQuery },
  );
  await session.start();
  session.prompt('say hi');
  await session.done();

  offEvt();
  offTick();

  const mine = events.filter((e) => e.session_id === session.id);
  const types = mine.map((e) => e.hook_event_type);

  // Lifecycle + SDK-derived events all present.
  expect(types).toContain('cc.prompt.submitted');
  expect(types).toContain('UserPromptSubmit');
  expect(types).toContain('SessionStart');
  expect(types).toContain('Notification');
  expect(types).toContain('Stop');

  // SDK lifecycle ordering: SessionStart precedes Stop.
  const sdkTypes = types.filter((t) => t === 'SessionStart' || t === 'Stop');
  expect(sdkTypes[0]).toBe('SessionStart');
  expect(sdkTypes[sdkTypes.length - 1]).toBe('Stop');

  // Per-session seq is strictly increasing.
  const seqs = mine.map((e) => e.seq);
  for (let i = 1; i < seqs.length; i++) expect(seqs[i]!).toBeGreaterThan(seqs[i - 1]!);

  // token:tick fast path from the result usage.
  const tick = ticks.find((t) => t.session_id === session.id);
  expect(tick).toBeDefined();
  expect(tick!.input).toBe(3);
  expect(tick!.output).toBe(4);
  expect(tick!.cost_usd).toBe(0.002);

  // Terminal state after the stream ends.
  expect(session.state).toBe('done');
  expect(session.descriptor.totals.cost_usd).toBeCloseTo(0.002);
});

test('stop() interrupts and closes a running session', async () => {
  // A query that never emits until the queue closes.
  const idleQuery: QueryFn = ({ prompt }) => {
    const gen = (async function* () {
      for await (const _ of prompt as AsyncIterable<unknown>) void _;
    })();
    (gen as unknown as { interrupt: () => Promise<void> }).interrupt = async () => {};
    return gen as unknown as Query;
  };
  const session = new AgentSession({ name: 'stoppable', role: 'generalist', model: 'claude-test', cwd: '/repo' }, { queryFn: idleQuery });
  await session.start();
  expect(session.state).toBe('running');
  await session.stop();
  expect(['stopping', 'done']).toContain(session.state);
});
