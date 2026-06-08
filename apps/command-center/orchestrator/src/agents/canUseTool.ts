// ─────────────────────────────────────────────────────────────────────────────
// canUseTool — the SDK permission gate. For a risky tool it flips the session to
// `awaiting_approval`, parks on the ApprovalBus (pausing the agent in-process),
// and returns a PermissionResult only once the operator responds:
//
//   deny    → { behavior: 'deny',  message }
//   modify  → { behavior: 'allow', updatedInput }     (SDK has no 'modify' arm)
//   approve → { behavior: 'allow', updatedInput: input }
//
// Default-risky tools (Bash, file writes, network) require approval; everything
// else (Read/Grep/Glob/the ask_human MCP tool, …) is auto-allowed so we don't
// double-prompt. Operators can later opt specific tools into auto-approve.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { AgentSession } from './session';
import { approvalBus } from '../bus/approval-bus';

// Tools that mutate the filesystem, run shell, or hit the network. The MCP
// `ask_human` tool (mcp__human__ask_human) is intentionally NOT here — it has
// its own human round-trip and must not be gated by a permission prompt.
const RISKY_TOOLS = new Set<string>([
  'Bash',
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
]);

export function requiresApproval(toolName: string): boolean {
  if (RISKY_TOOLS.has(toolName)) return true;
  // Any MCP network/proxy tool that smells like an outbound call.
  if (/(^|__)(fetch|curl|http|request|post|put|delete)(__|$)/i.test(toolName)) return true;
  return false;
}

export function makeCanUseTool(session: AgentSession): CanUseTool {
  return async (toolName, input, options): Promise<PermissionResult> => {
    if (!requiresApproval(toolName)) {
      return { behavior: 'allow', updatedInput: input };
    }

    session.setState('awaiting_approval');
    const decision = await approvalBus.request({
      id: randomUUID(),
      session_id: session.id,
      agent_name: session.descriptor.name,
      kind: 'permission',
      tool_name: toolName,
      tool_input: input,
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
