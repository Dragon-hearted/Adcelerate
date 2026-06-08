// normalizer — pure SDKMessage → CCEvent mapping (no DB / no IO).
import { test, expect } from 'bun:test';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { normalize } from '../src/agents/normalizer';

const as = (m: unknown): SDKMessage => m as SDKMessage;

test('system/init → SessionStart with model + cwd', () => {
  const out = normalize(
    as({ type: 'system', subtype: 'init', model: 'claude-x', cwd: '/repo', tools: ['Bash'], mcp_servers: [], permissionMode: 'default', session_id: 's', uuid: 'u' }),
  );
  expect(out).toHaveLength(1);
  expect(out[0]!.hook_event_type).toBe('SessionStart');
  expect(out[0]!.model_name).toBe('claude-x');
  expect(out[0]!.payload.cwd).toBe('/repo');
});

test('assistant tool_use → PreToolUse; text → Notification', () => {
  const out = normalize(
    as({
      type: 'assistant',
      parent_tool_use_id: null,
      message: {
        model: 'claude-x',
        content: [
          { type: 'text', text: 'let me run that' },
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls -la' } },
        ],
      },
    }),
  );
  const pre = out.find((e) => e.hook_event_type === 'PreToolUse');
  const note = out.find((e) => e.hook_event_type === 'Notification');
  expect(pre).toBeDefined();
  expect(pre!.tool_name).toBe('Bash');
  expect(pre!.tool_use_id).toBe('tu_1');
  expect((pre!.payload.tool_input as { command: string }).command).toBe('ls -la');
  expect(note).toBeDefined();
  expect(note!.payload.text).toBe('let me run that');
});

test('user tool_result for Bash → PostToolUse + cc.command.executed', () => {
  const ctx = { resolveTool: (id: string) => (id === 'tu_1' ? { name: 'Bash', input: { command: 'ls -la' } } : undefined) };
  const out = normalize(
    as({
      type: 'user',
      parent_tool_use_id: null,
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'file1\nfile2', is_error: false }] },
    }),
    ctx,
  );
  const post = out.find((e) => e.hook_event_type === 'PostToolUse');
  const cmd = out.find((e) => e.hook_event_type === 'cc.command.executed');
  expect(post).toBeDefined();
  expect(post!.tool_name).toBe('Bash');
  expect(cmd).toBeDefined();
  expect(cmd!.payload.command).toBe('ls -la');
  expect(cmd!.payload.stdout).toBe('file1\nfile2');
  expect(cmd!.payload.stderr).toBe('');
});

test('failed tool_result → PostToolUseFailure with stderr on cc.command.executed', () => {
  const ctx = { resolveTool: () => ({ name: 'Bash', input: { command: 'bad' } }) };
  const out = normalize(
    as({ type: 'user', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_2', content: 'boom', is_error: true }] } }),
    ctx,
  );
  expect(out.find((e) => e.hook_event_type === 'PostToolUseFailure')).toBeDefined();
  const cmd = out.find((e) => e.hook_event_type === 'cc.command.executed');
  expect(cmd!.payload.stderr).toBe('boom');
  expect(cmd!.payload.stdout).toBe('');
});

test('stream_event text delta → Notification(partial)', () => {
  const out = normalize(as({ type: 'stream_event', parent_tool_use_id: null, event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } } }));
  expect(out).toHaveLength(1);
  expect(out[0]!.hook_event_type).toBe('Notification');
  expect(out[0]!.payload.delta).toBe('Hel');
  expect(out[0]!.payload.partial).toBe(true);
});

test('result success → Stop with cost + usage', () => {
  const out = normalize(
    as({ type: 'result', subtype: 'success', total_cost_usd: 0.0123, usage: { input_tokens: 10, output_tokens: 20 }, modelUsage: { 'claude-x': {} }, num_turns: 1, is_error: false, result: 'done', stop_reason: null, permission_denials: [] }),
  );
  expect(out).toHaveLength(1);
  expect(out[0]!.hook_event_type).toBe('Stop');
  expect(out[0]!.cost_usd).toBe(0.0123);
  expect((out[0]!.payload.usage as { input: number; output: number })).toEqual({ input: 10, output: 20 });
});
