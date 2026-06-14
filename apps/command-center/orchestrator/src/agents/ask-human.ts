// ─────────────────────────────────────────────────────────────────────────────
// ask_human — a custom in-process MCP tool (createSdkMcpServer + tool). When
// Claude calls it mid-turn, the tool parks on the ApprovalBus (kind 'question'
// or 'choice'), surfaces a QuestionCard in the UI, and returns the operator's
// typed/selected answer AS THE TOOL RESULT — which flows straight back into the
// agent's turn. The session sits in `awaiting_input` while it waits.
//
// Exposed under the server key `human`, so Claude sees `mcp__human__ask_human`.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createSdkMcpServer,
  tool,
  type McpServerConfig,
} from '@anthropic-ai/claude-agent-sdk';
import type { AgentSession } from './session';
import { approvalBus } from '../bus/approval-bus';

export function makeMcpServers(session: AgentSession): Record<string, McpServerConfig> {
  const askHuman = tool(
    'ask_human',
    'Ask the human operator a question and wait for their answer. Use when you need a decision, clarification, or information that only the operator can provide. Returns the operator\'s answer as text.',
    {
      question: z.string().describe('The question to put to the operator.'),
      choices: z
        .array(z.string())
        .optional()
        .describe('Optional list of choices to present as buttons.'),
    },
    async (args) => {
      const hasChoices = Array.isArray(args.choices) && args.choices.length > 0;
      session.setState('awaiting_input');
      const decision = await approvalBus.request({
        id: randomUUID(),
        session_id: session.id,
        agent_name: session.descriptor.name,
        kind: hasChoices ? 'choice' : 'question',
        question: args.question,
        choices: hasChoices ? args.choices : undefined,
        createdAt: Date.now(),
        status: 'pending',
      });
      session.setState('running');

      const answer = decision.answer ?? '';
      return { content: [{ type: 'text', text: answer }] };
    },
  );

  const server = createSdkMcpServer({
    name: 'human',
    version: '1.0.0',
    tools: [askHuman],
  });

  return { human: server };
}
