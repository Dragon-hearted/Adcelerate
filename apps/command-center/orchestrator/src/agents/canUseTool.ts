// ─────────────────────────────────────────────────────────────────────────────
// canUseTool — the SDK permission gate. For a risky tool it flips the session to
// `awaiting_approval`, parks on the ApprovalBus (pausing the agent in-process),
// and returns a PermissionResult only once the operator responds:
//
//   deny    → { behavior: 'deny',  message }
//   modify  → { behavior: 'allow', updatedInput }     (SDK has no 'modify' arm)
//   approve → { behavior: 'allow', updatedInput: input }
//
// #43: the gate predicate is now the shared `classifyEffect` effect-class
// (read / spend / irreversible) rather than a local tool-identity set — a
// FORMALIZATION, not a loosening: `read` (Read/Grep/Glob/LS) auto-allows exactly
// as before, while `irreversible`/`spend` and any unknown tool gate (fail-safe).
// The raised ApprovalRequest carries `effectClass` + `reason` for the Canvas
// overlay/ghost-node linkage (#43 web).
//
// seam: session-death re-arm (ADR-0024 §4) — re-arming this in-memory park after a
// session restart is a deferred follow-on; the approval events are already durable
// on the log, so nothing is lost, only the in-proc wait would need re-attaching.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import { classifyEffect } from '@command-center/shared';
import type { AgentSession } from './session';
import { approvalBus } from '../bus/approval-bus';

// The MCP `ask_human` tool has its OWN human round-trip and must never be gated by
// a permission prompt (it would double-prompt / deadlock). It is auto-allowed
// regardless of its fail-safe effect class.
const ASK_HUMAN_TOOL = 'mcp__human__ask_human';

/**
 * Does this tool invocation need an approval gate? `read` (and the ask_human MCP
 * tool) auto-allow; everything else — `irreversible`, `spend`, and any unknown
 * tool (fail-safe) — gates. Thin wrapper over the shared `classifyEffect`.
 */
export function requiresApproval(toolName: string, input?: unknown): boolean {
  if (toolName === ASK_HUMAN_TOOL) return false;
  return classifyEffect(toolName, input) !== 'read';
}

export function makeCanUseTool(session: AgentSession): CanUseTool {
  return async (toolName, input, options): Promise<PermissionResult> => {
    if (!requiresApproval(toolName, input)) {
      return { behavior: 'allow', updatedInput: input };
    }

    const effectClass = classifyEffect(toolName, input);
    const reason = `${toolName} is ${effectClass} — requires approval`;

    session.setState('awaiting_approval');
    const decision = await approvalBus.request({
      id: randomUUID(),
      session_id: session.id,
      agent_name: session.descriptor.name,
      kind: 'permission',
      tool_name: toolName,
      tool_input: input,
      effectClass,
      reason,
      suggestions: options.suggestions,
      createdAt: Date.now(),
      status: 'pending',
    });
    // Approval flow done — resume (no-op if the agent was meanwhile stopped).
    session.setState('running');

    if (decision.decision === 'deny') {
      return { behavior: 'deny', message: decision.answer || 'Denied by operator' };
    }
    if (decision.decision === 'modify') {
      const updatedInput =
        decision.updatedInput && typeof decision.updatedInput === 'object'
          ? (decision.updatedInput as Record<string, unknown>)
          : input;
      return { behavior: 'allow', updatedInput };
    }
    // approve (or any other affirmative) → allow with the original input.
    return { behavior: 'allow', updatedInput: input };
  };
}
