// ─────────────────────────────────────────────────────────────────────────────
// normalizer — pure SDKMessage → CCEvent mapping, onto the Claude Code hook
// event names (Phase 4 table) so existing tooling/filters keep working.
//
//   system/init                         → SessionStart
//   assistant w/ tool_use block         → PreToolUse (+tool_name, tool_use_id, payload.tool_input)
//   assistant w/ text block             → Notification (full assistant text)
//   user w/ tool_result block           → PostToolUse | PostToolUseFailure (is_error)
//     …and for Bash tools                → also cc.command.executed (stdout/stderr)
//   stream_event (partial text delta)   → Notification (live typing)
//   result                              → Stop (+usage, total_cost_usd → cost_usd)
//
// One SDKMessage may yield several events (e.g. an assistant message with
// multiple tool_use blocks), so this returns an array. It is intentionally
// SIDE-EFFECT FREE — the session attaches session_id/agent_name and routes to
// the EventBus, and reads result usage for token:tick. Easy to unit-test.
// ─────────────────────────────────────────────────────────────────────────────

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { EventType } from '@command-center/shared';

/** A normalized event minus the session-scoped fields the session injects. */
export interface NormalizedEvent {
  hook_event_type: EventType;
  payload: Record<string, unknown>;
  tool_name?: string;
  tool_use_id?: string;
  summary?: string;
  model_name?: string;
  cost_usd?: number;
}

export interface NormalizeCtx {
  /** Resolve a tool_use_id back to its tool name/input (seeded from PreToolUse). */
  resolveTool?: (toolUseId: string) => { name: string; input?: unknown } | undefined;
}

// Minimal structural views of the Anthropic content blocks we care about. We
// avoid importing the heavy Beta types and narrow by `type` at runtime.
interface AnyBlock {
  type: string;
  [k: string]: unknown;
}

function blocksOf(content: unknown): AnyBlock[] {
  if (Array.isArray(content)) return content as AnyBlock[];
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return [];
}

function stringifyToolResult(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof c === 'string'
          ? c
          : c && typeof c === 'object' && (c as AnyBlock).type === 'text'
            ? String((c as AnyBlock).text ?? '')
            : JSON.stringify(c),
      )
      .join('\n');
  }
  if (content == null) return '';
  return JSON.stringify(content);
}

function truncate(s: string, n = 140): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function normalize(msg: SDKMessage, ctx: NormalizeCtx = {}): NormalizedEvent[] {
  switch (msg.type) {
    // ── system/init → SessionStart ────────────────────────────────────────────
    case 'system': {
      if (msg.subtype === 'init') {
        return [
          {
            hook_event_type: 'SessionStart',
            model_name: msg.model,
            summary: 'session started',
            payload: {
              model: msg.model,
              cwd: msg.cwd,
              tools: msg.tools,
              mcp_servers: msg.mcp_servers,
              permission_mode: msg.permissionMode,
              sdk_session_id: msg.session_id,
            },
          },
        ];
      }
      return [];
    }

    // ── assistant → PreToolUse (per tool_use) + Notification (text) ────────────
    case 'assistant': {
      const out: NormalizedEvent[] = [];
      const model = msg.message?.model;
      const blocks = blocksOf(msg.message?.content);
      const textParts: string[] = [];
      for (const block of blocks) {
        if (block.type === 'tool_use') {
          out.push({
            hook_event_type: 'PreToolUse',
            tool_name: String(block.name ?? ''),
            tool_use_id: String(block.id ?? ''),
            model_name: model,
            summary: `${block.name}`,
            payload: { tool_input: block.input ?? {} },
          });
        } else if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
          textParts.push(block.text);
        }
      }
      if (textParts.length > 0) {
        const text = textParts.join('');
        out.push({
          hook_event_type: 'Notification',
          model_name: model,
          summary: truncate(text),
          payload: { text, final: true },
        });
      }
      return out;
    }

    // ── user → PostToolUse / PostToolUseFailure (+ cc.command.executed) ────────
    case 'user': {
      const out: NormalizedEvent[] = [];
      const blocks = blocksOf((msg.message as { content?: unknown })?.content);
      for (const block of blocks) {
        if (block.type !== 'tool_result') continue;
        const toolUseId = String(block.tool_use_id ?? '');
        const resolved = ctx.resolveTool?.(toolUseId);
        const isError = block.is_error === true;
        const output = stringifyToolResult(block.content);
        out.push({
          hook_event_type: isError ? 'PostToolUseFailure' : 'PostToolUse',
          tool_name: resolved?.name,
          tool_use_id: toolUseId,
          summary: resolved?.name ? `${resolved.name} ${isError ? 'failed' : 'ok'}` : undefined,
          payload: { is_error: isError, output },
        });

        // Bash commands also surface as a terminal-output event.
        if (resolved?.name === 'Bash') {
          const command =
            resolved.input && typeof resolved.input === 'object'
              ? (resolved.input as { command?: string }).command
              : undefined;
          out.push({
            hook_event_type: 'cc.command.executed',
            tool_name: 'Bash',
            tool_use_id: toolUseId,
            summary: command ? truncate(command) : 'command',
            payload: {
              command,
              stdout: isError ? '' : output,
              stderr: isError ? output : '',
              exit_error: isError,
            },
          });
        }
      }
      return out;
    }

    // ── stream_event → Notification (live text delta) ─────────────────────────
    case 'stream_event': {
      const event = msg.event as { type?: string; delta?: { type?: string; text?: string } };
      if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const delta = event.delta.text ?? '';
        if (delta.length === 0) return [];
        return [
          {
            hook_event_type: 'Notification',
            payload: { delta, partial: true },
          },
        ];
      }
      return [];
    }

    // ── result → Stop (+usage/cost) ───────────────────────────────────────────
    case 'result': {
      const usage = msg.usage as
        | { input_tokens?: number; output_tokens?: number }
        | undefined;
      const modelName = Object.keys(msg.modelUsage ?? {})[0];
      return [
        {
          hook_event_type: 'Stop',
          model_name: modelName,
          cost_usd: msg.total_cost_usd,
          summary: msg.subtype === 'success' ? 'done' : `stopped: ${msg.subtype}`,
          payload: {
            subtype: msg.subtype,
            num_turns: msg.num_turns,
            is_error: msg.is_error,
            total_cost_usd: msg.total_cost_usd,
            result: msg.subtype === 'success' ? msg.result : undefined,
            usage: {
              input: usage?.input_tokens ?? 0,
              output: usage?.output_tokens ?? 0,
            },
          },
        },
      ];
    }

    default:
      return [];
  }
}
