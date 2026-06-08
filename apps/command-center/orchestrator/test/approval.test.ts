// Approval engine — canUseTool gate pauses the agent until respond(); the
// ApprovalBus resolves approve/deny/modify/answer and emits the lifecycle.
import { test, expect, beforeAll } from 'bun:test';
import type { CCEvent, ApprovalRequest } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { eventBus } from '../src/bus/event-bus';
import { approvalBus } from '../src/bus/approval-bus';
import { makeCanUseTool, requiresApproval } from '../src/agents/canUseTool';
import type { AgentSession } from '../src/agents/session';

beforeAll(() => {
  runMigrations();
});

// Minimal AgentSession stub — the gate only needs id, descriptor.name, setState.
function stubSession(id: string): AgentSession {
  const states: string[] = [];
  return {
    id,
    descriptor: { name: 'tester' },
    setState: (s: string) => states.push(s),
    _states: states,
  } as unknown as AgentSession;
}

const gateOpts = { signal: new AbortController().signal, toolUseID: 't', suggestions: undefined } as never;

function pendingFor(sessionId: string): ApprovalRequest {
  const req = approvalBus.list().find((r) => r.session_id === sessionId);
  if (!req) throw new Error('no pending approval for ' + sessionId);
  return req;
}

test('requiresApproval: risky tools gated, safe tools not', () => {
  expect(requiresApproval('Bash')).toBe(true);
  expect(requiresApproval('Write')).toBe(true);
  expect(requiresApproval('Edit')).toBe(true);
  expect(requiresApproval('WebFetch')).toBe(true);
  expect(requiresApproval('Read')).toBe(false);
  expect(requiresApproval('Grep')).toBe(false);
  expect(requiresApproval('mcp__human__ask_human')).toBe(false);
});

test('safe tool is auto-allowed without parking', async () => {
  const res = await makeCanUseTool(stubSession('s-read'))('Read', { file: 'a' }, gateOpts);
  expect(res).toEqual({ behavior: 'allow', updatedInput: { file: 'a' } });
});

test('Bash pauses until approve → allow with original input', async () => {
  const gate = makeCanUseTool(stubSession('s-approve'));
  const pending = gate('Bash', { command: 'ls' }, gateOpts);

  // The gate is parked: an approval is now pending.
  const req = pendingFor('s-approve');
  expect(req.kind).toBe('permission');
  expect(req.tool_name).toBe('Bash');

  const status = approvalBus.respond({ id: req.id, decision: 'approve', respondedAt: Date.now() });
  expect(status).toBe('approved');

  const res = await pending;
  expect(res).toEqual({ behavior: 'allow', updatedInput: { command: 'ls' } });
});

test('deny → behavior deny with message', async () => {
  const gate = makeCanUseTool(stubSession('s-deny'));
  const pending = gate('Bash', { command: 'rm -rf /' }, gateOpts);
  const req = pendingFor('s-deny');
  approvalBus.respond({ id: req.id, decision: 'deny', answer: 'absolutely not', respondedAt: Date.now() });
  const res = await pending;
  expect(res.behavior).toBe('deny');
  expect((res as { message: string }).message).toBe('absolutely not');
});

test('modify → allow with updated input', async () => {
  const gate = makeCanUseTool(stubSession('s-modify'));
  const pending = gate('Bash', { command: 'ls' }, gateOpts);
  const req = pendingFor('s-modify');
  approvalBus.respond({ id: req.id, decision: 'modify', updatedInput: { command: 'ls -la' }, respondedAt: Date.now() });
  const res = await pending;
  expect(res).toEqual({ behavior: 'allow', updatedInput: { command: 'ls -la' } });
});

test('question round-trip: answer flows back; lifecycle events emitted', async () => {
  const events: CCEvent[] = [];
  const off = eventBus.on((e) => events.push(e));

  const answered = approvalBus.request({
    id: 'q-1',
    session_id: 's-question',
    kind: 'question',
    question: 'Which DB?',
    createdAt: Date.now(),
    status: 'pending',
  });
  // The card is surfaced; answer it.
  const status = approvalBus.respond({ id: 'q-1', decision: 'answer', answer: 'sqlite', respondedAt: Date.now() });
  expect(status).toBe('answered');
  const decision = await answered;
  expect(decision.answer).toBe('sqlite');

  off();
  const types = events.filter((e) => e.session_id === 's-question').map((e) => e.hook_event_type);
  expect(types).toContain('cc.question.asked');
  expect(types).toContain('cc.question.answered');
});

test('unknown id → respond throws 404', () => {
  expect(() => approvalBus.respond({ id: 'nope', decision: 'approve', respondedAt: Date.now() })).toThrow();
});

test('timeout auto-resolves a permission as deny', async () => {
  const pending = approvalBus.request({
    id: 'to-1',
    session_id: 's-timeout',
    kind: 'permission',
    tool_name: 'Bash',
    tool_input: { command: 'sleep' },
    createdAt: Date.now(),
    timeoutMs: 30,
    status: 'pending',
  });
  const decision = await pending;
  expect(decision.decision).toBe('deny');
  expect(decision.respondedBy).toBe('system(timeout)');
});
