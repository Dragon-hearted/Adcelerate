// SessionRegistry — concurrent named agents, isolated token totals, role
// presets, duplicate-name guard, mediated cc.agent.message routing, and
// deterministic replay ordering.
import { test, expect, beforeAll } from 'bun:test';
import type { SDKMessage, Query } from '@anthropic-ai/claude-agent-sdk';
import type { CCEvent } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { eventBus } from '../src/bus/event-bus';
import { SessionRegistry, ROLE_PRESETS } from '../src/agents/registry';
import type { QueryFn } from '../src/agents/session';

beforeAll(() => {
  runMigrations();
});

const m = (x: unknown): SDKMessage => x as SDKMessage;

// Fake query: waits for the first prompt, emits init→assistant→result(usage), ends.
function makeFake(input: number, output: number, cost: number): QueryFn {
  return ({ prompt }) => {
    const gen = (async function* () {
      for await (const _ of prompt as AsyncIterable<unknown>) {
        void _;
        break;
      }
      yield m({ type: 'system', subtype: 'init', model: 'claude-test', cwd: '/r', tools: [], mcp_servers: [], permissionMode: 'default', session_id: 'x', uuid: 'u' });
      yield m({ type: 'assistant', parent_tool_use_id: null, message: { model: 'claude-test', content: [{ type: 'text', text: 'ok' }] }, uuid: 'u', session_id: 'x' });
      yield m({ type: 'result', subtype: 'success', total_cost_usd: cost, usage: { input_tokens: input, output_tokens: output }, modelUsage: { 'claude-test': {} }, num_turns: 1, is_error: false, result: 'ok', stop_reason: null, permission_denials: [] });
    })();
    (gen as unknown as { interrupt: () => Promise<void> }).interrupt = async () => {};
    return gen as unknown as Query;
  };
}

test('two named agents run concurrently with independent state machines', async () => {
  const reg = new SessionRegistry();
  reg.setAgentHooks({ queryFn: makeFake(1, 1, 0) });
  const a = await reg.create({ name: 'architect-1', role: 'architect' });
  const b = await reg.create({ name: 'backend-1', role: 'backend' });
  expect(a.session_id).not.toBe(b.session_id);
  expect(reg.activeCount()).toBe(2);
  expect(reg.list().map((d) => d.name).sort()).toEqual(['architect-1', 'backend-1']);
});

test('role presets are defined for every role', () => {
  for (const role of ['architect', 'backend', 'frontend', 'qa', 'reviewer', 'generalist'] as const) {
    expect(typeof ROLE_PRESETS[role]).toBe('string');
    expect(ROLE_PRESETS[role].length).toBeGreaterThan(10);
  }
});

test('token totals are isolated per agent', async () => {
  const reg = new SessionRegistry();
  reg.setAgentHooks({ queryFn: makeFake(10, 20, 0.05) });
  const a = await reg.create({ name: 'a-iso', role: 'generalist' });
  const b = await reg.create({ name: 'b-iso', role: 'generalist' });

  reg.prompt(a.session_id, 'go');
  await reg.get(a.session_id)!.done();

  // A accrued the result usage; B untouched.
  expect(reg.get(a.session_id)!.descriptor.totals).toEqual({ input: 10, output: 20, cost_usd: 0.05 });
  expect(reg.get(b.session_id)!.descriptor.totals).toEqual({ input: 0, output: 0, cost_usd: 0 });
  expect(reg.get(a.session_id)!.state).toBe('done');
  expect(reg.get(b.session_id)!.state).toBe('running');
});

test('duplicate active name is rejected (409)', async () => {
  const reg = new SessionRegistry();
  reg.setAgentHooks({ queryFn: makeFake(1, 1, 0) });
  await reg.create({ name: 'dup', role: 'generalist' });
  await expect(reg.create({ name: 'dup', role: 'generalist' })).rejects.toThrow(/already exists/);
});

test('mediated cc.agent.message routes to recipient and delivers a prompt', async () => {
  const reg = new SessionRegistry();
  reg.setAgentHooks({ queryFn: makeFake(1, 1, 0) });
  const a = await reg.create({ name: 'sender', role: 'architect' });
  const b = await reg.create({ name: 'receiver', role: 'backend' });

  const seen: CCEvent[] = [];
  const off = eventBus.on((e) => seen.push(e));
  reg.sendAgentMessage(a.session_id, 'receiver', 'please implement the API');
  off();

  const msgEvt = seen.find((e) => e.hook_event_type === 'cc.agent.message' && e.session_id === b.session_id);
  expect(msgEvt).toBeDefined();
  expect((msgEvt!.payload as { from_name: string }).from_name).toBe('sender');
  expect((msgEvt!.payload as { content: string }).content).toBe('please implement the API');

  // Recipient also received a prompt turn → its fake stream advances to Stop.
  await reg.get(b.session_id)!.done();
  expect(reg.get(b.session_id)!.state).toBe('done');
});

test('sendAgentMessage to unknown agent throws 404', async () => {
  const reg = new SessionRegistry();
  reg.setAgentHooks({ queryFn: makeFake(1, 1, 0) });
  const a = await reg.create({ name: 'solo', role: 'generalist' });
  expect(() => reg.sendAgentMessage(a.session_id, 'ghost', 'hi')).toThrow(/No active agent/);
});
