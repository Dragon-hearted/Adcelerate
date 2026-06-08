// ─────────────────────────────────────────────────────────────────────────────
// SessionRegistry — named multi-agent lifecycle + the SessionEngine the REST
// routes call. Each named agent is an independent AgentSession (own query loop,
// state machine, and isolated token totals). Roles seed a system-prompt persona.
// Agent-to-agent communication is MEDIATED by the orchestrator: one agent's
// hand-off is modeled as a `cc.agent.message` event and delivered as a prompt
// turn into the recipient's queue (no direct agent-to-agent channel).
//
// The approval engine (#4) injects its canUseTool / ask_human factories via
// `setAgentHooks` so every new session is gated.
// ─────────────────────────────────────────────────────────────────────────────

import type { CanUseTool, McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import type { AgentDescriptor, AgentRole } from '@command-center/shared';
import { config } from '../config';
import { eventBus } from '../bus/event-bus';
import { setSessionEngine, type SessionEngine } from '../routes/sessions';
import { setGatewayHandlers } from '../ws/gateway';
import { AgentSession, type QueryFn } from './session';
import { isTerminal } from './state-machine';

/** Role personas appended to the Claude Code system prompt (Phase 7 presets). */
export const ROLE_PRESETS: Record<AgentRole, string> = {
  architect:
    'You are the Architect. Focus on system design, interfaces, and trade-offs. Produce clear plans and delegate implementation rather than writing large amounts of code yourself.',
  backend:
    'You are the Backend engineer. Implement server-side logic, data models, and APIs with attention to correctness, error handling, and tests.',
  frontend:
    'You are the Frontend engineer. Implement UI and client logic with attention to UX, accessibility, and component structure.',
  qa: 'You are QA. Find bugs, write and run tests, and verify behavior against acceptance criteria. Be adversarial and precise.',
  reviewer:
    'You are the Reviewer. Critically review changes for correctness, security, and simplicity. Prefer concrete, actionable feedback.',
  generalist: 'You are a generalist software engineer. Handle whatever the task requires end to end.',
};

/** Injected by the approval engine (#4). `queryFn` is a test/override seam. */
export interface AgentHooks {
  makeCanUseTool?: (session: AgentSession) => CanUseTool;
  makeMcpServers?: (session: AgentSession) => Record<string, McpServerConfig>;
  queryFn?: QueryFn;
}

function httpError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export class SessionRegistry implements SessionEngine {
  private readonly byId = new Map<string, AgentSession>();
  private readonly byName = new Map<string, AgentSession>();
  private hooks: AgentHooks = {};

  /** Approval engine (#4) calls this once at boot to gate all future sessions. */
  setAgentHooks(hooks: AgentHooks): void {
    this.hooks = hooks;
  }

  async create(input: {
    name: string;
    role: AgentRole;
    model?: string;
    cwd?: string;
  }): Promise<AgentDescriptor> {
    // Reject duplicate names while a session of that name is still active.
    const existing = this.byName.get(input.name);
    if (existing && !isTerminal(existing.state)) {
      throw httpError(`An active agent named "${input.name}" already exists`, 409);
    }

    const role: AgentRole = input.role;
    const session = new AgentSession(
      {
        name: input.name,
        role,
        model: input.model ?? config.DEFAULT_MODEL,
        cwd: input.cwd ?? config.REPO_ROOT,
        systemPromptAppend: ROLE_PRESETS[role] ?? ROLE_PRESETS.generalist,
      },
      {
        makeCanUseTool: this.hooks.makeCanUseTool,
        makeMcpServers: this.hooks.makeMcpServers,
        queryFn: this.hooks.queryFn,
      },
    );
    this.byId.set(session.id, session);
    this.byName.set(session.descriptor.name, session);
    return session.start();
  }

  prompt(sessionId: string, text: string): void {
    this.require(sessionId).prompt(text);
  }

  async stop(sessionId: string): Promise<void> {
    await this.require(sessionId).stop();
  }

  /**
   * Mediated agent-to-agent message: emit a `cc.agent.message` event and deliver
   * the content as a prompt turn into the recipient's input queue.
   */
  sendAgentMessage(fromSessionId: string, toName: string, content: string): void {
    const from = this.byId.get(fromSessionId);
    const to = this.byName.get(toName);
    if (!to || isTerminal(to.state)) {
      throw httpError(`No active agent named "${toName}"`, 404);
    }
    const fromName = from?.descriptor.name ?? fromSessionId;
    eventBus.emit({
      session_id: to.id,
      agent_name: to.descriptor.name,
      hook_event_type: 'cc.agent.message',
      summary: `message from ${fromName}`,
      payload: { from_session: fromSessionId, from_name: fromName, to_name: toName, content },
    });
    to.prompt(`[Message from agent "${fromName}"]: ${content}`);
  }

  get(sessionId: string): AgentSession | undefined {
    return this.byId.get(sessionId);
  }

  getByName(name: string): AgentSession | undefined {
    return this.byName.get(name);
  }

  /** All sessions this process owns (active + terminated, newest descriptors). */
  list(): AgentDescriptor[] {
    return [...this.byId.values()].map((s) => ({ ...s.descriptor }));
  }

  /** Count of agents not in a terminal state — concurrent swim-lanes. */
  activeCount(): number {
    let n = 0;
    for (const s of this.byId.values()) if (!isTerminal(s.state)) n++;
    return n;
  }

  private require(sessionId: string): AgentSession {
    const session = this.byId.get(sessionId);
    if (!session) throw httpError(`Session not found: ${sessionId}`, 404);
    return session;
  }
}

// Singleton registry for the process.
export const sessionRegistry = new SessionRegistry();

/**
 * Wire the registry into the REST routes (SessionEngine) and the WS gateway
 * (low-latency `session:prompt` path). Called once from server.ts after the
 * gateway is registered.
 */
export function wireAgentEngine(): void {
  setSessionEngine(sessionRegistry);
  setGatewayHandlers({
    onPrompt: (sessionId, text) => {
      try {
        sessionRegistry.prompt(sessionId, text);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ws] session:prompt failed:', err);
      }
    },
  });
}
